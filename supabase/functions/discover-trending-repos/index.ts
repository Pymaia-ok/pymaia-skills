import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

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
          console.log("[trending] Rate limited, stopping searches");
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

          // Generate slug
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
          });
        }

        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        console.error(`[trending] Search error for "${query}":`, (e as Error).message);
      }
    }

    console.log(`[trending] Found ${discovered.length} new repos after dedup`);

    // Categorize and insert
    let inserted = 0;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    for (const repo of discovered) {
      try {
        let category = "desarrollo";
        // Quick AI categorization if available
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
          console.log(`[trending] Inserted ${repo.full_name} (${repo.stars}★, ${status})`);
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
      reason: `Searched ${searchQueries.length} queries, found ${discovered.length} new repos, inserted ${inserted}`,
    });

    return new Response(
      JSON.stringify({ success: true, searched: searchQueries.length, found: discovered.length, inserted }),
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
