// calculate-trust-score v3.0 — Computes Trust Score (0-100) + Quality Score (0-100)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRUSTED_PUBLISHERS = [
  "anthropics", "anthropic", "vercel", "microsoft", "google", "aws",
  "openai", "langchain-ai", "supabase", "stripe", "modelcontextprotocol",
  "cloudflare", "docker", "hashicorp", "grafana", "elastic",
  "mongodb", "prisma", "drizzle-team", "trpc",
];

async function calculateTrustScore(item: any, abuseCount: number): Promise<{
  total: number;
  security: number;
  publisher: number;
  community: number;
  longevity: number;
  badge: string;
}> {
  let security = 0;
  let publisher = 0;
  let community = 0;
  let longevity = 0;

  // ── SECURITY SCORE (0-40) ──
  const scanResult = item.security_scan_result as any;
  
  if (item.security_status === "verified") {
    security += 15;
  } else if (item.security_status === "unverified") {
    security += 5;
  }

  if (scanResult) {
    if (scanResult.verdict === "SAFE") {
      security += 15;
    } else if (scanResult.verdict === "SUSPICIOUS") {
      security += 5;
    }

    if (scanResult.layers?.secrets?.count === 0) {
      security += 5;
    }
    if (scanResult.layers?.injection?.count === 0) {
      security += 5;
    }

    const vt = scanResult.layers?.virustotal;
    if (vt && vt.verdict) {
      if (vt.verdict === "clean" && vt.malicious_count === 0) {
        security += 5;
      } else if (vt.verdict === "malicious" || (vt.malicious_count && vt.malicious_count >= 4)) {
        security -= 15;
      }
    }
  } else {
    if (item.security_status === "verified") security += 5;
  }

  // ── PUBLISHER SCORE (0-25) ──
  const ghMatch = (item.github_url || "").match(/github\.com\/([^\/]+)\//);
  const ghOrg = ghMatch?.[1]?.toLowerCase();

  if (ghOrg && TRUSTED_PUBLISHERS.includes(ghOrg)) {
    publisher += 10;
  }

  const pubData = scanResult?.layers?.publisher;
  if (pubData?.account_age_days != null && pubData.account_age_days >= 365) {
    publisher += 5;
  }
  if (pubData?.public_repos != null && pubData.public_repos >= 5) {
    publisher += 3;
  }

  if (item.is_official) {
    publisher += 7;
  } else if (item.source === "curated") {
    publisher += 5;
  } else if (item.creator_id) {
    publisher += 2;
  }

  // ── COMMUNITY SCORE (0-20) ──
  const installs = item.install_count || 0;
  const stars = item.github_stars || 0;
  const rating = Number(item.avg_rating || 0);
  const reviews = item.review_count || 0;

  if (installs > 500 || stars > 500) community += 5;
  else if (installs > 100 || stars > 100) community += 3;
  
  if (installs > 100 || stars > 100) community += 5;
  
  if (rating >= 4.0 && reviews >= 3) community += 5;
  else if (rating >= 3.5 && reviews >= 1) community += 2;

  if (abuseCount === 0) {
    community += 5;
  } else if (abuseCount <= 2) {
    community += 2;
  }

  // ── LONGEVITY SCORE (0-15) ──
  const createdAt = new Date(item.created_at);
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays > 90) longevity += 5;
  else if (ageDays > 30) longevity += 3;

  if (ageDays > 30) longevity += 5;

  if (item.last_commit_at) {
    const lastCommit = new Date(item.last_commit_at);
    const commitAge = (Date.now() - lastCommit.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (commitAge <= 6) longevity += 5;
    else if (commitAge <= 12) longevity += 2;
  }

  const total = Math.min(100, security + publisher + community + longevity);

  let badge = "new";
  if (total >= 90) badge = "official";
  else if (total >= 80) badge = "verified";
  else if (total >= 60) badge = "trusted";
  else if (total >= 40) badge = "reviewed";

  return { total, security, publisher, community, longevity, badge };
}

// ── COMPOSITE QUALITY SCORE (Sprint 2 - Block 2) ──
function calculateQualityScore(item: any, trustScore: number, evalData: any): number {
  // Trust (25%)
  const trustComponent = (trustScore / 100) * 25;

  // Eval Pass Rate (25%) — from skill_eval_runs
  let evalComponent = 0;
  if (evalData) {
    evalComponent = (Number(evalData.pass_rate) / 100) * 25;
  } else {
    evalComponent = 12.5; // Neutral if no evals
  }

  // User Satisfaction (20%) — avg_rating normalized to 0-20
  const rating = Number(item.avg_rating || 0);
  const reviews = item.review_count || 0;
  let satisfactionComponent = 10; // Default neutral
  if (reviews >= 1) {
    satisfactionComponent = (rating / 5) * 20;
  }

  // Documentation (15%) — has description, use_cases, github_url
  let docComponent = 0;
  if (item.description_human || item.description) docComponent += 5;
  if (item.github_url) docComponent += 5;
  if (item.use_cases && Array.isArray(item.use_cases) && item.use_cases.length > 0) docComponent += 5;
  else if (item.readme_summary) docComponent += 3;

  // Freshness (15%) — last_commit_at recency
  let freshnessComponent = 0;
  if (item.last_commit_at) {
    const monthsAgo = (Date.now() - new Date(item.last_commit_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 1) freshnessComponent = 15;
    else if (monthsAgo <= 3) freshnessComponent = 12;
    else if (monthsAgo <= 6) freshnessComponent = 8;
    else if (monthsAgo <= 12) freshnessComponent = 4;
  } else {
    freshnessComponent = 5; // Unknown = neutral
  }

  return Math.min(100, Math.round(trustComponent + evalComponent + satisfactionComponent + docComponent + freshnessComponent));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { batch_size = 50, table = "all" } = await req.json().catch(() => ({}));

    let processed = 0;
    const tables: Array<{ name: string; type: string }> = [];
    
    if (table === "all" || table === "skills") tables.push({ name: "skills", type: "skill" });
    if (table === "all" || table === "mcp_servers") tables.push({ name: "mcp_servers", type: "connector" });
    if (table === "all" || table === "plugins") tables.push({ name: "plugins", type: "plugin" });

    for (const t of tables) {
      const { data: items } = await supabase
        .from(t.name)
        .select("*")
        .eq("status", "approved")
        .order("updated_at", { ascending: true })
        .limit(batch_size);

      if (!items || items.length === 0) continue;

      // ── BATCH: fetch all abuse counts in one query ──
      const itemIds = items.map(i => i.id);
      const { data: abuseRows } = await supabase
        .from("security_reports")
        .select("item_id")
        .in("item_id", itemIds)
        .eq("status", "open");

      const abuseCounts: Record<string, number> = {};
      for (const row of abuseRows ?? []) {
        abuseCounts[row.item_id] = (abuseCounts[row.item_id] || 0) + 1;
      }

      // ── BATCH: fetch all eval runs for skills in one query ──
      let evalMap: Record<string, { pass_rate: number; avg_score: number }> = {};
      if (t.name === "skills") {
        const slugs = items.map(i => i.slug).filter(Boolean);
        if (slugs.length > 0) {
          const { data: evalRows } = await supabase
            .from("skill_eval_runs")
            .select("skill_slug, pass_rate, avg_score, iteration")
            .in("skill_slug", slugs)
            .order("iteration", { ascending: false });

          // Keep only the latest eval per slug
          for (const row of evalRows ?? []) {
            if (row.skill_slug && !evalMap[row.skill_slug]) {
              evalMap[row.skill_slug] = { pass_rate: row.pass_rate, avg_score: row.avg_score };
            }
          }
        }
      }

      for (const item of items) {
        const abuseCount = abuseCounts[item.id] || 0;
        const score = await calculateTrustScore(item, abuseCount);
        
        const updateData: any = { trust_score: score.total };
        
        if (t.name === "skills") {
          const evalRun = evalMap[item.slug] || null;
          updateData.quality_score = calculateQualityScore(item, score.total, evalRun);
        }

        const { error: updateError } = await supabase.from(t.name).update(updateData).eq("id", item.id);
        if (updateError) {
          console.error(`[calculate-trust-score] Update failed for ${item.id}:`, updateError.message);
          continue;
        }
        processed++;
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calculate-trust-score error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
