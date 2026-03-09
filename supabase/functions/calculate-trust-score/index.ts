// calculate-trust-score v2.0 — Computes Trust Score (0-100) with actual abuse report check
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
  } else {
    if (item.security_status === "verified") security += 5;
  }

  // ── PUBLISHER SCORE (0-25) ──
  const ghMatch = (item.github_url || "").match(/github\.com\/([^\/]+)\//);
  const ghOrg = ghMatch?.[1]?.toLowerCase();

  if (ghOrg && TRUSTED_PUBLISHERS.includes(ghOrg)) {
    publisher += 15;
  }

  if (item.is_official) {
    publisher += 10;
  } else if (item.source === "curated") {
    publisher += 7;
  } else if (item.creator_id) {
    publisher += 3;
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

  // Abuse reports check — deduct from default 5pt bonus
  if (abuseCount === 0) {
    community += 5; // No abuse reports
  } else if (abuseCount <= 2) {
    community += 2; // Some reports, partial credit
  }
  // 3+ reports = 0 bonus

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

      if (!items) continue;

      for (const item of items) {
        // Check actual abuse report count
        const { count: abuseCount } = await supabase
          .from("security_reports")
          .select("id", { count: "exact", head: true })
          .eq("item_id", item.id)
          .eq("status", "open");

        const score = await calculateTrustScore(item, abuseCount ?? 0);
        
        await supabase.from(t.name).update({
          trust_score: score.total,
        }).eq("id", item.id);

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
