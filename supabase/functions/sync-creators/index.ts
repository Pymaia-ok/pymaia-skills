// sync-creators — Populate and enrich creator profiles from GitHub data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

const VERIFIED_ORGS = new Set([
  "anthropics", "vercel", "vercel-labs", "microsoft", "google", "meta",
  "openai", "supabase", "stripe", "cloudflare", "aws", "hashicorp",
  "docker", "github", "gitlab", "mozilla", "apple", "shopify",
  "twilio", "datadog", "elastic", "grafana", "jetbrains", "atlassian",
  "remotion-dev", "browser-use", "modelcontextprotocol",
]);

function extractOwner(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^\/]+)/);
  return m ? m[1].toLowerCase() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { mode = "full", batchSize = 50 } = await req.json().catch(() => ({}));

    if (mode === "populate" || mode === "full") {
      await populateCreators(supabase);
    }
    if (mode === "enrich" || mode === "full") {
      await enrichCreators(supabase, githubToken, batchSize);
    }
    if (mode === "stats" || mode === "full") {
      await recomputeStats(supabase);
    }

    const { count } = await supabase.from("creators").select("*", { count: "exact", head: true });

    return new Response(JSON.stringify({ success: true, totalCreators: count, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-creators error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function populateCreators(supabase: any) {
  console.log("[creators] Populating from catalog data...");

  // Count skills per GitHub owner
  const ownerCounts = new Map<string, { skills: number; connectors: number; plugins: number }>();

  // Skills
  const { data: skills } = await supabase
    .from("skills").select("github_url").eq("status", "approved").not("github_url", "is", null).limit(50000);
  for (const s of skills || []) {
    const owner = extractOwner(s.github_url);
    if (!owner) continue;
    const c = ownerCounts.get(owner) || { skills: 0, connectors: 0, plugins: 0 };
    c.skills++;
    ownerCounts.set(owner, c);
  }

  // Connectors
  const { data: connectors } = await supabase
    .from("mcp_servers").select("github_url").eq("status", "approved").not("github_url", "is", null).limit(10000);
  for (const s of connectors || []) {
    const owner = extractOwner(s.github_url);
    if (!owner) continue;
    const c = ownerCounts.get(owner) || { skills: 0, connectors: 0, plugins: 0 };
    c.connectors++;
    ownerCounts.set(owner, c);
  }

  // Plugins
  const { data: plugins } = await supabase
    .from("plugins").select("github_url").eq("status", "approved").not("github_url", "is", null).limit(5000);
  for (const s of plugins || []) {
    const owner = extractOwner(s.github_url);
    if (!owner) continue;
    const c = ownerCounts.get(owner) || { skills: 0, connectors: 0, plugins: 0 };
    c.plugins++;
    ownerCounts.set(owner, c);
  }

  // Filter: only creators with 2+ items
  const creatorsToInsert = [];
  for (const [username, counts] of ownerCounts) {
    const total = counts.skills + counts.connectors + counts.plugins;
    if (total < 2) continue;
    creatorsToInsert.push({
      github_username: username,
      skill_count: counts.skills,
      connector_count: counts.connectors,
      plugin_count: counts.plugins,
      verified: VERIFIED_ORGS.has(username),
    });
  }

  // Upsert in batches
  for (let i = 0; i < creatorsToInsert.length; i += 200) {
    const batch = creatorsToInsert.slice(i, i + 200);
    await supabase.from("creators").upsert(batch, {
      onConflict: "github_username",
      ignoreDuplicates: false,
    });
  }

  console.log(`[creators] Populated ${creatorsToInsert.length} creators`);
}

async function enrichCreators(supabase: any, githubToken: string | undefined, batchSize: number) {
  console.log("[creators] Enriching via GitHub API...");

  const { data: creators } = await supabase
    .from("creators")
    .select("id, github_username")
    .is("fetched_at", null)
    .order("skill_count", { ascending: false })
    .limit(batchSize);

  if (!creators || creators.length === 0) return;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pymaia-skills-bot",
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  let enriched = 0;
  for (const creator of creators) {
    try {
      const res = await fetch(`https://api.github.com/users/${creator.github_username}`, { headers });
      if (res.status === 403 || res.status === 429) break;
      if (!res.ok) {
        await supabase.from("creators").update({ fetched_at: new Date().toISOString() }).eq("id", creator.id);
        continue;
      }

      const data = await res.json();
      await supabase.from("creators").update({
        display_name: data.name || data.login,
        avatar_url: data.avatar_url,
        bio: data.bio ? data.bio.slice(0, 500) : null,
        website: data.blog || null,
        company: data.company || null,
        github_followers: data.followers || 0,
        is_organization: data.type === "Organization",
        fetched_at: new Date().toISOString(),
      }).eq("id", creator.id);

      enriched++;
    } catch { continue; }
  }

  console.log(`[creators] Enriched ${enriched}/${creators.length}`);
}

async function recomputeStats(supabase: any) {
  console.log("[creators] Recomputing aggregate stats...");

  const { data: creators } = await supabase
    .from("creators").select("id, github_username").limit(5000);

  if (!creators || creators.length === 0) return;

  for (const creator of creators) {
    const ghPattern = `%github.com/${creator.github_username}/%`;

    // Get skill stats
    const { data: skillStats } = await supabase
      .from("skills")
      .select("install_count, avg_rating, trust_score, category")
      .eq("status", "approved")
      .ilike("github_url", ghPattern);

    const skills = skillStats || [];
    const skillCount = skills.length;
    const totalInstalls = skills.reduce((s: number, sk: any) => s + (sk.install_count || 0), 0);
    const avgRating = skills.length > 0 ? skills.reduce((s: number, sk: any) => s + (sk.avg_rating || 0), 0) / skills.length : 0;
    const avgTrust = skills.length > 0 ? skills.reduce((s: number, sk: any) => s + (sk.trust_score || 0), 0) / skills.length : 0;

    // Top category
    const catCounts = new Map<string, number>();
    for (const sk of skills) {
      catCounts.set(sk.category, (catCounts.get(sk.category) || 0) + 1);
    }
    let topCategory: string | null = null;
    let topCatCount = 0;
    for (const [cat, count] of catCounts) {
      if (count > topCatCount) { topCategory = cat; topCatCount = count; }
    }

    // Connector + plugin counts
    const { count: connCount } = await supabase
      .from("mcp_servers").select("*", { count: "exact", head: true })
      .eq("status", "approved").ilike("github_url", ghPattern);

    const { count: plugCount } = await supabase
      .from("plugins").select("*", { count: "exact", head: true })
      .eq("status", "approved").ilike("github_url", ghPattern);

    await supabase.from("creators").update({
      skill_count: skillCount,
      connector_count: connCount || 0,
      plugin_count: plugCount || 0,
      total_installs: totalInstalls,
      avg_rating: Math.round(avgRating * 10) / 10,
      avg_trust_score: Math.round(avgTrust * 10) / 10,
      top_category: topCategory,
    }).eq("id", creator.id);
  }

  console.log(`[creators] Stats recomputed for ${creators.length} creators`);
}
