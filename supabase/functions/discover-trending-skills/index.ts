import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { mode = "trending_search", time_range = "week", language = "", limit = 20 } = await req.json().catch(() => ({ mode: "intelligence" }));

    // ── PHASE 3: Intelligence Engine ──
    if (mode === "intelligence") {
      const results: any = {};

      // 1. Auto-generate goal templates from frequent unmatched queries
      const { data: feedback } = await supabase
        .from("recommendation_feedback")
        .select("goal, rating, matched_template_slug")
        .order("created_at", { ascending: false }).limit(500);

      const unmatchedGoals: Record<string, number> = {};
      for (const f of feedback || []) {
        if (!f.matched_template_slug) {
          const normalized = f.goal.toLowerCase().trim();
          unmatchedGoals[normalized] = (unmatchedGoals[normalized] || 0) + 1;
        }
      }

      const candidateGoals = Object.entries(unmatchedGoals)
        .filter(([_, count]) => count >= 3)
        .sort(([, a], [, b]) => b - a).slice(0, 5);

      const newTemplates: string[] = [];
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY && candidateGoals.length > 0) {
        for (const [goal, count] of candidateGoals) {
          try {
            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: "Generate a goal template JSON. Respond ONLY with valid JSON, no markdown." },
                  { role: "user", content: `Goal: "${goal}" (requested ${count}x). Return: {"slug":"kebab","display_name":"Title","domain":"sales|marketing|development|support|data|design|legal|operations|security|general","description":"2 sentences","triggers":["kw1","kw2"],"capabilities":[{"name":"Name","type":"data_source|content_generation|analysis|action_execution|workflow|planning|tool","required":true,"keywords":["term"]}]}` },
                ],
              }),
            });
            if (response.ok) {
              const data = await response.json();
              const content = data.choices[0].message.content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
              const t = JSON.parse(content);
              if (t.slug && t.display_name && t.triggers?.length > 0) {
                const { error } = await supabase.from("goal_templates").insert({ slug: t.slug, display_name: t.display_name, domain: t.domain || "general", description: t.description || "", triggers: t.triggers, capabilities: t.capabilities || [], example_solutions: [], is_active: true });
                if (!error) newTemplates.push(t.slug);
              }
            }
          } catch (e) { console.error(`Template gen failed for "${goal}":`, e); }
        }
      }
      results.auto_templates = { unmatched_goals: candidateGoals.length, generated: newTemplates };

      // 2. Co-installation analysis
      const { data: installations } = await supabase.from("installations").select("user_id, skill_id").order("created_at", { ascending: false }).limit(1000);
      const userInstalls: Record<string, string[]> = {};
      for (const inst of installations || []) {
        if (!userInstalls[inst.user_id]) userInstalls[inst.user_id] = [];
        userInstalls[inst.user_id].push(inst.skill_id);
      }

      const pairCounts: Record<string, number> = {};
      for (const skills of Object.values(userInstalls)) {
        if (skills.length < 2) continue;
        for (let i = 0; i < skills.length; i++) {
          for (let j = i + 1; j < skills.length; j++) {
            const key = [skills[i], skills[j]].sort().join("|");
            pairCounts[key] = (pairCounts[key] || 0) + 1;
          }
        }
      }

      const topPairs = Object.entries(pairCounts).filter(([_, c]) => c >= 3).sort(([, a], [, b]) => b - a).slice(0, 20);
      let newCompat = 0;
      for (const [pairKey, count] of topPairs) {
        const [idA, idB] = pairKey.split("|");
        const [{ data: sA }, { data: sB }] = await Promise.all([
          supabase.from("skills").select("slug, display_name").eq("id", idA).maybeSingle(),
          supabase.from("skills").select("slug, display_name").eq("id", idB).maybeSingle(),
        ]);
        if (!sA || !sB) continue;
        const { data: existing } = await supabase.from("compatibility_matrix").select("id")
          .or(`and(item_a_slug.eq.${sA.slug},item_b_slug.eq.${sB.slug}),and(item_a_slug.eq.${sB.slug},item_b_slug.eq.${sA.slug})`).limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from("compatibility_matrix").insert({ item_a_slug: sA.slug, item_a_type: "skill", item_b_slug: sB.slug, item_b_type: "skill", status: "compatible", reason: `Co-installed ${count}x by different users`, data_flow: `${sA.display_name} ↔ ${sB.display_name}` });
          newCompat++;
        }
      }
      results.co_install = { users: Object.keys(userInstalls).length, pairs: topPairs.length, new_entries: newCompat };

      // 3. Trending analysis
      const { data: recentFeedback } = await supabase.from("recommendation_feedback").select("goal, rating, chosen_option, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(200);
      const goalScores: Record<string, { count: number; ratings: number[] }> = {};
      for (const f of recentFeedback || []) {
        const n = f.goal.toLowerCase().trim();
        if (!goalScores[n]) goalScores[n] = { count: 0, ratings: [] };
        goalScores[n].count++;
        if (f.rating) goalScores[n].ratings.push(f.rating);
      }
      results.trending = Object.entries(goalScores)
        .sort(([, a], [, b]) => (b.count * (b.ratings.length > 0 ? b.ratings.reduce((x, y) => x + y, 0) / b.ratings.length : 1)) - (a.count * (a.ratings.length > 0 ? a.ratings.reduce((x, y) => x + y, 0) / a.ratings.length : 1)))
        .slice(0, 10).map(([goal, data]) => ({ goal, count: data.count, avg_rating: data.ratings.length > 0 ? Math.round(data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length * 10) / 10 : null }));

      const { data: topTemplates } = await supabase.from("goal_templates").select("slug, display_name, domain, usage_count").eq("is_active", true).order("usage_count", { ascending: false }).limit(10);
      results.top_templates = topTemplates;

      await supabase.from("automation_logs").insert({ function_name: "discover-trending-skills", action_type: "intelligence_run", reason: `Templates: ${newTemplates.length}, Compat: ${newCompat}, Trending: ${results.trending.length}` });

      return new Response(JSON.stringify({ success: true, ...results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Legacy: GitHub trending search ──
    if (mode === "trending_search") {
      const githubToken = Deno.env.get("GITHUB_TOKEN");
      if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

      const searches = [
        "SKILL.md anthropic claude agent skills",
        "mcp server model context protocol",
        language ? `SKILL.md ${language}` : "SKILL.md react typescript nextjs",
      ];

      const trending: any[] = [];
      for (const searchTerm of searches) {
        try {
          const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(searchTerm)}&sort=stars&order=desc&per_page=10`, {
            headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github.v3+json", "User-Agent": "Pymaia-Skills-Discovery" },
          });
          if (!response.ok) { await response.text(); continue; }
          const data = await response.json();
          for (const repo of data.items || []) {
            if (repo.stargazers_count > 50) {
              trending.push({ name: repo.name, full_name: repo.full_name, description: repo.description || "", html_url: repo.html_url, stargazers_count: repo.stargazers_count, language: repo.language || "Unknown", topics: repo.topics || [], updated_at: repo.updated_at });
            }
          }
          await new Promise(r => setTimeout(r, 100));
        } catch (e) { console.error(`Search error "${searchTerm}":`, e); }
      }

      const unique = trending.filter((s, i, self) => i === self.findIndex(t => t.full_name === s.full_name)).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, limit);
      return new Response(JSON.stringify({ success: true, trending: unique, total_found: unique.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Mode not supported: " + mode);
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
