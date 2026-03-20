// trust-score-api v2.0 — Public Security Benchmark API
// Endpoints: lookup, search, badge SVG
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

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
    // Supports: ?slug=X or ?github_url=https://github.com/org/repo
    // ═══════════════════════════════════════
    const slug = url.searchParams.get("slug");
    const githubUrlParam = url.searchParams.get("github_url");
    const type = url.searchParams.get("type") || "skill";

    if (!slug && !githubUrlParam) {
      return new Response(JSON.stringify({
        api: "Pymaia Security Benchmark API",
        version: "3.0",
        docs: "https://pymaiaskills.lovable.app/api-docs",
        endpoints: {
          lookup_by_slug: "GET ?slug=<slug>&type=<skill|connector|plugin>",
          lookup_by_github: "GET ?github_url=<github_repo_url> — searches all types, on-demand scan if not indexed",
          search: "GET ?action=search&q=<query>&type=<type>&min_score=<0-100>&limit=<1-100>",
          badge: "GET ?action=badge&slug=<slug>&type=<type> → SVG image",
        },
        rate_limit: "60 requests/minute per IP",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GitHub URL lookup (cross-table search + on-demand scan) ──
    if (githubUrlParam) {
      // Normalize the URL
      let normalizedUrl = githubUrlParam.trim().replace(/\/+$/, "");
      if (!normalizedUrl.startsWith("http")) normalizedUrl = `https://${normalizedUrl}`;

      // Extract org/repo for matching
      const ghMatch = normalizedUrl.match(/github\.com\/([^\/]+\/[^\/]+)/i);
      if (!ghMatch) {
        return new Response(JSON.stringify({ error: "Invalid GitHub URL. Expected format: https://github.com/org/repo" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const repoPath = ghMatch[1].toLowerCase();
      const searchPattern = `%${repoPath}%`;

      // Search across all 3 tables
      const [skillsRes, connectorsRes, pluginsRes] = await Promise.all([
        supabase.from("skills").select("*").eq("status", "approved").ilike("github_url", searchPattern).limit(1),
        supabase.from("mcp_servers").select("*").eq("status", "approved").ilike("github_url", searchPattern).limit(1),
        supabase.from("plugins").select("*").eq("status", "approved").ilike("github_url", searchPattern).limit(1),
      ]);

      // Find the first match
      let foundItem: any = null;
      let foundType = "";
      if (skillsRes.data?.length) { foundItem = skillsRes.data[0]; foundType = "skill"; }
      else if (connectorsRes.data?.length) { foundItem = connectorsRes.data[0]; foundType = "connector"; }
      else if (pluginsRes.data?.length) { foundItem = pluginsRes.data[0]; foundType = "plugin"; }

      if (foundItem) {
        // Found in our registry — return trust score
        const trustScore = foundItem.trust_score || 0;
        const badge = getBadgeInfo(trustScore);
        const scanDetails = extractScanDetails(foundItem.security_scan_result);
        const baseUrl = Deno.env.get("SUPABASE_URL")!;

        return new Response(JSON.stringify({
          source: "indexed",
          slug: foundItem.slug,
          name: foundItem.display_name || foundItem.name,
          type: foundType,
          trust_score: trustScore,
          badge,
          security_status: foundItem.security_status,
          scanned_at: foundItem.security_scanned_at,
          is_official: foundItem.is_official || false,
          github_url: foundItem.github_url,
          scan_details: scanDetails,
          badge_svg: `${baseUrl}/functions/v1/trust-score-api?action=badge&slug=${foundItem.slug}&type=${foundType}`,
          docs: "https://pymaiaskills.lovable.app/api-docs",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
        });
      }

      // ── NOT INDEXED: On-demand scan ──
      // Fetch README from GitHub to scan
      const githubToken = Deno.env.get("GITHUB_TOKEN");
      const apiUrl = `https://api.github.com/repos/${repoPath}`;

      const headers: Record<string, string> = { "Accept": "application/vnd.github.v3+json", "User-Agent": "Pymaia-Security-API" };
      if (githubToken) headers["Authorization"] = `token ${githubToken}`;

      const repoRes = await fetch(apiUrl, { headers });
      if (!repoRes.ok) {
        return new Response(JSON.stringify({
          error: "Repository not found on GitHub",
          github_url: normalizedUrl,
          suggestion: "Check the URL is correct and the repository is public.",
        }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const repoData = await repoRes.json();

      // Fetch README
      let readmeContent = "";
      try {
        const readmeRes = await fetch(`${apiUrl}/readme`, { headers: { ...headers, "Accept": "application/vnd.github.v3.raw" } });
        if (readmeRes.ok) readmeContent = await readmeRes.text();
      } catch { /* no readme */ }

      // Build scan content
      const scanContent = [
        repoData.name || "",
        repoData.description || "",
        readmeContent,
      ].join("\n\n");

      // Invoke scan-security in gate_mode
      const baseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const scanRes = await fetch(`${baseUrl}/functions/v1/scan-security`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          gate_mode: true,
          content: scanContent.slice(0, 50000), // cap at 50KB
          slug: repoPath.replace("/", "-"),
          item_type: "skill",
          github_url: normalizedUrl,
          install_command: "",
        }),
      });

      const scanResult = await scanRes.json();
      const scanDetails = extractScanDetails(scanResult);

      // If scan passes (SAFE), auto-index as a new skill
      let autoIndexed = false;
      let newSlug = "";
      if (scanResult.verdict === "SAFE") {
        newSlug = repoPath.replace("/", "-").toLowerCase().replace(/[^a-z0-9-]/g, "");

        // Check if slug already exists
        const { data: existing } = await supabase.from("skills").select("id").eq("slug", newSlug).single();

        if (!existing) {
          const { error: insertError } = await supabase.from("skills").insert({
            slug: newSlug,
            display_name: repoData.name || repoPath.split("/")[1],
            tagline: (repoData.description || "").slice(0, 200) || "Auto-indexed from GitHub",
            description_human: repoData.description || `Repository: ${repoPath}`,
            install_command: `npx @anthropic-ai/claude-code skill add ${normalizedUrl}`,
            github_url: normalizedUrl,
            github_stars: repoData.stargazers_count || 0,
            category: "general",
            status: "approved",
            security_status: "verified",
            security_scan_result: scanResult,
            security_scanned_at: new Date().toISOString(),
            readme_raw: readmeContent.slice(0, 100000) || null,
            auto_approved_reason: "On-demand scan via Security API — verdict SAFE",
          });

          if (!insertError) {
            autoIndexed = true;
            // Log the auto-indexing
            await supabase.from("automation_logs").insert({
              function_name: "trust-score-api",
              action_type: "auto_index",
              reason: `On-demand scan for ${normalizedUrl} — verdict SAFE, auto-indexed as ${newSlug}`,
              metadata: { github_url: normalizedUrl, verdict: scanResult.verdict },
            });
          }
        }
      }

      return new Response(JSON.stringify({
        source: autoIndexed ? "on_demand_indexed" : "on_demand_scan",
        github_url: normalizedUrl,
        repository: {
          name: repoData.name,
          full_name: repoData.full_name,
          description: repoData.description,
          stars: repoData.stargazers_count,
          language: repoData.language,
          created_at: repoData.created_at,
          updated_at: repoData.updated_at,
          archived: repoData.archived,
          fork: repoData.fork,
        },
        scan_verdict: scanResult.verdict,
        scan_details: scanDetails,
        ...(autoIndexed ? {
          slug: newSlug,
          message: "Repository passed security scan and has been auto-indexed in Pymaia Skills registry.",
          badge_svg: `${baseUrl}/functions/v1/trust-score-api?action=badge&slug=${newSlug}&type=skill`,
        } : {
          message: scanResult.verdict === "SAFE"
            ? "Repository passed security scan."
            : `Repository flagged as ${scanResult.verdict}. Review the scan details for more information.`,
        }),
        docs: "https://pymaiaskills.lovable.app/api-docs",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Standard slug lookup ──
    const tableName = getTableName(type);

    const { data: item, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("slug", slug!)
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
      source: "indexed",
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
