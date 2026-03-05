import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { query, category, sort_by, page } = await req.json();
    if (!query || typeof query !== "string")
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY)
      throw new Error("LOVABLE_API_KEY not configured");

    // Ask AI to extract search keywords + category from the user intent
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You extract search parameters from user intent queries about AI agent skills/tools.
Given a user query describing what they want to do, return:
- keywords: 2-4 search terms that would match skill names/descriptions (in English, as that's the primary language of skill names)
- category: one of [ia, desarrollo, diseño, marketing, automatización, datos, creatividad, productividad, legal, negocios] or null
- roles: relevant roles from [developer, disenador, marketer, founder, consultor, otro] or empty array

Examples:
"quiero automatizar mis emails de ventas" -> keywords: ["email automation", "outbound", "sales"], category: "marketing", roles: ["marketer", "founder"]
"need to review Python PRs" -> keywords: ["python", "code review", "PR"], category: "desarrollo", roles: ["developer"]
"hacer diseños para redes sociales" -> keywords: ["social media", "design", "graphics"], category: "diseño", roles: ["disenador"]`,
            },
            { role: "user", content: query },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_search_params",
                description: "Extract search parameters from user intent",
                parameters: {
                  type: "object",
                  properties: {
                    keywords: {
                      type: "array",
                      items: { type: "string" },
                      description: "2-4 search terms",
                    },
                    category: {
                      type: "string",
                      nullable: true,
                      description: "Best matching category or null",
                    },
                    roles: {
                      type: "array",
                      items: { type: "string" },
                      description: "Relevant user roles",
                    },
                  },
                  required: ["keywords", "category", "roles"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_search_params" },
          },
        }),
      }
    );

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429)
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      if (status === 402)
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const params = JSON.parse(toolCall.function.arguments);
    const { keywords, category: aiCategory, roles } = params;

    // Search DB with each keyword and merge results
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const searchCategory = category || aiCategory || null;
    const pageNum = page ?? 0;

    // Run searches for each keyword in parallel
    const searchPromises = keywords.map((kw: string) =>
      supabase.rpc("search_skills", {
        search_query: kw,
        filter_category: searchCategory,
        filter_industry: null,
        filter_roles: roles?.length > 0 ? roles : null,
        sort_by: sort_by || "rating",
        page_num: 0,
        page_size: 50,
      })
    );

    const results = await Promise.all(searchPromises);

    // Merge and deduplicate, keeping highest similarity
    const skillMap = new Map<string, any>();
    for (const { data, error } of results) {
      if (error) {
        console.error("search error:", error);
        continue;
      }
      for (const row of data || []) {
        const existing = skillMap.get(row.id);
        if (!existing || row.similarity_score > existing.similarity_score) {
          skillMap.set(row.id, row);
        }
      }
    }

    // Sort by similarity and paginate
    const allSkills = Array.from(skillMap.values()).sort(
      (a, b) => b.similarity_score - a.similarity_score
    );

    const pageSize = 24;
    const start = pageNum * pageSize;
    const paged = allSkills.slice(start, start + pageSize);

    return new Response(
      JSON.stringify({
        data: paged,
        count: allSkills.length,
        keywords,
        ai_category: aiCategory,
        mode: "smart",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("smart-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
