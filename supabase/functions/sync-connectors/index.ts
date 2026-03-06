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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { page = 1, pageSize = 50, maxPages = 5 } = await req.json().catch(() => ({}));

    let totalImported = 0;
    let totalSkipped = 0;
    let errors = 0;
    let currentPage = page;
    const endPage = page + maxPages - 1;

    while (currentPage <= endPage) {
      const url = `https://registry.smithery.ai/servers?q=&page=${currentPage}&pageSize=${pageSize}`;
      console.log(`Fetching page ${currentPage}: ${url}`);

      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        console.error(`Smithery API error: ${res.status}`);
        errors++;
        break;
      }

      const data = await res.json();
      const servers = data.servers || data.items || data || [];

      if (!Array.isArray(servers) || servers.length === 0) {
        console.log(`No more servers at page ${currentPage}`);
        break;
      }

      const records = servers.map((s: any) => {
        const qualifiedName = s.qualifiedName || s.name || "";
        const displayName = formatDisplayName(qualifiedName, s.displayName);
        const description = (s.description || "").slice(0, 1000);
        const slug = slugify(qualifiedName);
        const category = inferCategory(displayName, description);

        return {
          slug,
          name: displayName,
          description: description || `${displayName} MCP server`,
          category,
          status: "approved",
          homepage: s.homepage || null,
          source: "smithery",
          external_use_count: s.useCount || 0,
          install_command: `npx -y @smithery/cli install ${qualifiedName} --client claude`,
          credentials_needed: [],
          install_count: 0,
        };
      }).filter((r: any) => r.slug.length >= 2);

      const { error, count } = await supabase
        .from("mcp_servers")
        .upsert(records, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });

      if (error) {
        console.error(`Upsert error page ${currentPage}:`, error.message);
        errors++;
      } else {
        totalImported += count || 0;
        totalSkipped += records.length - (count || 0);
      }

      currentPage++;
      // Small delay to be nice to the API
      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({
        imported: totalImported,
        skipped: totalSkipped,
        errors,
        pages_processed: currentPage - page,
        next_page: currentPage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Sync error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
