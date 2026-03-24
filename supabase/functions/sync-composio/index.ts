import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

function inferCategory(name: string): string {
  const text = name.toLowerCase();
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
    const enrichTop = body.enrichTop || 0; // How many to scrape for rich descriptions (0 = none)

    // ── Phase 1: Map all toolkit URLs (1 Firecrawl credit) ──
    console.log("[composio] Phase 1: Mapping composio.dev/toolkits...");
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
    console.log(`[composio] Map returned ${allLinks.length} URLs`);

    // Filter toolkit detail URLs: /toolkits/{name}
    const excludeSlugs = new Set(["new", "search", "categories", "api", "docs", "pricing", "blog", "changelog", "about", "contact", "login", "signup"]);
    const toolkitUrls = allLinks.filter((url: string) => {
      const m = url.match(/composio\.dev\/toolkits\/([a-zA-Z0-9_-]+)\/?$/);
      return m && !excludeSlugs.has(m[1]);
    });
    console.log(`[composio] ${toolkitUrls.length} toolkit URLs after filtering`);

    // ── Phase 2: Build records from URLs (0 credits) ──
    console.log("[composio] Phase 2: Building records from URLs...");
    const records: any[] = [];

    for (const url of toolkitUrls) {
      const nameMatch = url.match(/toolkits\/([a-zA-Z0-9_-]+)/);
      if (!nameMatch) continue;

      const rawName = nameMatch[1];
      const slug = `composio-${slugify(rawName)}`;
      const displayName = rawName
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      const category = inferCategory(rawName);

      records.push({
        slug,
        name: displayName,
        description: `${displayName} integration via Composio — connect your AI agents to ${displayName} with pre-built actions and triggers.`,
        category,
        status: "approved",
        homepage: `https://composio.dev/toolkits/${rawName}`,
        source: "composio",
        external_use_count: 0,
        install_command: "",
        credentials_needed: [],
        install_count: 0,
      });
    }

    console.log(`[composio] ${records.length} records built from URLs`);

    // ── Phase 3: Optional enrichment via scrape (N credits) ──
    let enriched = 0;
    if (enrichTop > 0) {
      // Find which slugs already have readme_summary
      const slugsToCheck = records.slice(0, enrichTop).map((r: any) => r.slug);
      const { data: existing } = await supabase
        .from("mcp_servers")
        .select("slug, readme_summary")
        .in("slug", slugsToCheck);

      const alreadyEnriched = new Set(
        (existing || []).filter((e: any) => e.readme_summary).map((e: any) => e.slug)
      );

      const toEnrich = records.filter((r: any) => !alreadyEnriched.has(r.slug)).slice(0, enrichTop);
      console.log(`[composio] Phase 3: Enriching ${toEnrich.length} toolkits via scrape...`);

      for (const record of toEnrich) {
        try {
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: record.homepage, formats: ["markdown"], onlyMainContent: true }),
          });

          if (scrapeRes.ok) {
            const scrapeData = await scrapeRes.json();
            const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";

            // Extract first real paragraph as description
            const descMatch = markdown.match(/^(?!#)(.{20,500}?)(?:\n|$)/m);
            if (descMatch) {
              record.description = descMatch[1].trim().slice(0, 1000);
            }

            // Extract tools/triggers section as readme_summary
            const toolsSection = markdown.match(/(?:tools|triggers|actions)[\s\S]*?(?=##|$)/i);
            record.readme_summary = toolsSection ? toolsSection[0].slice(0, 2000) : null;

            enriched++;
          }
          // Rate limit between scrapes
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          console.error(`[composio] Enrich error for ${record.slug}:`, (e as Error).message);
        }
      }
    }

    // ── Phase 4: Batch upsert into mcp_servers ──
    console.log(`[composio] Phase 4: Upserting ${records.length} records...`);
    let totalImported = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      const { error, count } = await supabase
        .from("mcp_servers")
        .upsert(batch, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error(`[composio] Upsert error at batch ${i}:`, error.message);
        errors++;
      } else {
        totalImported += count || 0;
      }
    }

    console.log(`[composio] Done: ${totalImported} imported, ${enriched} enriched, ${errors} errors`);

    return new Response(
      JSON.stringify({
        source: "composio",
        toolkitUrlsFound: toolkitUrls.length,
        recordsBuilt: records.length,
        imported: totalImported,
        enriched,
        errors,
        firecrawlCreditsUsed: 1 + enriched, // 1 for map + N for enrichment
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[composio] Sync error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
