import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { batchSize = 20 } = await req.json().catch(() => ({}));

    // Fetch skills missing Spanish translations
    const { data: skills, error: fetchError } = await supabase
      .from("skills")
      .select("id, tagline, description_human")
      .is("tagline_es", null)
      .eq("status", "approved")
      .limit(batchSize);

    if (fetchError) throw fetchError;
    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ message: "No skills to translate", remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a single prompt with all skills for efficiency
    const skillsText = skills.map((s, i) => 
      `[${i}]\nTagline: ${s.tagline}\nDescription: ${s.description_human}`
    ).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a professional translator. Translate the following software tool taglines and descriptions from English to Spanish (Latin American). Keep technical terms, product names, and acronyms in English. Return ONLY a valid JSON array where each element has "index", "tagline_es", and "description_human_es". No markdown, no code fences.`,
          },
          { role: "user", content: skillsText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_translations",
              description: "Return the translated skills",
              parameters: {
                type: "object",
                properties: {
                  translations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number" },
                        tagline_es: { type: "string" },
                        description_human_es: { type: "string" },
                      },
                      required: ["index", "tagline_es", "description_human_es"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["translations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_translations" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { translations } = JSON.parse(toolCall.function.arguments);

    // Update each skill
    let updated = 0;
    for (const t of translations) {
      const skill = skills[t.index];
      if (!skill) continue;
      const { error: updateError } = await supabase
        .from("skills")
        .update({ tagline_es: t.tagline_es, description_human_es: t.description_human_es })
        .eq("id", skill.id);
      if (!updateError) updated++;
    }

    // Check remaining
    const { count } = await supabase
      .from("skills")
      .select("id", { count: "exact", head: true })
      .is("tagline_es", null)
      .eq("status", "approved");

    return new Response(
      JSON.stringify({ translated: updated, remaining: count ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate-skills error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
