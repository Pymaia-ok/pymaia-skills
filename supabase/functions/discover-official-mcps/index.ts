import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RUNTIME = 50_000; // 50s guard
const started = Date.now();
const timeLeft = () => MAX_RUNTIME - (Date.now() - started);

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

// ─── Strategy 1: Check Watchlist (GitHub org repos + endpoint probing) ───
async function checkWatchlist(supabase: any, githubToken: string) {
  const { data: companies } = await supabase
    .from("mcp_discovery_watchlist")
    .select("*")
    .eq("status", "watching")
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(15); // process 15 per run

  if (!companies?.length) return { checked: 0, found: 0 };

  let found = 0;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pymaia-discovery",
  };
  if (githubToken) headers["Authorization"] = `token ${githubToken}`;

  for (const company of companies) {
    if (timeLeft() < 5000) break;

    let discoveredRepo: string | null = null;
    let discoveredUrl: string | null = null;
    let notes = "";

    // 1a. Search GitHub org for MCP repos
    if (company.github_org) {
      try {
        const q = encodeURIComponent(`mcp in:name org:${company.github_org}`);
        const res = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=5`, { headers });
        if (res.ok) {
          const data = await res.json();
          const repos = (data.items || []).filter((r: any) =>
            !r.archived && !r.disabled && r.name.toLowerCase().includes("mcp")
          );
          if (repos.length > 0) {
            const best = repos[0];
            discoveredRepo = best.html_url;
            notes = `GitHub: ${best.full_name} (${best.stargazers_count}⭐)`;

            // Check if already in catalog
            const repoSlug = slugify(best.name);
            const { data: existing } = await supabase
              .from("mcp_servers")
              .select("id")
              .eq("slug", repoSlug)
              .maybeSingle();

            if (!existing) {
              // Extract install info
              const stars = best.stargazers_count || 0;
              const status = stars > 500 ? "approved" : "pending";
              const installCmd = best.homepage?.includes("/mcp")
                ? `npx -y mcp-remote ${best.homepage}`
                : "";

              await supabase.from("mcp_servers").upsert({
                slug: repoSlug,
                name: company.company_name,
                description: best.description || `${company.company_name} MCP server`,
                category: "general",
                status,
                homepage: best.homepage || best.html_url,
                github_url: best.html_url,
                source: "auto-discovery",
                is_official: true,
                install_command: installCmd,
                credentials_needed: [],
                install_count: 0,
                external_use_count: stars,
              }, { onConflict: "slug", ignoreDuplicates: true });

              found++;
              notes += ` → indexed as ${status}`;
            } else {
              notes += " → already in catalog";
            }
          }
        }
        await new Promise(r => setTimeout(r, 200)); // rate limit
      } catch (e) {
        notes += ` GitHub search error: ${(e as Error).message}`;
      }
    }

    // 1b. Probe known MCP endpoint patterns
    if (!discoveredRepo && company.domain) {
      const probeUrls = [
        `https://api.${company.domain}/mcp`,
        `https://${company.domain}/mcp`,
      ];
      if (company.docs_url) {
        probeUrls.push(`${company.docs_url.replace(/\/$/, "")}/modelcontextprotocol`);
      }

      for (const url of probeUrls) {
        if (timeLeft() < 3000) break;
        try {
          const res = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            signal: AbortSignal.timeout(5000),
          });
          // MCP endpoints typically return 200 or 405 (POST only)
          if (res.ok || res.status === 405) {
            discoveredUrl = url;
            notes += ` Endpoint found: ${url} (${res.status})`;
            break;
          }
        } catch {
          // timeout or network error - expected for most probes
        }
      }
    }

    // Update watchlist entry
    const updateData: any = {
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (discoveredRepo || discoveredUrl) {
      updateData.status = "found";
      if (discoveredRepo) updateData.discovered_repo_url = discoveredRepo;
      if (discoveredUrl) updateData.discovered_mcp_url = discoveredUrl;
    }
    if (notes) updateData.notes = notes;

    await supabase
      .from("mcp_discovery_watchlist")
      .update(updateData)
      .eq("id", company.id);
  }

  return { checked: companies.length, found };
}

// ─── Strategy 2: GitHub Search for high-star MCP repos ───
async function githubSearch(supabase: any, githubToken: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pymaia-discovery",
  };
  if (githubToken) headers["Authorization"] = `token ${githubToken}`;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const queries = [
    `topic:mcp-server stars:>100 pushed:>${thirtyDaysAgo}`,
    `"modelcontextprotocol" in:readme stars:>50 created:>${thirtyDaysAgo}`,
    `mcp-server in:name stars:>200 pushed:>${thirtyDaysAgo}`,
  ];

  let totalFound = 0;

  for (const q of queries) {
    if (timeLeft() < 5000) break;

    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=20`,
        { headers }
      );
      if (!res.ok) {
        console.error(`GitHub search error ${res.status} for query: ${q}`);
        continue;
      }

      const data = await res.json();
      const repos = (data.items || []).filter((r: any) => !r.archived && !r.disabled);

      for (const repo of repos) {
        if (timeLeft() < 2000) break;

        const slug = slugify(repo.name);
        if (slug.length < 2) continue;

        // Check if already exists
        const { data: existing } = await supabase
          .from("mcp_servers")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existing) continue;

        // Also check by github_url
        const { data: existsByUrl } = await supabase
          .from("mcp_servers")
          .select("id")
          .eq("github_url", repo.html_url)
          .maybeSingle();

        if (existsByUrl) continue;

        const stars = repo.stargazers_count || 0;
        const isVerifiedOrg = repo.owner?.type === "Organization";
        const status = (stars > 500 && isVerifiedOrg) ? "approved" : "pending";

        const name = repo.name
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
          .replace(/\bMcp\b/g, "MCP")
          .replace(/\bApi\b/g, "API")
          .replace(/\bAi\b/g, "AI");

        await supabase.from("mcp_servers").upsert({
          slug,
          name,
          description: (repo.description || `${name} MCP server`).slice(0, 1000),
          category: "general",
          status,
          homepage: repo.homepage || repo.html_url,
          github_url: repo.html_url,
          source: "auto-discovery",
          is_official: isVerifiedOrg,
          install_command: "",
          credentials_needed: [],
          install_count: 0,
          external_use_count: stars,
        }, { onConflict: "slug", ignoreDuplicates: true });

        totalFound++;
      }

      await new Promise(r => setTimeout(r, 500)); // rate limit between queries
    } catch (e) {
      console.error(`GitHub search error: ${(e as Error).message}`);
    }
  }

  return { queries_run: queries.length, found: totalFound };
}

// ─── Strategy 3: AI-Powered Watchlist Expansion ───
async function aiExpandWatchlist(supabase: any) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return { error: "LOVABLE_API_KEY not set", added: 0 };

  // Get existing companies to avoid duplicates
  const { data: existing } = await supabase
    .from("mcp_discovery_watchlist")
    .select("domain");
  const existingDomains = new Set((existing || []).map((e: any) => e.domain));

  const prompt = `You are an expert on the AI tools ecosystem. List 20 SaaS companies that are likely to have or soon release an MCP (Model Context Protocol) server integration. Focus on:
1. Companies with existing API platforms and developer ecosystems
2. Companies in AI/ML, developer tools, productivity, and data spaces
3. Companies that have been actively integrating with AI assistants

For each company, provide EXACTLY this JSON format (no markdown, no explanation):
[{"company_name":"Example","domain":"example.com","github_org":"example-org","docs_url":"https://docs.example.com"}]

Do NOT include companies already in this list: ${Array.from(existingDomains).slice(0, 50).join(", ")}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) return { error: `AI API ${res.status}`, added: 0 };

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { error: "No JSON found in AI response", added: 0 };

    const suggestions = JSON.parse(jsonMatch[0]);
    let added = 0;

    for (const s of suggestions) {
      if (!s.domain || !s.company_name) continue;
      if (existingDomains.has(s.domain)) continue;

      const { error } = await supabase.from("mcp_discovery_watchlist").insert({
        company_name: s.company_name,
        domain: s.domain,
        github_org: s.github_org || null,
        docs_url: s.docs_url || null,
        status: "watching",
      });

      if (!error) added++;
    }

    return { suggestions_received: suggestions.length, added };
  } catch (e) {
    return { error: (e as Error).message, added: 0 };
  }
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "check_watchlist";

    let result: any;

    switch (mode) {
      case "check_watchlist":
        result = await checkWatchlist(supabase, githubToken);
        break;
      case "github_search":
        result = await githubSearch(supabase, githubToken);
        break;
      case "ai_expand_watchlist":
        result = await aiExpandWatchlist(supabase);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Log result
    await supabase.from("automation_logs").insert({
      function_name: "discover-official-mcps",
      action_type: mode,
      reason: JSON.stringify(result).slice(0, 500),
      metadata: result,
    });

    return new Response(JSON.stringify({ mode, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Discovery error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
