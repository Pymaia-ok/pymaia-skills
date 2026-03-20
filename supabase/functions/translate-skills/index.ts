import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { batchSize = 15 } = await req.json().catch(() => ({}));

    // Fetch skills missing ANY Spanish translation (including readme_summary_es)
    const { data: skills, error: fetchError } = await supabase
      .from("skills")
      .select("id, display_name, tagline, description_human, readme_summary, display_name_es, tagline_es, description_human_es, readme_summary_es")
      .eq("status", "approved")
      .or("display_name_es.is.null,tagline_es.is.null,description_human_es.is.null,readme_summary_es.is.null")
      .limit(batchSize);

    if (fetchError) throw fetchError;
    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ message: "No skills to translate", remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt - only include fields that need translation
    const skillsText = skills.map((s: any, i: number) => {
      const parts = [`[${i}]`];
      if (!s.display_name_es) parts.push(`Name: ${s.display_name}`);
      if (!s.tagline_es) parts.push(`Tagline: ${(s.tagline || "").slice(0, 200)}`);
      if (!s.description_human_es) parts.push(`Description: ${(s.description_human || "").slice(0, 300)}`);
      if (!s.readme_summary_es && s.readme_summary) parts.push(`Summary: ${(s.readme_summary || "").slice(0, 800)}`);
      return parts.join("\n");
    }).join("\n\n");

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
            content: `Translate software tool names, taglines, descriptions and markdown summaries to Spanish (Latin American). Keep technical terms, product names, acronyms in English. For names: translate descriptive parts but keep proper nouns. For summaries: preserve the exact Markdown formatting (##, **, -, etc.) and only translate the text. Return via tool call. Be concise.`,
          },
          { role: "user", content: skillsText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_translations",
              description: "Return translated skills",
              parameters: {
                type: "object",
                properties: {
                  t: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        i: { type: "number", description: "index" },
                        n: { type: "string", description: "display_name_es" },
                        tl: { type: "string", description: "tagline_es" },
                        d: { type: "string", description: "description_human_es" },
                        s: { type: "string", description: "readme_summary_es (full markdown preserved)" },
                      },
                      required: ["i"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["t"],
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

    const parsed = JSON.parse(toolCall.function.arguments);
    const translations = parsed.t || parsed.translations || [];

    // Batch update
    let updated = 0;
    const updatePromises = translations.map((tr: any) => {
      const idx = tr.i ?? tr.index;
      const skill = skills[idx] as any;
      if (!skill) return Promise.resolve();
      const updates: Record<string, string> = {};
      if (!skill.display_name_es && (tr.n || tr.display_name_es)) updates.display_name_es = tr.n || tr.display_name_es;
      if (!skill.tagline_es && (tr.tl || tr.tagline_es)) updates.tagline_es = tr.tl || tr.tagline_es;
      if (!skill.description_human_es && (tr.d || tr.description_human_es)) updates.description_human_es = tr.d || tr.description_human_es;
      if (!skill.readme_summary_es && (tr.s || tr.readme_summary_es)) updates.readme_summary_es = tr.s || tr.readme_summary_es;
      if (Object.keys(updates).length === 0) return Promise.resolve();
      return supabase.from("skills").update(updates).eq("id", skill.id).then(({ error }: any) => {
        if (!error) updated++;
      });
    });

    await Promise.all(updatePromises);

    return new Response(
      JSON.stringify({ translated: updated, remaining: -1 }),
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
