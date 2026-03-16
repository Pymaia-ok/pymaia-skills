// bulk-fetch-skill-content
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractRepoAndSkill(githubUrl: string, installCommand: string): { owner: string; repo: string; skillName: string | null } | null {
  const m = githubUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/, "");

  const skillMatch = installCommand.match(/--skill\s+(\S+)/);
  if (skillMatch) return { owner, repo, skillName: skillMatch[1] };

  const pathMatch = installCommand.match(/skills\/([^\/\s]+)/);
  if (pathMatch) return { owner, repo, skillName: pathMatch[1] };

  return { owner, repo, skillName: null };
}

async function tryFetchContent(url: string, githubToken?: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = { Accept: "text/plain" };
    if (githubToken) headers.Authorization = `token ${githubToken}`;
    const resp = await fetch(url, { headers });
    
    // Handle rate limiting
    if (resp.status === 403 || resp.status === 429) {
      console.warn(`Rate limited fetching ${url}: ${resp.status}`);
      return "RATE_LIMITED";
    }
    
    if (!resp.ok) return null;
    const text = await resp.text();
    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { batchSize = 50, batch_size, priority } = await req.json().catch(() => ({}));
    const limit = batch_size || batchSize;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const githubToken = Deno.env.get("GITHUB_TOKEN");

    // Log start
    const { data: syncLog } = await supabase
      .from("sync_log")
      .insert({ source: "bulk-fetch-skill-content", status: "running" })
      .select("id")
      .single();
    const syncId = syncLog?.id;

    let query = supabase
      .from("skills")
      .select("id, slug, display_name, github_url, install_command, category, description_human, skill_md_status")
      .eq("skill_md_status", "pending")
      .not("github_url", "is", null)
      .eq("status", "approved");

    if (priority === "high_stars") {
      query = query.order("github_stars", { ascending: false });
    }

    const { data: skills, error } = await query.limit(limit);

    if (error) throw error;
    if (!skills || skills.length === 0) {
      if (syncId) {
        await supabase.from("sync_log").update({
          status: "completed", completed_at: new Date().toISOString(), new_count: 0, error_count: 0,
        }).eq("id", syncId);
      }
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No skills to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fetched = 0, notFound = 0, errors = 0;
    let rateLimited = false;

    for (const skill of skills) {
      if (rateLimited) break;

      try {
        const info = extractRepoAndSkill(skill.github_url!, skill.install_command || "");
        if (!info) {
          await supabase.from("skills").update({ skill_md_status: "not_found" }).eq("id", skill.id);
          notFound++;
          continue;
        }

        const { owner, repo, skillName } = info;
        const basePaths = skillName
          ? [
              `skills/${skillName}/SKILL.md`,
              `.claude/skills/${skillName}/SKILL.md`,
              `SKILL.md`,
            ]
          : [`SKILL.md`, `skills/SKILL.md`];

        const branches = ["main", "master"];
        let content: string | null = null;

        for (const branch of branches) {
          if (content || rateLimited) break;
          for (const path of basePaths) {
            const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
            const result = await tryFetchContent(url, githubToken || undefined);
            if (result === "RATE_LIMITED") {
              rateLimited = true;
              console.warn(`Rate limited at ${fetched + notFound} skills processed`);
              break;
            }
            if (result) {
              content = result;
              break;
            }
          }
        }

        if (rateLimited) break;

        if (content) {
          await supabase.from("skills").update({ skill_md: content, skill_md_status: "fetched" }).eq("id", skill.id);
          fetched++;
        } else {
          await supabase.from("skills").update({ skill_md_status: "not_found" }).eq("id", skill.id);
          notFound++;
        }

        // Rate limiting: 1s delay every 10 requests
        if ((fetched + notFound) % 10 === 0) await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`Error fetching skill_md for ${skill.slug}:`, e instanceof Error ? e.message : e);
        await supabase.from("skills").update({ skill_md_status: "error" }).eq("id", skill.id);
        errors++;
      }
    }

    // Update sync_log
    if (syncId) {
      await supabase.from("sync_log").update({
        status: rateLimited ? "rate_limited" : (errors > fetched ? "failed" : "completed"),
        completed_at: new Date().toISOString(),
        new_count: fetched,
        error_count: errors,
      }).eq("id", syncId);
    }

    return new Response(JSON.stringify({ success: true, fetched, notFound, errors, rateLimited, total: skills.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bulk-fetch-skill-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
