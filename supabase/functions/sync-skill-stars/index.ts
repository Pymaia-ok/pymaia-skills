import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { batchSize = 80 } = await req.json().catch(() => ({}));

    const { data: pending, error: fetchErr } = await supabase
      .from("skills")
      .select("id, github_url")
      .eq("status", "approved")
      .not("github_url", "is", null)
      .neq("github_url", "")
      .order("updated_at", { ascending: true })
      .limit(batchSize);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "pymaia-skills-bot",
    };
    if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

    let updated = 0;
    for (const skill of pending) {
      try {
        const match = skill.github_url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
        if (!match) continue;
        const repo = match[1].replace(/\.git$/, "");

        const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
        if (!res.ok) {
          if (res.status === 403 || res.status === 429) break;
          continue;
        }

        const data = await res.json();
        const stars = data.stargazers_count ?? 0;
        const lastCommit = data.pushed_at ?? null;

        const updateData: Record<string, any> = {
          github_stars: stars,
          updated_at: new Date().toISOString(),
        };
        if (lastCommit) updateData.last_commit_at = lastCommit;

        const { error } = await supabase
          .from("skills")
          .update(updateData)
          .eq("id", skill.id);

        if (!error) updated++;
      } catch {
        continue;
      }
    }

    return new Response(
      JSON.stringify({ updated, processed: pending.length }),
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
