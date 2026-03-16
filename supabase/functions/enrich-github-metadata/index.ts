// enrich-github-metadata — paginated set-difference approach
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractRepoFullName(url: string): string | null {
  const m = url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
  if (!m) return null;
  return m[1].replace(/\.git$/, "");
}

// Paginated fetch of all github_urls from a table
async function getAllRepoNames(supabase: any, table: string, statusField: string): Promise<Set<string>> {
  const repos = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("github_url")
      .not("github_url", "is", null)
      .eq(statusField, "approved")
      .range(offset, offset + pageSize - 1);

    if (error) { console.error(`Error fetching ${table}:`, error.message); break; }
    if (!data || data.length === 0) break;

    for (const item of data) {
      const repo = extractRepoFullName(item.github_url);
      if (repo) repos.add(repo);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return repos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { batchSize = 400 } = await req.json().catch(() => ({}));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

    // Log start
    const { data: syncLog } = await supabase
      .from("sync_log")
      .insert({ source: "enrich-github-metadata", status: "running" })
      .select("id")
      .single();
    const syncId = syncLog?.id;

    // Collect unique repo URLs from skills, mcp_servers, plugins — paginated
    const [skillRepos, connectorRepos, pluginRepos] = await Promise.all([
      getAllRepoNames(supabase, "skills", "status"),
      getAllRepoNames(supabase, "mcp_servers", "status"),
      getAllRepoNames(supabase, "plugins", "status"),
    ]);

    const repoSet = new Set<string>();
    for (const r of skillRepos) repoSet.add(r);
    for (const r of connectorRepos) repoSet.add(r);
    for (const r of pluginRepos) repoSet.add(r);

    console.log(`Total unique repos: ${repoSet.size}`);

    // Get existing metadata repos — set difference
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const existingFresh = new Set<string>();
    let offset = 0;
    while (true) {
      const { data } = await supabase
        .from("github_metadata")
        .select("repo_full_name")
        .gte("fetched_at", sevenDaysAgo)
        .range(offset, offset + 999);
      if (!data || data.length === 0) break;
      for (const e of data) existingFresh.add(e.repo_full_name);
      if (data.length < 1000) break;
      offset += 1000;
    }

    // Set difference: repos that need fetching
    const toFetch = [...repoSet].filter(repo => !existingFresh.has(repo)).slice(0, batchSize);

    console.log(`Repos to fetch: ${toFetch.length} (fresh: ${existingFresh.size})`);

    let processed = 0, errors = 0, rateLimited = false;
    const MAX_RUNTIME_MS = 50_000; // 50s guard — leave 10s for cleanup
    const startTime = Date.now();

    for (const repo of toFetch) {
      if (rateLimited) break;
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`MAX_RUNTIME reached at ${processed} repos (${Date.now() - startTime}ms)`);
        break;
      }

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

        if (!resp.ok) {
          await resp.text().catch(() => {}); // consume body
          errors++;
          continue;
        }

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

        // Pause every 50 requests
        if (processed % 50 === 0) await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`Error fetching ${repo}:`, e instanceof Error ? e.message : e);
        errors++;
      }
    }

    // Cross-validate: update skills stars from github_metadata
    const { data: meta } = await supabase.from("github_metadata").select("repo_full_name, stars").eq("fetch_status", "success");
    if (meta && meta.length > 0) {
      const starMap = new Map(meta.map((m: any) => [m.repo_full_name, m.stars]));
      
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

    // Update sync_log
    if (syncId) {
      await supabase.from("sync_log").update({
        status: rateLimited ? "rate_limited" : (errors > processed ? "failed" : "completed"),
        completed_at: new Date().toISOString(),
        new_count: processed,
        error_count: errors,
      }).eq("id", syncId);
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
