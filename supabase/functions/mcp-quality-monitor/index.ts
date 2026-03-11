import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const results = { empty_results: 0, low_ratings: 0, keyword_gaps: 0, templates_created: 0 };

    // ── 1. Find solve_goal events with poor results (last 24h) ──
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentEvents, error: fetchErr } = await supabase
      .from("agent_analytics")
      .select("goal, event_data, created_at")
      .eq("event_type", "solve_goal")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    

    if (!recentEvents || recentEvents.length === 0) {
      console.log(JSON.stringify({ monitor: "no_events", since }));
      return new Response(JSON.stringify({ success: true, message: "No recent events", ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Detect empty result patterns ──
    const emptyResultGoals: { goal: string; data: any }[] = [];
    const allGoals: Map<string, number> = new Map();

    for (const event of recentEvents) {
      const goal = event.goal || "";
      const data = event.event_data as any;
      allGoals.set(goal, (allGoals.get(goal) || 0) + 1);

      const totalResults = (data?.skills_count || 0) + (data?.connectors_count || 0) + (data?.plugins_count || 0);
      if (totalResults < 3 && goal.length > 3) {
        emptyResultGoals.push({ goal, data });
      }
    }

    // Insert empty result insights
    for (const { goal, data } of emptyResultGoals.slice(0, 10)) {
      const { error } = await supabase.from("quality_insights").insert({
        insight_type: "empty_results",
        goal,
        details: {
          skills_count: data?.skills_count || 0,
          connectors_count: data?.connectors_count || 0,
          plugins_count: data?.plugins_count || 0,
          keywords: data?.keywords || [],
          template_matched: data?.template_slug || null,
        },
      });
      if (!error) results.empty_results++;
    }

    // ── 3. Analyze low-rated recommendations ──
    const { data: lowRatings } = await supabase
      .from("recommendation_feedback")
      .select("goal, rating, recommended_slugs, matched_template_slug, comment")
      .gte("created_at", since)
      .not("rating", "is", null)
      .lte("rating", 2)
      .limit(20);

    if (lowRatings) {
      for (const fb of lowRatings) {
        await supabase.from("quality_insights").insert({
          insight_type: "low_rating",
          goal: fb.goal,
          details: {
            rating: fb.rating,
            recommended_slugs: fb.recommended_slugs,
            matched_template: fb.matched_template_slug,
            comment: fb.comment,
          },
        });
        results.low_ratings++;
      }
    }

    // ── 4. Detect keyword gaps (frequent goals with no template match) ──
    const unmatchedGoals: { goal: string; count: number }[] = [];
    for (const event of recentEvents) {
      const data = event.event_data as any;
      if (!data?.template_slug && event.goal && event.goal.length > 5) {
        const goal = event.goal.toLowerCase().trim();
        const existing = unmatchedGoals.find(g => g.goal === goal);
        if (existing) existing.count++;
        else unmatchedGoals.push({ goal, count: 1 });
      }
    }

    const frequentUnmatched = unmatchedGoals
      .filter(g => g.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    for (const { goal, count } of frequentUnmatched) {
      await supabase.from("quality_insights").insert({
        insight_type: "keyword_gap",
        goal,
        details: { frequency: count, suggestion: "Consider creating a goal template for this query" },
      });
      results.keyword_gaps++;
    }

    // ── 5. Use AI to suggest template improvements for top gaps ──
    if (LOVABLE_API_KEY && frequentUnmatched.length > 0) {
      try {
        const gapSummary = frequentUnmatched.map(g => `"${g.goal}" (${g.count}x)`).join(", ");
        const emptyGoals = emptyResultGoals.slice(0, 5).map(g => `"${g.goal}"`).join(", ");

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
              content: `Analyze these user queries to an AI tool recommendation engine that had poor results.

Unmatched queries (no template): ${gapSummary}
Empty/low results: ${emptyGoals}

For each, suggest:
1. A goal_template slug (kebab-case)
2. 3-5 trigger keywords that should match this goal
3. Required capabilities (e.g., "email sending", "CRM integration")

Return JSON array: [{"slug":"...","triggers":["..."],"capabilities":["..."],"display_name":"..."}]
Only return the JSON array, no markdown.`
            }],
            tools: [{
              type: "function",
              function: {
                name: "suggest_templates",
                description: "Suggest new goal templates",
                parameters: {
                  type: "object",
                  properties: {
                    templates: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          slug: { type: "string" },
                          display_name: { type: "string" },
                          triggers: { type: "array", items: { type: "string" } },
                          capabilities: { type: "array", items: { type: "string" } },
                        },
                        required: ["slug", "display_name", "triggers", "capabilities"],
                      },
                    },
                  },
                  required: ["templates"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "suggest_templates" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            const suggestions = parsed.templates || [];

            for (const tpl of suggestions.slice(0, 3)) {
              // Check if template already exists
              const { data: existing } = await supabase
                .from("goal_templates")
                .select("id")
                .eq("slug", tpl.slug)
                .maybeSingle();

              if (!existing) {
                const { error } = await supabase.from("goal_templates").insert({
                  slug: tpl.slug,
                  display_name: tpl.display_name,
                  triggers: tpl.triggers,
                  capabilities: tpl.capabilities,
                  domain: "ai-suggested",
                  description: `Auto-generated from quality monitor. Queries: ${gapSummary}`,
                  is_active: false, // Needs admin review
                });

                if (!error) {
                  results.templates_created++;
                  await supabase.from("quality_insights").insert({
                    insight_type: "missing_template",
                    goal: tpl.display_name,
                    details: { slug: tpl.slug, triggers: tpl.triggers, capabilities: tpl.capabilities },
                    action_taken: `Created inactive template "${tpl.slug}" for admin review`,
                  });
                }
              }
            }
          }
        }
      } catch (aiErr) {
        console.error("AI analysis failed:", (aiErr as Error).message);
      }
    }

    // ── 6. Log summary ──
    await supabase.from("automation_logs").insert({
      action_type: "quality_monitor",
      function_name: "mcp-quality-monitor",
      reason: `Analyzed ${recentEvents.length} events: ${results.empty_results} empty, ${results.low_ratings} low-rated, ${results.keyword_gaps} gaps, ${results.templates_created} templates created`,
    });

    console.log(JSON.stringify({ monitor: "complete", events_analyzed: recentEvents.length, ...results }));

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quality-monitor error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
