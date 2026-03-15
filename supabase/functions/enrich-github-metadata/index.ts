import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractRepoFullName(url: string): string | null {
  const m = url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
  if (!m) return null;
  return m[1].replace(/\.git$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { batchSize = 400 } = await req.json().catch(() => ({}));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

    // Collect unique repo URLs from skills, mcp_servers, plugins
    const [{ data: skills }, { data: connectors }, { data: plugins }] = await Promise.all([
      supabase.from("skills").select("github_url").not("github_url", "is", null).eq("status", "approved").limit(1000),
      supabase.from("mcp_servers").select("github_url").not("github_url", "is", null).eq("status", "approved").limit(1000),
      supabase.from("plugins").select("github_url").not("github_url", "is", null).eq("status", "approved").limit(1000),
    ]);

    const repoSet = new Set<string>();
    for (const item of [...(skills || []), ...(connectors || []), ...(plugins || [])]) {
      const repo = extractRepoFullName(item.github_url);
      if (repo) repoSet.add(repo);
    }

    // Filter to repos that need refresh (not fetched or older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: existing } = await supabase
      .from("github_metadata")
      .select("repo_full_name, fetched_at")
      .in("repo_full_name", [...repoSet].slice(0, 1000));

    const existingMap = new Map((existing || []).map(e => [e.repo_full_name, e.fetched_at]));
    const toFetch = [...repoSet].filter(repo => {
      const fetched = existingMap.get(repo);
      return !fetched || fetched < sevenDaysAgo;
    }).slice(0, batchSize);

    let processed = 0, errors = 0, rateLimited = false;

    for (const repo of toFetch) {
      if (rateLimited) break;

      try {
        const resp = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: { Authorization: `token ${githubToken}`, Accept: "application/vnd.github.v3+json" },
        });

        if (resp.status === 404) {
          await supabase.from("github_metadata").upsert({
            repo_full_name: repo, fetch_status: "not_found", fetched_at: new Date().toISOString(),
          }, { onConflict: "repo_full_name" });
          processed++;
          continue;
        }

        if (resp.status === 403 || resp.status === 429) {
          console.log(`Rate limited at ${processed} repos`);
          rateLimited = true;
          break;
        }

        if (!resp.ok) { errors++; continue; }

        const data = await resp.json();
        await supabase.from("github_metadata").upsert({
          repo_full_name: repo,
          stars: data.stargazers_count || 0,
          forks: data.forks_count || 0,
          open_issues: data.open_issues_count || 0,
          license: data.license?.spdx_id || null,
          last_commit_at: data.pushed_at || null,
          last_push_at: data.pushed_at || null,
          topics: data.topics || [],
          description: data.description || null,
          archived: data.archived || false,
          fetched_at: new Date().toISOString(),
          fetch_status: "success",
        }, { onConflict: "repo_full_name" });

        processed++;

        // Pause every 50 requests to stay well under rate limit
        if (processed % 50 === 0) await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`Error fetching ${repo}:`, e);
        errors++;
      }
    }

    // Cross-validate: update skills/connectors/plugins stars from github_metadata
    const { data: meta } = await supabase.from("github_metadata").select("repo_full_name, stars").eq("fetch_status", "success");
    if (meta && meta.length > 0) {
      const starMap = new Map(meta.map(m => [m.repo_full_name, m.stars]));
      
      // Update skills with significantly different star counts
      const { data: skillsToUpdate } = await supabase.from("skills").select("id, github_url, github_stars").not("github_url", "is", null).eq("status", "approved").limit(1000);
      for (const s of skillsToUpdate || []) {
        const repo = extractRepoFullName(s.github_url);
        if (!repo || !starMap.has(repo)) continue;
        const realStars = starMap.get(repo)!;
        const diff = Math.abs(realStars - (s.github_stars || 0));
        if (diff > Math.max(realStars * 0.5, 10)) {
          await supabase.from("skills").update({ github_stars: realStars }).eq("id", s.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed, errors, rateLimited, total: toFetch.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-github-metadata error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
