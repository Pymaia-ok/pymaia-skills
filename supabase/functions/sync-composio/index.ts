import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

function inferCategory(name: string, desc: string): string {
  const text = `${name} ${desc}`.toLowerCase();
  if (text.match(/\b(gmail|email|outlook|smtp|mailgun|sendgrid)\b/)) return "communication";
  if (text.match(/\b(slack|discord|teams|telegram|whatsapp|twilio)\b/)) return "communication";
  if (text.match(/\b(github|gitlab|git\b|bitbucket|jenkins)\b/)) return "development";
  if (text.match(/\b(postgres|mysql|mongo|redis|supabase|sqlite)\b/)) return "databases";
  if (text.match(/\b(notion|todoist|trello|jira|asana|linear|calendar|google.?docs)\b/)) return "productivity";
  if (text.match(/\b(brave|google.?search|search|exa|tavily)\b/)) return "search";
  if (text.match(/\b(puppeteer|playwright|browser|selenium|crawl|scrape|zapier|n8n)\b/)) return "automation";
  if (text.match(/\b(stripe|shopify|payment|paypal|commerce)\b/)) return "apis";
  if (text.match(/\b(aws|azure|gcp|cloud|docker|kubernetes|vercel)\b/)) return "cloud";
  if (text.match(/\b(openai|claude|anthropic|llm|ai\b|gpt|gemini)\b/)) return "ai";
  if (text.match(/\b(figma|design|canva|adobe)\b/)) return "design";
  if (text.match(/\b(file|storage|s3|drive|dropbox)\b/)) return "storage";
  if (text.match(/\b(hubspot|mailchimp|crm|salesforce|meta|facebook|instagram|twitter|linkedin|ads)\b/)) return "marketing";
  if (text.match(/\b(analytics|segment|mixpanel)\b/)) return "analytics";
  return "general";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const maxScrape = body.maxScrape || 50;

    // Step 1: Map composio.dev/toolkits to discover toolkit URLs
    console.log("[composio] Mapping composio.dev/toolkits...");
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://composio.dev/toolkits",
        limit: 5000,
        includeSubdomains: false,
      }),
    });

    if (!mapRes.ok) {
      const err = await mapRes.text();
      console.error("[composio] Map failed:", err);
      return new Response(JSON.stringify({ error: `Map failed: ${mapRes.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mapData = await mapRes.json();
    const allLinks: string[] = mapData?.links || [];
    console.log(`[composio] Found ${allLinks.length} total URLs`);

    // Filter toolkit detail URLs: /toolkits/{name}
    const toolkitUrls = allLinks.filter((url: string) => {
      const m = url.match(/composio\.dev\/toolkits\/([a-zA-Z0-9_-]+)\/?$/);
      return m && !["new", "search", "categories", "api", "docs"].includes(m[1]);
    });
    console.log(`[composio] ${toolkitUrls.length} toolkit URLs found`);

    // Step 2: Scrape each toolkit page for rich data
    const records: any[] = [];
    const toScrape = toolkitUrls.slice(0, maxScrape);
    let scraped = 0;
    let errors = 0;

    for (const url of toScrape) {
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });

        if (!scrapeRes.ok) { errors++; continue; }
        const scrapeData = await scrapeRes.json();
        const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";
        const metadata = scrapeData?.data?.metadata || scrapeData?.metadata || {};

        // Extract name from URL
        const nameMatch = url.match(/toolkits\/([a-zA-Z0-9_-]+)/);
        if (!nameMatch) continue;

        const rawName = nameMatch[1];
        const slug = `composio-${slugify(rawName)}`;
        const displayName = rawName
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        // Extract description from markdown (first paragraph)
        const descMatch = markdown.match(/^(?!#)(.{20,500}?)(?:\n|$)/m);
        const description = descMatch
          ? descMatch[1].trim()
          : metadata?.description || `${displayName} integration via Composio`;

        const category = inferCategory(displayName, description);

        // Extract supported tools/triggers from markdown
        const toolsSection = markdown.match(/(?:tools|triggers|actions)[\s\S]*?(?=##|$)/i);
        const readmeSummary = toolsSection ? toolsSection[0].slice(0, 2000) : "";

        records.push({
          slug,
          name: displayName,
          description: description.slice(0, 1000),
          category,
          status: "approved",
          homepage: `https://composio.dev/toolkits/${rawName}`,
          source: "composio",
          external_use_count: 0,
          install_command: "",
          credentials_needed: [],
          install_count: 0,
          readme_summary: readmeSummary || null,
        });

        scraped++;
        // Rate limit
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error(`[composio] Error scraping ${url}:`, (e as Error).message);
        errors++;
      }
    }

    console.log(`[composio] Scraped ${scraped}/${toScrape.length}, errors: ${errors}`);

    // Step 3: Upsert into mcp_servers
    let totalImported = 0;
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      const { error, count } = await supabase
        .from("mcp_servers")
        .upsert(batch, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
      if (error) { console.error(`Upsert error:`, error.message); errors++; }
      else { totalImported += count || 0; }
    }

    return new Response(
      JSON.stringify({
        source: "composio",
        toolkitUrlsFound: toolkitUrls.length,
        scraped,
        imported: totalImported,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Sync error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
