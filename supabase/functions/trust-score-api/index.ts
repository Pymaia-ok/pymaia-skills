// trust-score-api v2.0 — Public Security Benchmark API
// Endpoints: lookup, search, badge SVG
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// ── Rate Limiting (in-memory, per-instance) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 120_000);

// ── Badge SVG Generator ──
function generateBadgeSVG(score: number, badge: string, slug: string): string {
  const badgeColors: Record<string, string> = {
    official: "#D4A017",
    verified: "#059669",
    trusted: "#16A34A",
    reviewed: "#2563EB",
    new: "#6B7280",
  };
  const color = badgeColors[badge] || badgeColors.new;
  const label = "Trust Score";
  const value = `${score} ${badge}`;
  const labelWidth = 80;
  const valueWidth = Math.max(60, value.length * 7.5 + 10);
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

// ── Extract scan details (safe subset) ──
function extractScanDetails(scanResult: any): Record<string, any> | null {
  if (!scanResult?.layers) return null;
  const layers = scanResult.layers;
  const details: Record<string, any> = {};

  const layerMap: Record<string, string> = {
    secrets: "secret_scanning",
    injection: "prompt_injection",
    typosquatting: "typosquatting",
    format: "format_validation",
    hidden: "hidden_content",
    scope: "mcp_scope_analysis",
    hooks: "hook_analysis",
    decomposition: "plugin_decomposition",
    similarity: "content_similarity",
    publisher: "publisher_verification",
    dependencies: "dependency_audit",
    llm: "llm_analysis",
  };

  for (const [key, label] of Object.entries(layerMap)) {
    const layer = layers[key];
    if (layer) {
      details[label] = {
        status: layer.count === 0 ? "pass" : layer.count > 0 ? "warning" : "unknown",
        issues_found: layer.count ?? 0,
        ...(layer.verdict ? { verdict: layer.verdict } : {}),
      };
    }
  }

  return Object.keys(details).length > 0 ? details : null;
}

function getTableName(type: string): string {
  return type === "connector" ? "mcp_servers" : type === "plugin" ? "plugins" : "skills";
}

function getBadgeInfo(score: number): string {
  if (score >= 90) return "official";
  if (score >= 80) return "verified";
  if (score >= 60) return "trusted";
  if (score >= 40) return "reviewed";
  return "new";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 60 requests/minute." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "lookup";

    // ═══════════════════════════════════════
    // ACTION: badge — Returns SVG image
    // ═══════════════════════════════════════
    if (action === "badge") {
      const slug = url.searchParams.get("slug");
      const type = url.searchParams.get("type") || "skill";
      if (!slug) {
        return new Response(generateBadgeSVG(0, "new", "unknown"), {
          headers: { ...corsHeaders, "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
        });
      }

      const tableName = getTableName(type);
      const { data: item } = await supabase
        .from(tableName)
        .select("trust_score, security_status")
        .eq("slug", slug)
        .eq("status", "approved")
        .single();

      const score = (item as any)?.trust_score || 0;
      const badge = getBadgeInfo(score);

      return new Response(generateBadgeSVG(score, badge, slug), {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    // ═══════════════════════════════════════
    // ACTION: search — List/search items
    // ═══════════════════════════════════════
    if (action === "search") {
      const q = url.searchParams.get("q") || "";
      const type = url.searchParams.get("type") || "skill";
      const minScore = parseInt(url.searchParams.get("min_score") || "0");
      const badgeFilter = url.searchParams.get("badge");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);

      const tableName = getTableName(type);

      let query = supabase
        .from(tableName)
        .select("slug, name, trust_score, security_status, security_scanned_at, created_at")
        .eq("status", "approved")
        .gte("trust_score", minScore)
        .order("trust_score", { ascending: false })
        .limit(limit);

      // For skills table, column is display_name not name
      if (type === "skill") {
        query = supabase
          .from(tableName)
          .select("slug, display_name, trust_score, security_status, security_scanned_at, created_at")
          .eq("status", "approved")
          .gte("trust_score", minScore)
          .order("trust_score", { ascending: false })
          .limit(limit);
      }

      if (q) {
        if (type === "skill") {
          query = query.ilike("display_name", `%${q}%`);
        } else {
          query = query.ilike("name", `%${q}%`);
        }
      }

      const { data: items, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = (items || []).map((item: any) => {
        const score = item.trust_score || 0;
        const badge = getBadgeInfo(score);
        if (badgeFilter && badge !== badgeFilter) return null;
        return {
          slug: item.slug,
          name: item.display_name || item.name,
          type,
          trust_score: score,
          badge,
          security_status: item.security_status,
          scanned_at: item.security_scanned_at,
        };
      }).filter(Boolean);

      return new Response(JSON.stringify({
        count: results.length,
        type,
        query: q || null,
        min_score: minScore,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      });
    }

    // ═══════════════════════════════════════
    // ACTION: lookup (default) — Single item
    // ═══════════════════════════════════════
    const slug = url.searchParams.get("slug");
    const type = url.searchParams.get("type") || "skill";

    if (!slug) {
      return new Response(JSON.stringify({
        api: "Pymaia Security Benchmark API",
        version: "2.0",
        docs: "https://pymaiaskills.lovable.app/api-docs",
        endpoints: {
          lookup: "GET ?slug=<slug>&type=<skill|connector|plugin>",
          search: "GET ?action=search&q=<query>&type=<type>&min_score=<0-100>&limit=<1-100>",
          badge: "GET ?action=badge&slug=<slug>&type=<type> → SVG image",
        },
        rate_limit: "60 requests/minute per IP",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tableName = getTableName(type);

    const { data: item, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("slug", slug)
      .eq("status", "approved")
      .single();

    if (error || !item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trustScore = (item as any).trust_score || 0;
    const badge = getBadgeInfo(trustScore);
    const scanDetails = extractScanDetails((item as any).security_scan_result);

    const baseUrl = Deno.env.get("SUPABASE_URL")!;

    return new Response(JSON.stringify({
      slug: (item as any).slug,
      name: (item as any).display_name || (item as any).name,
      type,
      trust_score: trustScore,
      badge,
      security_status: (item as any).security_status,
      scanned_at: (item as any).security_scanned_at,
      is_official: (item as any).is_official || false,
      scan_details: scanDetails,
      badge_svg: `${baseUrl}/functions/v1/trust-score-api?action=badge&slug=${slug}&type=${type}`,
      badge_markdown: `![Pymaia Trust Score](${baseUrl}/functions/v1/trust-score-api?action=badge&slug=${slug}&type=${type})`,
      docs: "https://pymaiaskills.lovable.app/api-docs",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
