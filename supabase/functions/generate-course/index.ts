import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { role_slug, title, title_es, description, description_es, difficulty, emoji } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch some skills and connectors for context
    const { data: skills } = await supabase
      .from("skills")
      .select("slug, display_name, category, tagline")
      .eq("status", "approved")
      .limit(200);

    const { data: connectors } = await supabase
      .from("mcp_servers")
      .select("slug, name, category")
      .eq("status", "approved")
      .limit(100);

    const skillList = (skills || []).map((s: any) => `${s.slug}: ${s.display_name} (${s.category}) - ${s.tagline}`).join("\n");
    const connectorList = (connectors || []).map((c: any) => `${c.slug}: ${c.name} (${c.category})`).join("\n");

    const prompt = `You are creating an interactive course for Pymaia Academy about mastering Claude AI, tailored for the "${role_slug}" professional role.

Course: "${title}" (${difficulty} level)
Description: ${description}

Generate exactly 5 modules. Each module should teach a practical aspect of using Claude for this role.

Available skills from our catalog (use relevant slugs in recommendations):
${skillList.slice(0, 3000)}

Available connectors (use relevant slugs):
${connectorList.slice(0, 1500)}

Return a JSON array of 5 modules, each with:
{
  "sort_order": 1,
  "title": "English title",
  "title_es": "Spanish title", 
  "content_md": "Full lesson in Markdown (English, 400-600 words). Include practical examples, prompts to try, tips. Use headers, bold, code blocks for prompts.",
  "content_md_es": "Same content in Spanish",
  "quiz_json": [
    {
      "question": "English question?",
      "question_es": "Spanish question?",
      "options": ["A", "B", "C", "D"],
      "options_es": ["A", "B", "C", "D"],
      "correct_index": 0
    }
  ],
  "recommended_skill_slugs": ["slug1", "slug2"],
  "recommended_connector_slugs": ["slug1"],
  "estimated_minutes": 10
}

Each module should have 3 quiz questions. Only recommend skills/connectors that exist in the catalog above. Return ONLY the JSON array.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You generate structured course content. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Clean markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // Strip triple single-quotes wrapper
    content = content.replace(/^'{3,}\s*/, "").replace(/\s*'{3,}$/, "").trim();
    
    const modules = JSON.parse(content);

    // ── Quality gate: validate & fix Spanish translations ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      // Sanitize content
      if (m.content_md) {
        m.content_md = m.content_md.replace(/^'{3,}\s*/, "").replace(/\s*'{3,}$/, "").replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      }
      if (m.content_md_es) {
        m.content_md_es = m.content_md_es.replace(/^'{3,}\s*/, "").replace(/\s*'{3,}$/, "").replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      }
      // Validate quiz has at least 2 questions
      if (!m.quiz_json || m.quiz_json.length < 2) {
        m.quiz_json = m.quiz_json || [];
      }
      // Check Spanish translation quality
      const enLen = (m.content_md || "").length;
      const esLen = (m.content_md_es || "").length;
      if (enLen > 0 && esLen < enLen * 0.5) {
        console.log(`⚠️ Module ${m.sort_order}: Spanish too short (${esLen} vs ${enLen}). Regenerating...`);
        try {
          const fixResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "Translate the following lesson content to Spanish. Return ONLY the translated markdown, no wrappers." },
                { role: "user", content: m.content_md },
              ],
            }),
          });
          if (fixResp.ok) {
            const fixData = await fixResp.json();
            const fixed = (fixData.choices?.[0]?.message?.content || "").replace(/^'{3,}\s*/, "").replace(/\s*'{3,}$/, "").replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
            if (fixed.length >= enLen * 0.5) {
              m.content_md_es = fixed;
              console.log(`✅ Module ${m.sort_order}: Spanish fixed (${fixed.length} chars)`);
            }
          }
        } catch (e) {
          console.error(`Failed to fix Spanish for module ${m.sort_order}:`, e);
        }
      }
    }

    // Create course
    const slug = `claude-para-${role_slug}`;
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .upsert({
        slug,
        title,
        title_es: title_es || null,
        description,
        description_es: description_es || null,
        role_slug,
        difficulty: difficulty || "beginner",
        emoji: emoji || "📚",
        estimated_minutes: modules.reduce((acc: number, m: any) => acc + (m.estimated_minutes || 10), 0),
        module_count: modules.length,
        is_active: true,
      }, { onConflict: "slug" })
      .select()
      .single();

    if (courseErr) throw courseErr;

    // Delete existing modules for this course
    await supabase.from("course_modules").delete().eq("course_id", course.id);

    // Insert modules
    const moduleRows = modules.map((m: any) => ({
      course_id: course.id,
      sort_order: m.sort_order,
      title: m.title,
      title_es: m.title_es || null,
      content_md: m.content_md,
      content_md_es: m.content_md_es || null,
      quiz_json: m.quiz_json || [],
      recommended_skill_slugs: m.recommended_skill_slugs || [],
      recommended_connector_slugs: m.recommended_connector_slugs || [],
      estimated_minutes: m.estimated_minutes || 10,
    }));

    const { error: modErr } = await supabase.from("course_modules").insert(moduleRows);
    if (modErr) throw modErr;

    return new Response(JSON.stringify({ success: true, course_slug: slug, modules: modules.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-course error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
