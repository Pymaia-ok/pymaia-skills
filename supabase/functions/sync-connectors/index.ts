import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function inferCategory(name: string, desc: string): string {
  const text = `${name} ${desc}`.toLowerCase();
  if (text.match(/\b(gmail|email|outlook|smtp|imap|mailgun|sendgrid|postmark)\b/)) return "communication";
  if (text.match(/\b(slack|discord|teams|telegram|whatsapp|twilio|sms)\b/)) return "communication";
  if (text.match(/\b(github|gitlab|git\b|bitbucket|codeberg|ci.?cd|jenkins)\b/)) return "development";
  if (text.match(/\b(postgres|mysql|mongo|redis|supabase|sqlite|dynamodb|cockroach|prisma|drizzle)\b/)) return "databases";
  if (text.match(/\b(notion|obsidian|todoist|trello|jira|asana|linear|calendar|google.?docs|confluence)\b/)) return "productivity";
  if (text.match(/\b(brave|google.?search|search|exa|tavily|bing|serp|duckduckgo)\b/)) return "search";
  if (text.match(/\b(puppeteer|playwright|browser|selenium|crawl|scrape|automation|n8n|zapier)\b/)) return "automation";
  if (text.match(/\b(stripe|shopify|payment|paypal|square|commerce)\b/)) return "apis";
  if (text.match(/\b(aws|azure|gcp|cloud|docker|kubernetes|terraform|vercel|netlify)\b/)) return "cloud";
  if (text.match(/\b(openai|claude|anthropic|llm|ai\b|gpt|gemini|hugging.?face|embedding|vector)\b/)) return "ai";
  if (text.match(/\b(figma|design|canva|adobe|sketch)\b/)) return "design";
  if (text.match(/\b(file|storage|s3|blob|drive|dropbox|box)\b/)) return "storage";
  if (text.match(/\b(meta|facebook|instagram|tiktok|twitter|x\.com|linkedin|social|ads|advertising)\b/)) return "marketing";
  if (text.match(/\b(hubspot|mailchimp|omnisend|klaviyo|crm|salesforce)\b/)) return "marketing";
  if (text.match(/\b(analytics|segment|mixpanel|amplitude|tracking)\b/)) return "analytics";
  return "general";
}

function slugify(qualifiedName: string): string {
  return qualifiedName
    .replace(/^@/, "")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 200);
}

function formatDisplayName(qualifiedName: string, displayName?: string): string {
  if (displayName && displayName.trim()) return displayName.trim();
  const name = qualifiedName.split("/").pop() || qualifiedName;
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bMcp\b/g, "MCP")
    .replace(/\bApi\b/g, "API")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bSql\b/g, "SQL");
}

// ─── Source: Smithery ───
async function syncSmithery(supabase: any, page: number, pageSize: number, maxPages: number) {
  let totalImported = 0;
  let totalSkipped = 0;
  let errors = 0;
  let currentPage = page;
  const endPage = page + maxPages - 1;

  while (currentPage <= endPage) {
    const url = `https://registry.smithery.ai/servers?q=&page=${currentPage}&pageSize=${pageSize}`;
    console.log(`[Smithery] Fetching page ${currentPage}: ${url}`);

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) { console.error(`Smithery API error: ${res.status}`); errors++; break; }

    const data = await res.json();
    const servers = data.servers || data.items || data || [];
    if (!Array.isArray(servers) || servers.length === 0) break;

    const records = servers.map((s: any) => {
      const qualifiedName = s.qualifiedName || s.name || "";
      const displayName = formatDisplayName(qualifiedName, s.displayName);
      const description = (s.description || "").slice(0, 1000);
      const slug = slugify(qualifiedName);
      const category = inferCategory(displayName, description);
      return {
        slug, name: displayName, description: description || `${displayName} MCP server`,
        category, status: "approved", homepage: s.homepage || null,
        source: "smithery", external_use_count: s.useCount || 0,
        install_command: `npx -y @smithery/cli install ${qualifiedName} --client claude`,
        credentials_needed: [], install_count: 0,
      };
    }).filter((r: any) => r.slug.length >= 2);

    const { error, count } = await supabase
      .from("mcp_servers")
      .upsert(records, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });

    if (error) { console.error(`Upsert error:`, error.message); errors++; }
    else { totalImported += count || 0; totalSkipped += records.length - (count || 0); }

    currentPage++;
    await new Promise((r) => setTimeout(r, 300));
  }

  return { imported: totalImported, skipped: totalSkipped, errors, pages_processed: currentPage - page, next_page: currentPage };
}

// ─── Source: Official MCP Registry ───
async function syncOfficialRegistry(supabase: any, cursor: string | null, limit: number, maxPages: number) {
  let totalImported = 0;
  let errors = 0;
  let pagesProcessed = 0;
  let nextCursor = cursor;
  const seenNames = new Set<string>();

  for (let i = 0; i < maxPages; i++) {
    let url = `https://registry.modelcontextprotocol.io/v0/servers?limit=${limit}`;
    if (nextCursor) url += `&cursor=${encodeURIComponent(nextCursor)}`;
    console.log(`[Official] Fetching: ${url}`);

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) { console.error(`Official Registry error: ${res.status}`); errors++; break; }

    const data = await res.json();
    const servers = data.servers || [];
    if (!Array.isArray(servers) || servers.length === 0) break;

    // Deduplicate by name (keep latest version only)
    const uniqueServers: any[] = [];
    for (const entry of servers) {
      const s = entry.server || entry;
      const meta = entry._meta || {};
      const official = meta["io.modelcontextprotocol.registry/official"] || {};
      const name = s.name || "";
      // Only keep latest version
      if (official.isLatest === false) continue;
      if (seenNames.has(name)) continue;
      seenNames.add(name);
      uniqueServers.push(s);
    }

    const records = uniqueServers.map((s: any) => {
      const name = s.name || "";
      const title = s.title || "";
      const displayName = formatDisplayName(name, title);
      const description = (s.description || "").slice(0, 1000);
      const slug = slugify(name);
      const category = inferCategory(displayName, description);
      const iconUrl = s.icons?.[0]?.src || null;
      const homepage = s.websiteUrl || s.repository?.url || null;

      return {
        slug, name: displayName, description: description || `${displayName} MCP server`,
        category, status: "approved", homepage,
        source: "official-registry", external_use_count: 0,
        icon_url: iconUrl,
        install_command: s.packages?.npm ? `npx -y ${s.packages.npm.name}` : (s.remotes?.[0]?.url || ""),
        credentials_needed: [], install_count: 0,
      };
    }).filter((r: any) => r.slug.length >= 2);

    if (records.length > 0) {
      const { error, count } = await supabase
        .from("mcp_servers")
        .upsert(records, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
      if (error) { console.error(`Upsert error:`, error.message); errors++; }
      else { totalImported += count || 0; }
    }

    pagesProcessed++;
    nextCursor = data.metadata?.nextCursor || null;
    if (!nextCursor) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  return { imported: totalImported, errors, pages_processed: pagesProcessed, next_cursor: nextCursor };
}

// ─── Source: Glama.ai (via their GitHub awesome-mcp-servers README) ───
async function syncGlamaGithub(supabase: any) {
  console.log("[Glama/GitHub] Fetching awesome-mcp-servers README...");
  const res = await fetch("https://api.github.com/repos/punkpeye/awesome-mcp-servers/readme", {
    headers: {
      "Accept": "application/vnd.github.v3.raw",
      ...(Deno.env.get("GITHUB_TOKEN") ? { "Authorization": `token ${Deno.env.get("GITHUB_TOKEN")}` } : {}),
    },
  });

  if (!res.ok) {
    console.error(`GitHub API error: ${res.status}`);
    return { imported: 0, errors: 1, parsed: 0 };
  }

  const readme = await res.text();
  const linkRegex = /^[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*[-–:]?\s*(.*)/gm;
  const records: any[] = [];
  let match;

  while ((match = linkRegex.exec(readme)) !== null) {
    const [, name, url, desc] = match;
    if (!name || !url) continue;
    if (url.includes("img.shields.io") || url.includes("#")) continue;
    if (name.length < 3 || name.length > 100) continue;
    
    const displayName = formatDisplayName(name, name);
    const description = (desc || "").slice(0, 1000).trim();
    const slug = slugify(name);
    if (slug.length < 2) continue;
    const category = inferCategory(displayName, description);

    records.push({
      slug, name: displayName, description: description || `${displayName} MCP server`,
      category, status: "approved", homepage: url,
      source: "awesome-mcp-servers", external_use_count: 0,
      install_command: "", credentials_needed: [], install_count: 0,
    });
  }

  console.log(`[Glama/GitHub] Parsed ${records.length} entries from README`);

  let totalImported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { error, count } = await supabase
      .from("mcp_servers")
      .upsert(batch, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
    if (error) { console.error(`Upsert error:`, error.message); errors++; }
    else { totalImported += count || 0; }
  }

  return { imported: totalImported, errors, parsed: records.length };
}

// ─── Source: Glama.ai API ───
async function syncGlamaApi(supabase: any, maxPages: number) {
  let totalImported = 0;
  let errors = 0;
  let pagesProcessed = 0;
  let cursor: string | null = null;

  for (let i = 0; i < maxPages; i++) {
    let url = `https://glama.ai/api/mcp/v1/servers?limit=100`;
    if (cursor) url += `&after=${encodeURIComponent(cursor)}`;
    console.log(`[Glama API] Fetching page ${i + 1}: ${url}`);

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) { console.error(`Glama API error: ${res.status}`); errors++; break; }

    const data = await res.json();
    const servers = data.servers || [];
    if (!Array.isArray(servers) || servers.length === 0) break;

    const records = servers.map((s: any) => {
      const name = s.name || "";
      const displayName = formatDisplayName(name, name);
      const description = (s.description || "").slice(0, 1000);
      const slug = slugify(s.slug || name);
      const category = inferCategory(displayName, description);
      const homepage = s.repository?.url || s.url || null;

      return {
        slug, name: displayName, description: description || `${displayName} MCP server`,
        category, status: "approved", homepage,
        source: "glama", external_use_count: 0,
        install_command: "", credentials_needed: [], install_count: 0,
      };
    }).filter((r: any) => r.slug.length >= 2);

    if (records.length > 0) {
      const { error, count } = await supabase
        .from("mcp_servers")
        .upsert(records, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
      if (error) { console.error(`Upsert error:`, error.message); errors++; }
      else { totalImported += count || 0; }
    }

    pagesProcessed++;
    cursor = data.pageInfo?.endCursor || null;
    if (!data.pageInfo?.hasNextPage || !cursor) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  return { imported: totalImported, errors, pages_processed: pagesProcessed, next_cursor: cursor };
}

// ─── Source: 0x7c2f GitHub MCP Server List (JSON API) ───
async function syncGithubMcpList(supabase: any) {
  console.log("[0x7c2f] Fetching mcp-servers.json...");
  const res = await fetch("https://0x7c2f.github.io/api/mcp-servers.json", {
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    console.error(`0x7c2f API error: ${res.status}`);
    return { imported: 0, errors: 1, parsed: 0 };
  }

  const data = await res.json();
  const servers = data.servers || data || [];
  if (!Array.isArray(servers)) return { imported: 0, errors: 0, parsed: 0 };

  console.log(`[0x7c2f] Found ${servers.length} servers`);

  const records = servers.map((s: any) => {
    const name = s.name || "";
    const displayName = formatDisplayName(name, s.title || name);
    const description = (s.description || "").slice(0, 1000);
    const slug = slugify(name);
    const category = inferCategory(displayName, description);
    const homepage = s.repository || s.homepage || s.url || null;

    return {
      slug, name: displayName, description: description || `${displayName} MCP server`,
      category, status: "approved", homepage,
      source: "0x7c2f", external_use_count: 0,
      install_command: "", credentials_needed: [], install_count: 0,
    };
  }).filter((r: any) => r.slug.length >= 2);

  let totalImported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { error, count } = await supabase
      .from("mcp_servers")
      .upsert(batch, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
    if (error) { console.error(`Upsert error:`, error.message); errors++; }
    else { totalImported += count || 0; }
  }

  return { imported: totalImported, errors, parsed: records.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const source = body.source || "smithery";

    let result: any;

    switch (source) {
      case "smithery":
        result = await syncSmithery(supabase, body.page || 1, body.pageSize || 50, body.maxPages || 5);
        break;

      case "official-registry":
        result = await syncOfficialRegistry(supabase, body.cursor || null, body.limit || 100, body.maxPages || 10);
        break;

      case "awesome-mcp-servers":
        result = await syncGlamaGithub(supabase);
        break;

      case "glama":
        result = await syncGlamaApi(supabase, body.maxPages || 50);
        break;

      case "0x7c2f":
        result = await syncGithubMcpList(supabase);
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown source: ${source}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(
      JSON.stringify({ source, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Sync error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
