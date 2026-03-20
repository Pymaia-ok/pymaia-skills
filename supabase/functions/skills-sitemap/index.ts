import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://pymaiaskills.lovable.app";
const ITEMS_PER_SITEMAP = 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // "skills" | "connectors" | "plugins"
    const page = parseInt(url.searchParams.get("page") || "0", 10);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If no type, return sitemap-index
    if (!type) {
      const [{ count: skillCount }, { count: connectorCount }, { count: pluginCount }] = await Promise.all([
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved").eq("is_public", true),
        supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);

      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/skills-sitemap`;
      const sitemaps: string[] = [];

      const addSitemaps = (t: string, count: number | null) => {
        const pages = Math.ceil((count || 0) / ITEMS_PER_SITEMAP);
        for (let i = 0; i < pages; i++) {
          sitemaps.push(`  <sitemap><loc>${fnUrl}?type=${t}&amp;page=${i}</loc></sitemap>`);
        }
      };

      addSitemaps("skills", skillCount);
      addSitemaps("connectors", connectorCount);
      addSitemaps("plugins", pluginCount);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>`;

      return new Response(xml, {
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=21600", ...corsHeaders },
      });
    }

    // Sub-sitemap for a specific type + page
    const from = page * ITEMS_PER_SITEMAP;
    const to = from + ITEMS_PER_SITEMAP - 1;
    let urls: string[] = [];

    if (type === "skills") {
      const { data } = await supabase
        .from("skills")
        .select("slug, updated_at")
        .eq("status", "approved")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      urls = (data || []).map((s: any) =>
        `  <url><loc>${BASE_URL}/skill/${s.slug}</loc><lastmod>${new Date(s.updated_at).toISOString().split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`
      );
    } else if (type === "connectors") {
      const { data } = await supabase
        .from("mcp_servers")
        .select("slug, updated_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(from, to);

      urls = (data || []).map((c: any) =>
        `  <url><loc>${BASE_URL}/conector/${c.slug}</loc><lastmod>${new Date(c.updated_at).toISOString().split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
      );
    } else if (type === "plugins") {
      const { data } = await supabase
        .from("plugins")
        .select("slug, updated_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(from, to);

      urls = (data || []).map((p: any) =>
        `  <url><loc>${BASE_URL}/plugin/${p.slug}</loc><lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=21600", ...corsHeaders },
    });
  } catch (e) {
    console.error("skills-sitemap error:", e);
    return new Response("<error>Internal error</error>", { status: 500, headers: { "Content-Type": "application/xml" } });
  }
});
