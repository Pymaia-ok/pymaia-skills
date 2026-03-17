import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Trusted GitHub orgs/users whose skills get auto-approved
const TRUSTED_SOURCES = [
  "anthropics", "anthropic", "vercel", "microsoft", "google", "aws",
  "openai", "langchain-ai", "supabase", "stripe", "modelcontextprotocol",
  "cloudflare", "docker", "hashicorp", "grafana", "elastic",
  "mongodb", "prisma", "drizzle-team", "trpc",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { batchSize = 100 } = await req.json().catch(() => ({}));

    // Fetch pending skills
    const { data: pending, error } = await supabase
      .from("skills")
      .select("id, slug, display_name, github_url, github_stars, security_status, security_notes, last_commit_at, description_human, creator_id, security_scan_result")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (error || !pending) {
      return new Response(JSON.stringify({ error: error?.message || "no data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let approved = 0;
    let rejected = 0;
    let skipped = 0;

    for (const skill of pending) {
      const reasons: string[] = [];
      let shouldReject = false;
      let rejectReason = "";

      // Extract GitHub org/user
      const ghMatch = skill.github_url?.match(/github\.com\/([^\/]+)\//);
      const ghOrg = ghMatch?.[1]?.toLowerCase();

      // ── AUTO-REJECT rules ──
      if (skill.security_status === "flagged") {
        const notes = (skill.security_notes || "").toLowerCase();
        if (notes.includes("archived") || notes.includes("not found") || notes.includes("disabled")) {
          shouldReject = true;
          rejectReason = `Flagged: ${skill.security_notes}`;
        }
      }

      // Check for extremely short/empty descriptions (parsing residue)
      const desc = (skill.description_human || "").trim();
      if (desc.length < 10) {
        shouldReject = true;
        rejectReason = "Description too short or missing";
      }

      if (shouldReject) {
        await supabase.from("skills").update({
          status: "rejected",
          auto_approved_reason: `auto-rejected: ${rejectReason}`,
        }).eq("id", skill.id);

        await supabase.from("automation_logs").insert({
          skill_id: skill.id,
          action_type: "auto_reject",
          function_name: "auto-approve-skills",
          reason: rejectReason,
          metadata: { slug: skill.slug, security_status: skill.security_status },
        });

        rejected++;
        continue;
      }

      // ── AUTO-APPROVE rules ──

      // Require security scan before auto-approving
      if (!skill.security_scan_result) {
        skipped++;
        continue;
      }

      // Rule 1: Trusted source
      if (ghOrg && TRUSTED_SOURCES.includes(ghOrg)) {
        reasons.push(`trusted_source:${ghOrg}`);
      }

      // Rule 2: Security verified
      if (skill.security_status === "verified") {
        reasons.push("security_verified");
      }

      // Rule 3: GitHub stars > 5
      if (skill.github_stars > 5) {
        reasons.push(`github_stars:${skill.github_stars}`);
      }

      // Rule 4: Has GitHub URL (imported from known registry)
      if (skill.github_url) {
        reasons.push("has_github_url");
      }

      // Rule 5: Created by platform user (SkillForge)
      if (skill.creator_id) {
        reasons.push("platform_created");
      }

      // Approve if at least 1 strong signal OR 2+ weak signals
      const strongSignals = reasons.filter(r =>
        r.startsWith("trusted_source") || r === "security_verified" || r.startsWith("github_stars")
      );
      const shouldApprove = strongSignals.length >= 1 || reasons.length >= 2;

      if (shouldApprove) {
        await supabase.from("skills").update({
          status: "approved",
          auto_approved_reason: reasons.join(", "),
        }).eq("id", skill.id);

        await supabase.from("automation_logs").insert({
          skill_id: skill.id,
          action_type: "auto_approve",
          function_name: "auto-approve-skills",
          reason: reasons.join(", "),
          metadata: { slug: skill.slug, stars: skill.github_stars, security: skill.security_status },
        });

        approved++;
      } else {
        skipped++;
      }
    }

    return new Response(JSON.stringify({
      processed: pending.length, approved, rejected, skipped,
      remaining: pending.length === batchSize ? "more" : 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-approve error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
