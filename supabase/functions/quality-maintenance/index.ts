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

    const { batchSize = 50 } = await req.json().catch(() => ({}));
    const results = { demoted: 0, rejected: 0, cleaned: 0, stale_flagged: 0 };

    // ── 1. Auto-reject flagged approved skills (archived/disabled/404) ──
    const { data: flagged } = await supabase
      .from("skills")
      .select("id, slug, security_notes")
      .eq("status", "approved")
      .eq("security_status", "flagged")
      .limit(batchSize);

    if (flagged) {
      for (const skill of flagged) {
        const notes = (skill.security_notes || "").toLowerCase();
        if (notes.includes("not found") || notes.includes("archived") || notes.includes("disabled")) {
          await supabase.from("skills").update({
            status: "rejected",
            auto_approved_reason: `quality-maintenance: ${skill.security_notes}`,
          }).eq("id", skill.id);

          await supabase.from("automation_logs").insert({
            skill_id: skill.id,
            action_type: "quality_reject",
            function_name: "quality-maintenance",
            reason: `Flagged repo: ${skill.security_notes}`,
          });

          results.rejected++;
        }
      }
    }

    // ── 2. Demote inactive skills (no commits in 24+ months, 0 installs, 0 stars) ──
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 24);

    const { data: inactive } = await supabase
      .from("skills")
      .select("id, slug, last_commit_at")
      .eq("status", "approved")
      .eq("install_count", 0)
      .eq("github_stars", 0)
      .not("last_commit_at", "is", null)
      .lt("last_commit_at", cutoff.toISOString())
      .limit(batchSize);

    if (inactive) {
      for (const skill of inactive) {
        await supabase.from("skills").update({
          status: "pending",
          auto_approved_reason: "quality-maintenance: inactive 24+ months, 0 usage",
        }).eq("id", skill.id);

        await supabase.from("automation_logs").insert({
          skill_id: skill.id,
          action_type: "quality_demote",
          function_name: "quality-maintenance",
          reason: `Inactive since ${skill.last_commit_at}, 0 installs, 0 stars`,
        });

        results.demoted++;
      }
    }

    // ── 3. Clean up bad/auto-generated descriptions ──
    const { data: residues } = await supabase
      .from("skills")
      .select("id, slug, description_human")
      .eq("status", "approved")
      .limit(batchSize);

    if (residues) {
      const autoGenPattern = /^[\w\s-]+ skill from [\w/-]+$/i;
      for (const skill of residues) {
        const desc = (skill.description_human || "").trim();
        if (desc.length < 5 || /^[|>!\-\s]{1,5}$/.test(desc) || (desc.length < 50 && autoGenPattern.test(desc))) {
          await supabase.from("skills").update({ status: "pending" }).eq("id", skill.id);

          await supabase.from("automation_logs").insert({
            skill_id: skill.id,
            action_type: "quality_cleanup",
            function_name: "quality-maintenance",
            reason: `Bad description: "${desc.slice(0, 50)}"`,
          });

          results.cleaned++;
        }
      }
    }

    // ── 4. Decay Detection: Flag stale items (>90 days no commit) ──
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - 90);

    const tables = ["skills", "mcp_servers", "plugins"] as const;
    for (const tableName of tables) {
      // Mark as stale
      const { data: staleItems } = await supabase
        .from(tableName)
        .select("id, slug")
        .eq("status", "approved")
        .eq("is_stale", false)
        .not("last_commit_at", "is", null)
        .lt("last_commit_at", staleCutoff.toISOString())
        .limit(batchSize);

      if (staleItems) {
        for (const item of staleItems) {
          await supabase.from(tableName).update({ is_stale: true }).eq("id", item.id);
          results.stale_flagged++;
        }
      }

      // Un-mark recently active items
      await supabase
        .from(tableName)
        .update({ is_stale: false })
        .eq("is_stale", true)
        .gte("last_commit_at", staleCutoff.toISOString());
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quality-maintenance error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
