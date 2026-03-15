import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractRepoAndSkill(githubUrl: string, installCommand: string): { owner: string; repo: string; skillName: string | null } | null {
  const m = githubUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/, "");

  // Try to extract skill name from install command
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
    if (!resp.ok) return null;
    const text = await resp.text();
    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { batchSize = 100, batch_size, priority } = await req.json().catch(() => ({}));
    const limit = batch_size || batchSize;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const githubToken = Deno.env.get("GITHUB_TOKEN");

    let query = supabase
      .from("skills")
      .select("id, slug, display_name, github_url, install_command, category, description_human, skill_md_status")
      .eq("skill_md_status", "pending")
      .not("github_url", "is", null)
      .eq("status", "approved");

    // Prioritize high-star repos when requested
    if (priority === "high_stars") {
      query = query.order("github_stars", { ascending: false });
    }

    const { data: skills, error } = await query.limit(limit);

    if (error) throw error;
    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No skills to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fetched = 0, notFound = 0, errors = 0;

    for (const skill of skills) {
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
          if (content) break;
          for (const path of basePaths) {
            const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
            content = await tryFetchContent(url, githubToken || undefined);
            if (content) break;
          }
        }

        if (content) {
          await supabase.from("skills").update({ skill_md: content, skill_md_status: "fetched" }).eq("id", skill.id);
          fetched++;
        } else {
          await supabase.from("skills").update({ skill_md_status: "not_found" }).eq("id", skill.id);
          notFound++;
        }

        // Rate limiting: pause every 20 requests
        if ((fetched + notFound) % 20 === 0) await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`Error fetching skill_md for ${skill.slug}:`, e);
        await supabase.from("skills").update({ skill_md_status: "error" }).eq("id", skill.id);
        errors++;
      }
    }

    return new Response(JSON.stringify({ success: true, fetched, notFound, errors, total: skills.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bulk-fetch-skill-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
