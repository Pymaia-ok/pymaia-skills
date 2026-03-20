import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractRepo(url: string): string | null {
  const match = url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
  if (!match) return null;
  return match[1].replace(/\.git$/, "").replace(/\/tree\/.*$/, "").replace(/\/blob\/.*$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { batchSize = 200 } = await req.json().catch(() => ({}));

    // Fetch skills prioritizing those with 0 stars first
    const { data: pending, error: fetchErr } = await supabase
      .from("skills")
      .select("id, github_url, github_stars")
      .eq("status", "approved")
      .not("github_url", "is", null)
      .neq("github_url", "")
      .order("github_stars", { ascending: true })
      .order("updated_at", { ascending: true })
      .limit(batchSize);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group skills by unique repo
    const repoMap = new Map<string, string[]>(); // repo -> skill ids
    for (const skill of pending) {
      const repo = extractRepo(skill.github_url);
      if (!repo) continue;
      const base = repo.split("/").slice(0, 2).join("/"); // owner/repo only
      if (!repoMap.has(base)) repoMap.set(base, []);
      repoMap.get(base)!.push(skill.id);
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "pymaia-skills-bot",
    };
    if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

    let updated = 0;
    let reposFetched = 0;
    const maxRepos = 80; // stay within rate limits

    for (const [repo, skillIds] of repoMap) {
      if (reposFetched >= maxRepos) break;

      try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
        reposFetched++;

        if (!res.ok) {
          if (res.status === 403 || res.status === 429) break; // rate limited
          continue;
        }

        const data = await res.json();
        const stars = data.stargazers_count ?? 0;
        const lastCommit = data.pushed_at ?? null;

        const updateData: Record<string, unknown> = {
          github_stars: stars,
          updated_at: new Date().toISOString(),
        };
        if (lastCommit) updateData.last_commit_at = lastCommit;

        // Update ALL skills sharing this repo in one call
        const { error } = await supabase
          .from("skills")
          .update(updateData)
          .in("id", skillIds);

        if (!error) updated += skillIds.length;
      } catch {
        continue;
      }
    }

    return new Response(
      JSON.stringify({ updated, repos_fetched: reposFetched, skills_in_batch: pending.length, unique_repos: repoMap.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Sync skill stars error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
