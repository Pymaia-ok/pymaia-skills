// sync-plugins v1 — Discover community plugins from GitHub
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(name: string): string {
  return name
    .replace(/^@/, "")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 200);
}

function inferCategory(name: string, desc: string): string {
  const text = `${name} ${desc}`.toLowerCase();
  if (text.match(/\b(code|dev|debug|test|lint|format|refactor|typescript|javascript|python|rust)\b/)) return "development";
  if (text.match(/\b(design|figma|ui|ux|css|tailwind|frontend)\b/)) return "design";
  if (text.match(/\b(sales|crm|lead|pipeline|deal|prospect)\b/)) return "sales";
  if (text.match(/\b(market|seo|content|brand|social|campaign|ads)\b/)) return "marketing";
  if (text.match(/\b(legal|contract|compliance|law|attorney|nda)\b/)) return "legal";
  if (text.match(/\b(finance|accounting|invoice|budget|tax|revenue)\b/)) return "finance";
  if (text.match(/\b(hr|recruit|hiring|onboard|employee|talent)\b/)) return "hr";
  if (text.match(/\b(product|roadmap|sprint|agile|backlog|feature)\b/)) return "product";
  if (text.match(/\b(data|analytics|dashboard|report|metric|chart)\b/)) return "analytics";
  if (text.match(/\b(write|document|note|notion|obsidian|wiki)\b/)) return "productivity";
  if (text.match(/\b(security|auth|encrypt|vulnerability|pentest)\b/)) return "security";
  if (text.match(/\b(devops|deploy|ci|cd|docker|kubernetes|infra)\b/)) return "devops";
  return "development";
}

function inferPlatform(topics: string[], name: string, desc: string): string {
  const text = `${name} ${desc} ${topics.join(" ")}`.toLowerCase();
  const isCowork = text.includes("cowork");
  const isCode = text.includes("claude-code") || text.includes("claude code");
  if (isCowork && isCode) return "both";
  if (isCowork) return "cowork";
  return "claude-code";
}

// ─── Source 1: GitHub Topics API ───
async function syncFromTopics(supabase: any, ghHeaders: Record<string, string>) {
  const topics = ["claude-cowork", "claude-code-plugin-marketplace", "claude-plugin", "claude-code-plugin"];
  let totalImported = 0;
  let errors = 0;

  for (const topic of topics) {
    try {
      const url = `https://api.github.com/search/repositories?q=topic:${topic}&sort=stars&order=desc&per_page=50`;
      console.log(`[Topics] Searching topic: ${topic}`);
      const res = await fetch(url, { headers: ghHeaders });
      
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) {
          console.warn("[Topics] Rate limited, stopping");
          break;
        }
        console.error(`[Topics] Error ${res.status} for topic ${topic}`);
        errors++;
        continue;
      }

      const data = await res.json();
      const repos = data.items || [];
      console.log(`[Topics] Found ${repos.length} repos for topic ${topic}`);

      const records = repos.map((repo: any) => {
        const name = repo.name || "";
        const displayName = name
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
        const description = (repo.description || "").slice(0, 1000);
        const slug = slugify(repo.full_name || name);
        const category = inferCategory(displayName, description);
        const platform = inferPlatform(repo.topics || [], name, description);

        return {
          slug,
          name: displayName,
          description: description || `${displayName} plugin for Claude`,
          platform,
          category,
          is_anthropic_verified: false,
          is_official: false,
          source: "community",
          status: "approved",
          github_url: repo.html_url,
          github_stars: repo.stargazers_count || 0,
          last_commit_at: repo.pushed_at || null,
          install_count: 0,
          security_status: "unverified",
        };
      }).filter((r: any) => r.slug.length >= 2);

      if (records.length > 0) {
        const { error, count } = await supabase
          .from("plugins")
          .upsert(records, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
        if (error) { console.error(`[Topics] Upsert error:`, error.message); errors++; }
        else { totalImported += count || 0; }
      }

      await new Promise(r => setTimeout(r, 1000)); // respect rate limit
    } catch (e) {
      console.error(`[Topics] Error for topic ${topic}:`, (e as Error).message);
      errors++;
    }
  }

  return { imported: totalImported, errors };
}

// ─── Source 2: GitHub Code Search for plugin.json ───
async function syncFromCodeSearch(supabase: any, ghHeaders: Record<string, string>) {
  const queries = [
    'filename:plugin.json "claude" in:file',
    'filename:plugin.json "cowork" in:file',
    'filename:plugin.json "claude-code" in:file',
  ];
  let totalImported = 0;
  let errors = 0;

  for (const query of queries) {
    try {
      const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=30`;
      console.log(`[CodeSearch] Searching: ${query}`);
      const res = await fetch(url, { headers: ghHeaders });

      if (!res.ok) {
        if (res.status === 403 || res.status === 429) break;
        console.error(`[CodeSearch] Error ${res.status}`);
        errors++;
        continue;
      }

      const data = await res.json();
      const items = data.items || [];
      console.log(`[CodeSearch] Found ${items.length} results`);

      // Extract unique repos
      const repoMap = new Map<string, any>();
      for (const item of items) {
        const repo = item.repository;
        if (repo && !repoMap.has(repo.full_name)) {
          repoMap.set(repo.full_name, repo);
        }
      }

      const records = Array.from(repoMap.values()).map((repo: any) => {
        const name = repo.name || "";
        const displayName = name
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
        const description = (repo.description || "").slice(0, 1000);
        const slug = slugify(repo.full_name || name);
        const category = inferCategory(displayName, description);

        return {
          slug,
          name: displayName,
          description: description || `${displayName} plugin for Claude`,
          platform: "claude-code" as const,
          category,
          is_anthropic_verified: false,
          is_official: false,
          source: "community",
          status: "approved",
          github_url: repo.html_url,
          github_stars: repo.stargazers_count || 0,
          install_count: 0,
          security_status: "unverified",
        };
      }).filter((r: any) => r.slug.length >= 2);

      if (records.length > 0) {
        const { error, count } = await supabase
          .from("plugins")
          .upsert(records, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
        if (error) { console.error(`[CodeSearch] Upsert error:`, error.message); errors++; }
        else { totalImported += count || 0; }
      }

      await new Promise(r => setTimeout(r, 2000)); // code search has stricter rate limits
    } catch (e) {
      console.error(`[CodeSearch] Error:`, (e as Error).message);
      errors++;
    }
  }

  return { imported: totalImported, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!githubToken) {
      throw new Error("GITHUB_TOKEN not configured");
    }

    const ghHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "pymaia-plugins-bot",
      Authorization: `Bearer ${githubToken}`,
    };

    const { source = "all" } = await req.json().catch(() => ({}));

    const results: Record<string, any> = {};

    if (source === "all" || source === "topics") {
      results.topics = await syncFromTopics(supabase, ghHeaders);
    }

    if (source === "all" || source === "code-search") {
      results.code_search = await syncFromCodeSearch(supabase, ghHeaders);
    }

    const totalImported = Object.values(results).reduce((sum: number, r: any) => sum + (r.imported || 0), 0);

    return new Response(
      JSON.stringify({ source, total_imported: totalImported, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-plugins error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
