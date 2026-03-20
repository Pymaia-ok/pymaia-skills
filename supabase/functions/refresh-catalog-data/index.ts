// refresh-catalog-data v1 — Unified catalog freshness pipeline
// Modes: refresh_readmes | detect_dead_repos | scrape_docs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logFailure } from "../_shared/error-helpers.ts";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { mode = "refresh_readmes", batchSize = 15 } = await req.json().catch(() => ({}));

    const log = async (action: string, reason: string, meta?: any) => {
      await supabase.from("automation_logs").insert({
        function_name: "refresh-catalog-data",
        action_type: action,
        reason,
        metadata: meta ?? {},
      });
    };

    // ─── MODE 1: Refresh READMEs for items with new commits ───
    if (mode === "refresh_readmes") {
      return await refreshReadmes(supabase, githubToken, lovableApiKey, batchSize, log);
    }

    // ─── MODE 2: Detect dead/archived repos ───
    if (mode === "detect_dead_repos") {
      return await detectDeadRepos(supabase, githubToken, batchSize, log);
    }

    // ─── MODE 3: Scrape docs_url for curated connectors ───
    if (mode === "scrape_docs") {
      return await scrapeDocs(supabase, firecrawlKey, lovableApiKey, batchSize, log);
    }

    return new Response(JSON.stringify({ error: "Unknown mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-catalog-data error:", (e as Error).message);
    // Log top-level error to automation_logs
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("automation_logs").insert({ function_name: "refresh-catalog-data", action_type: "error", reason: (e as Error).message.slice(0, 500) });
    } catch (err) { await logFailure(sb, "refresh-catalog-data", (err as Error).message, { step: "top_level_log" }); }
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helpers ───

function ghHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pymaia-skills-bot",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function extractRepo(url: string): string | null {
  const m = url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
  return m ? m[1].replace(/\.git$/, "").replace(/\/$/, "") : null;
}

// ─── MODE 1: Refresh READMEs when last_commit_at changed ───
async function refreshReadmes(
  supabase: any, githubToken: string | undefined, lovableApiKey: string | undefined,
  batchSize: number, log: Function
) {
  // Find skills/connectors/plugins whose README might be stale
  // (have readme_raw but last_commit_at is after updated_at, or haven't been refreshed in 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Skills with stale READMEs
  const { data: skills } = await supabase
    .from("skills")
    .select("id, slug, display_name, github_url, last_commit_at, updated_at")
    .eq("status", "approved")
    .not("github_url", "is", null)
    .not("readme_raw", "is", null)
    .neq("readme_raw", "")
    .or(`last_commit_at.gt.updated_at,updated_at.lt.${thirtyDaysAgo}`)
    .order("updated_at", { ascending: true })
    .limit(batchSize);

  // Connectors with stale READMEs
  const { data: connectors } = await supabase
    .from("mcp_servers")
    .select("id, slug, name, github_url, last_commit_at, updated_at")
    .eq("status", "approved")
    .not("github_url", "is", null)
    .not("readme_raw", "is", null)
    .neq("readme_raw", "")
    .or(`last_commit_at.gt.updated_at,updated_at.lt.${thirtyDaysAgo}`)
    .order("updated_at", { ascending: true })
    .limit(Math.max(5, Math.floor(batchSize / 3)));

  const items = [
    ...(skills || []).map((s: any) => ({ ...s, table: "skills", name: s.display_name })),
    ...(connectors || []).map((c: any) => ({ ...c, table: "mcp_servers" })),
  ];

  if (items.length === 0) {
    return jsonRes({ refreshed: 0, message: "All READMEs up to date" });
  }

  let refreshed = 0;
  const headers = { Accept: "application/vnd.github.v3.raw" } as Record<string, string>;
  if (githubToken) headers["Authorization"] = `token ${githubToken}`;

  for (const item of items) {
    try {
      const repo = extractRepo(item.github_url);
      if (!repo) continue;

      const res = await fetch(`https://api.github.com/repos/${repo}/readme`, { headers });
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) break;
        continue;
      }

      let readme = await res.text();
      if (readme.length > 15000) readme = readme.slice(0, 15000) + "\n\n[...truncated]";

      // Generate fresh summary with AI
      let summary: string | null = null;
      if (lovableApiKey && readme.length > 50) {
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "Summarize this GitHub README in 3-5 sentences. Be specific and technical. Write in the same language as the README." },
                { role: "user", content: `Tool: "${item.name || item.slug}"\n\n${readme.slice(0, 6000)}` },
              ],
              max_tokens: 500,
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            summary = aiData.choices?.[0]?.message?.content?.trim() || null;
          }
        } catch (aiErr) { console.error(`AI summary error for ${item.slug}:`, aiErr); }
      }

      const updateData: any = { readme_raw: readme, updated_at: new Date().toISOString() };
      if (summary) updateData.readme_summary = summary;

      await supabase.from(item.table).update(updateData).eq("id", item.id);
      refreshed++;
    } catch (itemErr) { console.error(`README refresh error for ${item.slug}:`, itemErr); continue; }
  }

  await log("readme_refresh", `Refreshed ${refreshed}/${items.length} READMEs`);
  return jsonRes({ refreshed, processed: items.length });
}

// ─── MODE 2: Detect dead/archived repos ───
async function detectDeadRepos(
  supabase: any, githubToken: string | undefined, batchSize: number, log: Function
) {
  const headers = ghHeaders(githubToken);

  // Check all 3 tables
  const tables = ["skills", "mcp_servers", "plugins"] as const;
  let totalChecked = 0, totalDead = 0, totalArchived = 0;

  for (const table of tables) {
    const ghField = "github_url";
    const { data: items } = await supabase
      .from(table)
      .select(`id, slug, ${ghField}`)
      .eq("status", "approved")
      .not(ghField, "is", null)
      .neq(ghField, "")
      .order("updated_at", { ascending: true })
      .limit(batchSize);

    if (!items || items.length === 0) continue;

    for (const item of items) {
      const repo = extractRepo(item[ghField]);
      if (!repo) continue;

      try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });

        if (res.status === 403 || res.status === 429) break; // Rate limited

        if (res.status === 404) {
          // Repo deleted — mark as rejected
          await supabase.from(table).update({
            status: "rejected",
            updated_at: new Date().toISOString(),
          }).eq("id", item.id);
          await log("dead_repo_removed", `${table}/${item.slug}: repo deleted (404)`, { repo });
          totalDead++;
        } else if (res.ok) {
          const data = await res.json();
          if (data.archived) {
            // Repo archived — reject and flag
            await supabase.from(table).update({
              status: "rejected",
              security_status: "flagged",
              security_notes: "Repository archived on GitHub",
              updated_at: new Date().toISOString(),
            }).eq("id", item.id);
            await log("archived_repo_rejected", `${table}/${item.slug}: repo archived — auto-rejected`, { repo });
            totalArchived++;
          }
          // Touch updated_at so we don't recheck soon
          await supabase.from(table).update({ updated_at: new Date().toISOString() }).eq("id", item.id);
        }
        totalChecked++;
      } catch (repoErr) { await log("dead_repo_error", `Error checking ${item.slug}: ${(repoErr as Error).message}`); continue; }
    }
  }

  await log("dead_repo_scan", `Checked ${totalChecked}: ${totalDead} dead, ${totalArchived} archived`);
  return jsonRes({ checked: totalChecked, dead: totalDead, archived: totalArchived });
}

// ─── MODE 3: Scrape docs_url for curated connectors ───
async function scrapeDocs(
  supabase: any, firecrawlKey: string | undefined, lovableApiKey: string | undefined,
  batchSize: number, log: Function
) {
  if (!firecrawlKey) {
    return jsonRes({ error: "FIRECRAWL_API_KEY not configured" });
  }

  // Get connectors with docs_url that haven't been scraped recently (30+ days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: connectors } = await supabase
    .from("mcp_servers")
    .select("id, slug, name, docs_url, readme_summary, updated_at")
    .eq("status", "approved")
    .not("docs_url", "is", null)
    .neq("docs_url", "")
    .lt("updated_at", thirtyDaysAgo)
    .order("updated_at", { ascending: true })
    .limit(batchSize);

  if (!connectors || connectors.length === 0) {
    return jsonRes({ scraped: 0, message: "All docs up to date" });
  }

  let scraped = 0;
  for (const c of connectors) {
    try {
      // Scrape docs page with Firecrawl
      const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: c.docs_url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      if (!scrapeRes.ok) {
        console.log(`Firecrawl failed for ${c.slug}: ${scrapeRes.status}`);
        continue;
      }

      const scrapeData = await scrapeRes.json();
      const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      if (!markdown || markdown.length < 50) continue;

      // Truncate and store as readme_raw
      const raw = markdown.length > 15000 ? markdown.slice(0, 15000) + "\n\n[...truncated]" : markdown;

      // Generate summary with AI
      let summary: string | null = null;
      if (lovableApiKey) {
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "Summarize this MCP connector documentation in 3-5 sentences. Include: what it does, key tools/features, authentication method, and transport type. Be specific and technical." },
                { role: "user", content: `Connector: "${c.name}"\n\n${raw.slice(0, 6000)}` },
              ],
              max_tokens: 500,
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            summary = aiData.choices?.[0]?.message?.content?.trim() || null;
          }
        } catch (aiErr) { console.error(`AI summary error for connector ${c.slug}:`, aiErr); }
      }

      const updateData: any = { readme_raw: raw, updated_at: new Date().toISOString() };
      if (summary) updateData.readme_summary = summary;

      await supabase.from("mcp_servers").update(updateData).eq("id", c.id);
      scraped++;
      console.log(`✅ Scraped docs for ${c.slug}: ${raw.length} chars`);
    } catch (e) {
      await log("docs_scrape_error", `Error scraping ${c.slug}: ${(e as Error).message}`);
      continue;
    }
  }

  await log("docs_scrape", `Scraped ${scraped}/${connectors.length} connector docs`);
  return jsonRes({ scraped, processed: connectors.length });
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}
