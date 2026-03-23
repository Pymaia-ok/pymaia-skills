import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

/** Parse GitHub repo full_names from markdown/HTML content */
function extractRepoNames(text: string): string[] {
  const repos = new Set<string>();
  // Match github.com/{owner}/{repo} patterns
  const ghUrlRegex = /github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/g;
  let match;
  while ((match = ghUrlRegex.exec(text)) !== null) {
    const name = match[1].replace(/\.git$/, "").replace(/\/+$/, "");
    // Filter out non-repo paths
    if (!name.includes("/trending") && !name.includes("/topics") && !name.includes("/explore") && name.split("/").length === 2) {
      repos.add(name);
    }
  }
  return [...repos];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

    const { min_stars = 1000 } = await req.json().catch(() => ({}));

    // Build date filter: repos created or pushed in last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const searchQueries = [
      `stars:>${min_stars} pushed:>${since} topic:claude-code`,
      `stars:>${min_stars} pushed:>${since} topic:ai-agent`,
      `stars:>${min_stars} pushed:>${since} topic:mcp-server`,
      `"SKILL.md" stars:>500 pushed:>${since}`,
      `"claude code" stars:>500 created:>${since}`,
      `"ai agent" stars:>${min_stars} created:>${since}`,
      `"AI native" OR "agent native" OR "AI stack" stars:>500 created:>${since}`,
    ];

    // Get existing github_urls and slugs for dedup
    const { data: existingSkills } = await supabase
      .from("skills")
      .select("github_url, slug")
      .not("github_url", "is", null);
    const existingUrls = new Set(
      (existingSkills || []).map((s: any) => s.github_url?.toLowerCase().replace(/\.git$/, ""))
    );
    const existingSlugs = new Set((existingSkills || []).map((s: any) => s.slug));

    // Also check mcp_servers
    const { data: existingMcp } = await supabase
      .from("mcp_servers")
      .select("github_url")
      .not("github_url", "is", null);
    for (const m of existingMcp || []) {
      existingUrls.add(m.github_url?.toLowerCase().replace(/\.git$/, ""));
    }

    const discovered: any[] = [];
    const seenFullNames = new Set<string>();

    // ═══ SOURCE 1: GitHub Search API ═══
    for (const query of searchQueries) {
      try {
        const res = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Pymaia-Trending-Discovery",
            },
          }
        );

        if (res.status === 403) {
          console.log("[trending] Rate limited, stopping GitHub Search");
          await res.text();
          break;
        }
        if (!res.ok) {
          await res.text();
          continue;
        }

        const data = await res.json();
        for (const repo of data.items || []) {
          const fullName = repo.full_name;
          if (seenFullNames.has(fullName)) continue;
          seenFullNames.add(fullName);

          const ghUrl = `https://github.com/${fullName}`;
          if (existingUrls.has(ghUrl.toLowerCase())) continue;

          const baseSlug = fullName.replace("/", "-").toLowerCase().replace(/[^a-z0-9-]/g, "");
          if (existingSlugs.has(baseSlug)) continue;

          discovered.push({
            full_name: fullName,
            slug: baseSlug,
            name: repo.name,
            description: repo.description || "",
            stars: repo.stargazers_count || 0,
            github_url: ghUrl,
            language: repo.language || "Unknown",
            topics: repo.topics || [],
            source: "github_search",
          });
        }

        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        console.error(`[trending] Search error for "${query}":`, (e as Error).message);
      }
    }

    // ═══ SOURCE 2: Trendshift.io scraping via Firecrawl ═══
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (firecrawlKey) {
      for (const trendUrl of [
        "https://trendshift.io/repositories",
        "https://trendshift.io/repositories?language=TypeScript",
        "https://trendshift.io/repositories?language=Python",
      ]) {
        try {
          console.log(`[trending] Scraping ${trendUrl}`);
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: trendUrl,
              formats: ["markdown"],
              onlyMainContent: true,
              waitFor: 3000,
            }),
          });

          if (scrapeRes.ok) {
            const scrapeData = await scrapeRes.json();
            const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
            const repoNames = extractRepoNames(markdown);
            console.log(`[trending] Found ${repoNames.length} repos from ${trendUrl}`);

            for (const fullName of repoNames) {
              if (seenFullNames.has(fullName)) continue;
              seenFullNames.add(fullName);

              const ghUrl = `https://github.com/${fullName}`;
              if (existingUrls.has(ghUrl.toLowerCase())) continue;

              const baseSlug = fullName.replace("/", "-").toLowerCase().replace(/[^a-z0-9-]/g, "");
              if (existingSlugs.has(baseSlug)) continue;

              // Fetch repo metadata from GitHub API
              try {
                const repoRes = await fetch(`https://api.github.com/repos/${fullName}`, {
                  headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "Pymaia-Trending-Discovery",
                  },
                });
                if (repoRes.ok) {
                  const repo = await repoRes.json();
                  if (repo.archived) continue;
                  discovered.push({
                    full_name: fullName,
                    slug: baseSlug,
                    name: repo.name,
                    description: repo.description || "",
                    stars: repo.stargazers_count || 0,
                    github_url: ghUrl,
                    language: repo.language || "Unknown",
                    topics: repo.topics || [],
                    source: "trendshift",
                  });
                } else {
                  await repoRes.text();
                }
                await new Promise((r) => setTimeout(r, 500));
              } catch { /* skip */ }
            }
          } else {
            const errText = await scrapeRes.text();
            console.error(`[trending] Firecrawl error for ${trendUrl}:`, scrapeRes.status, errText.slice(0, 200));
          }
        } catch (e) {
          console.error(`[trending] Trendshift scrape error:`, (e as Error).message);
        }
      }

      // ═══ SOURCE 3: GitHub Trending page via Firecrawl ═══
      for (const ghTrendUrl of [
        "https://github.com/trending?since=daily",
        "https://github.com/trending?since=weekly",
        "https://github.com/trending/typescript?since=weekly",
        "https://github.com/trending/python?since=weekly",
      ]) {
        try {
          console.log(`[trending] Scraping ${ghTrendUrl}`);
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: ghTrendUrl,
              formats: ["markdown", "links"],
              onlyMainContent: true,
              waitFor: 2000,
            }),
          });

          if (scrapeRes.ok) {
            const scrapeData = await scrapeRes.json();
            const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
            const links = scrapeData.data?.links || scrapeData.links || [];
            
            // Extract from both markdown content and links array
            const fromMarkdown = extractRepoNames(markdown);
            const fromLinks = extractRepoNames(links.join(" "));
            const allRepoNames = [...new Set([...fromMarkdown, ...fromLinks])];
            console.log(`[trending] Found ${allRepoNames.length} repos from ${ghTrendUrl}`);

            for (const fullName of allRepoNames) {
              if (seenFullNames.has(fullName)) continue;
              seenFullNames.add(fullName);

              const ghUrl = `https://github.com/${fullName}`;
              if (existingUrls.has(ghUrl.toLowerCase())) continue;

              const baseSlug = fullName.replace("/", "-").toLowerCase().replace(/[^a-z0-9-]/g, "");
              if (existingSlugs.has(baseSlug)) continue;

              try {
                const repoRes = await fetch(`https://api.github.com/repos/${fullName}`, {
                  headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "Pymaia-Trending-Discovery",
                  },
                });
                if (repoRes.ok) {
                  const repo = await repoRes.json();
                  if (repo.archived) continue;
                  discovered.push({
                    full_name: fullName,
                    slug: baseSlug,
                    name: repo.name,
                    description: repo.description || "",
                    stars: repo.stargazers_count || 0,
                    github_url: ghUrl,
                    language: repo.language || "Unknown",
                    topics: repo.topics || [],
                    source: "github_trending",
                  });
                } else {
                  await repoRes.text();
                }
                await new Promise((r) => setTimeout(r, 500));
              } catch { /* skip */ }
            }
          } else {
            await scrapeRes.text();
          }
        } catch (e) {
          console.error(`[trending] GitHub Trending scrape error:`, (e as Error).message);
        }
      }
    } else {
      console.log("[trending] FIRECRAWL_API_KEY not set, skipping Trendshift + GitHub Trending scraping");
    }

    console.log(`[trending] Found ${discovered.length} new repos after dedup (GitHub Search + Trendshift + GitHub Trending)`);

    // Categorize and insert
    let inserted = 0;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const sourceCounts: Record<string, number> = {};

    for (const repo of discovered) {
      try {
        let category = "desarrollo";
        if (LOVABLE_API_KEY) {
          try {
            const catRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: "Classify this GitHub repo into ONE category. Reply with ONLY the category slug. Options: desarrollo, productividad, marketing, ventas, soporte, datos, diseño, legal, finanzas, seguridad, devops, educación, salud, rrhh, ecommerce, operaciones, comunicación" },
                  { role: "user", content: `${repo.name}: ${repo.description}. Topics: ${repo.topics.join(", ")}` },
                ],
              }),
            });
            if (catRes.ok) {
              const catData = await catRes.json();
              const cat = catData.choices?.[0]?.message?.content?.trim().toLowerCase();
              if (cat && cat.length < 30) category = cat;
            } else {
              await catRes.text();
            }
          } catch { /* use default */ }
        }

        const status = repo.stars >= 1000 ? "approved" : "pending";

        const { error } = await supabase.from("skills").insert({
          slug: repo.slug,
          display_name: repo.name,
          description_human: repo.description || `${repo.name} - GitHub repository with ${repo.stars} stars`,
          tagline: repo.description?.substring(0, 120) || repo.name,
          github_url: repo.github_url,
          github_stars: repo.stars,
          category,
          status,
          install_command: `git clone ${repo.github_url}`,
          install_count_source: "estimated",
        });

        if (!error) {
          inserted++;
          sourceCounts[repo.source] = (sourceCounts[repo.source] || 0) + 1;
          console.log(`[trending] Inserted ${repo.full_name} (${repo.stars}★, ${status}, src: ${repo.source})`);
        } else if (error.code !== "23505") {
          console.error(`[trending] Insert error for ${repo.full_name}:`, error.message);
        }
      } catch (e) {
        console.error(`[trending] Error processing ${repo.full_name}:`, (e as Error).message);
      }
    }

    await supabase.from("automation_logs").insert({
      function_name: "discover-trending-repos",
      action_type: "trending_discovery",
      reason: `Sources: GitHub Search(${sourceCounts.github_search || 0}), Trendshift(${sourceCounts.trendshift || 0}), GitHub Trending(${sourceCounts.github_trending || 0}). Found ${discovered.length}, inserted ${inserted}`,
    });

    return new Response(
      JSON.stringify({ success: true, searched: searchQueries.length, found: discovered.length, inserted, sources: sourceCounts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[trending] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
