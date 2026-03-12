// weekly-digest — Sends weekly email with new skills, trending goals, and catalog growth
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { dry_run = false, batch_size = 50 } = await req.json().catch(() => ({}));

    const since = new Date(Date.now() - 7 * 86400000).toISOString();

    // Gather digest data
    const [newSkills, newConnectors, trendingGoals, totalSkills, totalConnectors, totalPlugins] = await Promise.all([
      supabase.from("skills").select("display_name, slug, tagline, category").eq("status", "approved").gte("created_at", since).order("install_count", { ascending: false }).limit(5),
      supabase.from("mcp_servers").select("name, slug, description, category").eq("status", "approved").gte("created_at", since).order("github_stars", { ascending: false }).limit(5),
      supabase.from("recommendation_feedback").select("goal").gte("created_at", since).limit(100),
      supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);

    // Count trending goals
    const goalCounts: Record<string, number> = {};
    for (const f of trendingGoals.data || []) {
      const g = (f.goal || "").toLowerCase().trim();
      if (g) goalCounts[g] = (goalCounts[g] || 0) + 1;
    }
    const topGoals = Object.entries(goalCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

    // Build HTML
    const skillsList = (newSkills.data || []).map(s =>
      `<li><strong>${s.display_name}</strong> [${s.category}] — ${s.tagline}</li>`
    ).join("") || "<li>No new skills this week</li>";

    const connectorsList = (newConnectors.data || []).map(c =>
      `<li><strong>${c.name}</strong> [${c.category}] — ${c.description?.slice(0, 80) || ""}</li>`
    ).join("") || "<li>No new connectors this week</li>";

    const goalsList = topGoals.map(([goal, count]) =>
      `<li>"${goal}" — ${count} requests</li>`
    ).join("") || "<li>No trending goals this week</li>";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:24px;margin:0">📦 Pymaia Skills Weekly</h1>
    <p style="color:#666;font-size:14px">Your weekly digest of new tools and trending goals</p>
  </div>
  
  <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-bottom:20px">
    <h3 style="margin:0 0 8px">📊 Catalog Stats</h3>
    <p style="margin:0;font-size:14px">${(totalSkills.count || 0).toLocaleString()} skills · ${(totalConnectors.count || 0).toLocaleString()} connectors · ${(totalPlugins.count || 0).toLocaleString()} plugins</p>
  </div>

  <div style="margin-bottom:20px">
    <h3>🆕 New Skills</h3>
    <ul style="padding-left:20px;font-size:14px">${skillsList}</ul>
  </div>

  <div style="margin-bottom:20px">
    <h3>🔌 New Connectors</h3>
    <ul style="padding-left:20px;font-size:14px">${connectorsList}</ul>
  </div>

  <div style="margin-bottom:20px">
    <h3>🔥 Trending Goals</h3>
    <ul style="padding-left:20px;font-size:14px">${goalsList}</ul>
  </div>

  <div style="text-align:center;margin-top:24px">
    <a href="https://pymaiaskills.lovable.app/explorar" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Explore Skills →</a>
  </div>

  <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb">
    <p style="font-size:12px;color:#999">Pymaia Skills — AI Solutions for Business</p>
  </div>
</body>
</html>`;

    if (dry_run) {
      return new Response(JSON.stringify({
        dry_run: true,
        new_skills: (newSkills.data || []).length,
        new_connectors: (newConnectors.data || []).length,
        trending_goals: topGoals.length,
        html_preview: html.slice(0, 500),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get leads to email (excluding unsubscribed)
    const { data: suppressed } = await supabase.from("suppressed_emails").select("email");
    const suppressedSet = new Set((suppressed || []).map(s => s.email));

    const { data: leads } = await supabase.from("leads").select("email").limit(batch_size);
    const recipients = (leads || []).map(l => l.email).filter(e => !suppressedSet.has(e));

    let sent = 0;
    for (const email of recipients) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            to: email,
            subject: `📦 Pymaia Weekly: ${(newSkills.data || []).length} new skills this week`,
            html,
          }),
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${email}:`, e);
      }
    }

    await supabase.from("automation_logs").insert({
      action_type: "weekly_digest_sent",
      function_name: "weekly-digest",
      reason: `Sent to ${sent}/${recipients.length} recipients. ${(newSkills.data || []).length} new skills, ${topGoals.length} trending goals.`,
    });

    return new Response(JSON.stringify({ sent, total_recipients: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-digest error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
