import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RepoCheck {
  id: string;
  github_url: string;
  table: "skills" | "mcp_servers";
}

async function checkGitHubRepo(
  repo: string,
  headers: Record<string, string>
): Promise<{
  status: "verified" | "unverified" | "flagged";
  notes: string[];
  last_commit_at: string | null;
  stars: number;
}> {
  const notes: string[] = [];
  let status: "verified" | "unverified" | "flagged" = "unverified";

  const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!res.ok) {
    if (res.status === 404) return { status: "flagged", notes: ["Repository not found (404)"], last_commit_at: null, stars: 0 };
    if (res.status === 403 || res.status === 429) throw new Error("rate_limited");
    return { status: "unverified", notes: [`GitHub API error: ${res.status}`], last_commit_at: null, stars: 0 };
  }

  const data = await res.json();
  const stars = data.stargazers_count ?? 0;
  const lastCommit = data.pushed_at ?? null;

  // Check archived/disabled
  if (data.archived) {
    notes.push("Repository is archived");
    return { status: "flagged", notes, last_commit_at: lastCommit, stars };
  }
  if (data.disabled) {
    notes.push("Repository is disabled");
    return { status: "flagged", notes, last_commit_at: lastCommit, stars };
  }

  // Check license
  if (data.license?.spdx_id && data.license.spdx_id !== "NOASSERTION") {
    notes.push(`License: ${data.license.spdx_id}`);
  } else {
    notes.push("No license detected");
  }

  // Check README via contents API
  const readmeRes = await fetch(`https://api.github.com/repos/${repo}/readme`, { headers });
  if (readmeRes.ok) {
    const readmeData = await readmeRes.json();
    const size = readmeData.size ?? 0;
    if (size > 100) {
      notes.push("README exists");
    } else {
      notes.push("README too short");
    }
  } else {
    notes.push("No README found");
  }

  // Check activity (last commit within 12 months)
  if (lastCommit) {
    const lastCommitDate = new Date(lastCommit);
    const monthsAgo = (Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 12) {
      notes.push("Active (updated within 12 months)");
    } else {
      notes.push(`Inactive (last update ${Math.round(monthsAgo)} months ago)`);
    }
  }

  // Determine status: verified if has license + README + not archived
  const hasLicense = data.license?.spdx_id && data.license.spdx_id !== "NOASSERTION";
  const hasReadme = notes.some(n => n === "README exists");
  const isActive = notes.some(n => n.startsWith("Active"));

  if (hasLicense && hasReadme && !data.archived) {
    status = "verified";
  }

  return { status, notes, last_commit_at: lastCommit, stars };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { batchSize = 30, table = "both" } = await req.json().catch(() => ({}));

    const ghHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "pymaia-skills-bot",
    };
    if (githubToken) ghHeaders["Authorization"] = `Bearer ${githubToken}`;

    const items: RepoCheck[] = [];

    // Fetch skills needing check
    if (table === "both" || table === "skills") {
      const { data: skills } = await supabase
        .from("skills")
        .select("id, github_url")
        .eq("status", "approved")
        .not("github_url", "is", null)
        .neq("github_url", "")
        .or("security_checked_at.is.null,security_status.eq.unverified")
        .order("security_checked_at", { ascending: true, nullsFirst: true })
        .limit(Math.ceil(batchSize / 2));
      if (skills) items.push(...skills.map(s => ({ ...s, table: "skills" as const })));
    }

    // Fetch connectors needing check
    if (table === "both" || table === "mcp_servers") {
      const { data: connectors } = await supabase
        .from("mcp_servers")
        .select("id, github_url")
        .eq("status", "approved")
        .not("github_url", "is", null)
        .neq("github_url", "")
        .or("security_checked_at.is.null,security_status.eq.unverified")
        .order("security_checked_at", { ascending: true, nullsFirst: true })
        .limit(Math.ceil(batchSize / 2));
      if (connectors) items.push(...connectors.map(c => ({ ...c, table: "mcp_servers" as const })));
    }

    let verified = 0;
    let flagged = 0;
    let processed = 0;

    for (const item of items) {
      try {
        const match = item.github_url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
        if (!match) continue;
        const repo = match[1].replace(/\.git$/, "");

        const result = await checkGitHubRepo(repo, ghHeaders);

        const updateData: Record<string, any> = {
          security_status: result.status,
          security_checked_at: new Date().toISOString(),
          security_notes: result.notes.join("; "),
          last_commit_at: result.last_commit_at,
        };

        // Also update stars
        if (result.stars > 0) {
          updateData.github_stars = result.stars;
        }

        await supabase.from(item.table).update(updateData).eq("id", item.id);

        if (result.status === "verified") verified++;
        if (result.status === "flagged") flagged++;
        processed++;
      } catch (e) {
        if ((e as Error).message === "rate_limited") break;
        continue;
      }
    }

    return new Response(
      JSON.stringify({ processed, verified, flagged, total_items: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-security error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
