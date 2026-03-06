import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Well-known brand icons from Simple Icons CDN
const KNOWN_ICONS: Record<string, string> = {
  github: "github", gitlab: "gitlab", bitbucket: "bitbucket",
  slack: "slack", discord: "discord", telegram: "telegram",
  whatsapp: "whatsapp", gmail: "gmail", outlook: "microsoftoutlook",
  notion: "notion", obsidian: "obsidian", evernote: "evernote",
  jira: "jira", confluence: "confluence", trello: "trello",
  asana: "asana", linear: "linear", clickup: "clickup", monday: "monday",
  figma: "figma", canva: "canva",
  stripe: "stripe", shopify: "shopify", square: "square",
  hubspot: "hubspot", salesforce: "salesforce", intercom: "intercom",
  zendesk: "zendesk", mailchimp: "mailchimp",
  docker: "docker", kubernetes: "kubernetes", terraform: "terraform",
  jenkins: "jenkins", vercel: "vercel", netlify: "netlify",
  supabase: "supabase", firebase: "firebase",
  mongodb: "mongodb", postgresql: "postgresql", mysql: "mysql",
  redis: "redis", elasticsearch: "elasticsearch",
  aws: "amazonaws", azure: "microsoftazure", gcp: "googlecloud",
  sentry: "sentry", datadog: "datadog", grafana: "grafana",
  openai: "openai", anthropic: "anthropic",
  spotify: "spotify", youtube: "youtube", twitch: "twitch",
  facebook: "facebook", instagram: "instagram", twitter: "x",
  linkedin: "linkedin", pinterest: "pinterest", reddit: "reddit",
  tiktok: "tiktok", snapchat: "snapchat",
  zoom: "zoom", teams: "microsoftteams",
  dropbox: "dropbox", "google drive": "googledrive",
  "google sheets": "googlesheets", "google calendar": "googlecalendar",
  "google maps": "googlemaps", "google analytics": "googleanalytics",
  zapier: "zapier", make: "make", n8n: "n8n",
  todoist: "todoist", airtable: "airtable",
  twilio: "twilio", sendgrid: "sendgrid", resend: "resend",
  cloudflare: "cloudflare", digitalocean: "digitalocean",
  npm: "npm", yarn: "yarn", pnpm: "pnpm",
  vscode: "visualstudiocode", cursor: "cursor",
  brave: "brave", chrome: "googlechrome",
  wordpress: "wordpress", wix: "wix", webflow: "webflow",
  "google gemini": "googlegemini", gemini: "googlegemini",
  databricks: "databricks", amplitude: "amplitude",
};

function tryMatchKnownIcon(name: string): string | null {
  const lower = name.toLowerCase();
  // Exact match
  if (KNOWN_ICONS[lower]) return `https://cdn.simpleicons.org/${KNOWN_ICONS[lower]}`;
  // Partial match
  for (const [key, icon] of Object.entries(KNOWN_ICONS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return `https://cdn.simpleicons.org/${icon}`;
    }
  }
  return null;
}

function faviconFromHomepage(homepage: string): string | null {
  try {
    const url = new URL(homepage);
    // Skip aggregator sites
    if (url.hostname.includes("smithery.ai") || url.hostname.includes("github.com")) return null;
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { batchSize = 50 } = await req.json().catch(() => ({}));

    // Get connectors without icon
    const { data: pending, error: fetchErr } = await supabase
      .from("mcp_servers")
      .select("id, name, homepage")
      .is("icon_url", null)
      .eq("status", "approved")
      .limit(batchSize);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ updated: 0, remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    for (const c of pending) {
      // 1. Try known brand icons first
      let iconUrl = tryMatchKnownIcon(c.name);
      
      // 2. Try favicon from homepage
      if (!iconUrl && c.homepage) {
        iconUrl = faviconFromHomepage(c.homepage);
      }

      if (iconUrl) {
        const { error } = await supabase
          .from("mcp_servers")
          .update({ icon_url: iconUrl })
          .eq("id", c.id);
        if (!error) updated++;
      } else {
        // Mark as checked so we don't re-process (use empty string)
        await supabase
          .from("mcp_servers")
          .update({ icon_url: "" })
          .eq("id", c.id);
      }
    }

    const { count } = await supabase
      .from("mcp_servers")
      .select("id", { count: "exact", head: true })
      .is("icon_url", null)
      .eq("status", "approved");

    return new Response(
      JSON.stringify({ updated, processed: pending.length, remaining: count ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Fetch icons error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
