import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Quality gate: validates a single module meets minimum standards ──
function passesQualityGate(m: any): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const content = m.content_md || "";
  if (content.length < 1200) reasons.push(`content too short (${content.length} < 1200)`);
  const paragraphs = (content.match(/\n\n/g) || []).length;
  if (paragraphs < 3) reasons.push(`too few paragraphs (${paragraphs} < 3)`);
  const quizCount = (m.quiz_json || []).length;
  if (quizCount < 2) reasons.push(`too few quiz questions (${quizCount} < 2)`);
  const hasInteractive = /:::(tryit|step|tip|warning|info|zap)/.test(content);
  if (!hasInteractive) reasons.push("no interactive blocks");
  return { pass: reasons.length === 0, reasons };
}

// ── Sanitize LLM output ──
function sanitizeContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/^'{3,}\s*/, "").replace(/\s*'{3,}$/, "")
    .replace(/^```(?:markdown|md)?\s*\n?/, "").replace(/\n?```\s*$/, "")
    .replace(/,\s*(?:content_es|meta_description_en|content_md_es)\s*=.*$/s, "")
    .trim();
}

// ── Build the course generation prompt ──
function buildModulePrompt(role_slug: string, title: string, description: string, difficulty: string, skillList: string, connectorList: string) {
  return `You are creating an interactive course for Pymaia Academy about mastering Claude AI, tailored for the "${role_slug}" professional role.

Course: "${title}" (${difficulty} level)
Description: ${description}

Generate exactly 5 modules. Each module MUST follow this structure:
1. **Introduction paragraph** (3-4 sentences explaining WHAT you'll learn and WHY it matters for this role)
2. **Core concepts** with ### headings, explanations with examples (NOT just prompts)
3. **Practical exercise** using :::tryit block with a real-world prompt
4. **Pro tip** using :::tip block with expert advice
5. **Quiz** with exactly 3 questions testing comprehension

CRITICAL FORMATTING RULES:
- Use \\n\\n (double newline) between EVERY section and paragraph
- Each module MUST be 400-600 words of REAL educational content
- Include at least 2 interactive blocks (:::tryit, :::step, :::tip, :::warning)
- NEVER just wrap a single prompt in :::tryit — explain the concepts FIRST
- Content must be pedagogical: explain WHY, WHEN, and HOW to adapt techniques

Interactive block syntax:
:::tryit{title="Exercise title"}
Content here with the prompt to try
:::

:::tip{title="Pro Tip"}
Useful advice
:::

:::step{n=1 title="Step title"}
Step content
:::

Available skills from our catalog (use relevant slugs in recommendations):
${skillList.slice(0, 3000)}

Available connectors (use relevant slugs):
${connectorList.slice(0, 1500)}

Return a JSON array of 5 modules:
{
  "sort_order": 1,
  "title": "English title",
  "title_es": "Spanish title",
  "content_md": "Full lesson in Markdown (English, 400-600 words). MUST include \\n\\n between paragraphs.",
  "content_md_es": "Same content fully translated to Spanish with equal quality",
  "quiz_json": [
    {"question": "Q?", "question_es": "P?", "options": ["A","B","C","D"], "options_es": ["A","B","C","D"], "correct_index": 0},
    {"question": "Q?", "question_es": "P?", "options": ["A","B","C","D"], "options_es": ["A","B","C","D"], "correct_index": 1},
    {"question": "Q?", "question_es": "P?", "options": ["A","B","C","D"], "options_es": ["A","B","C","D"], "correct_index": 2}
  ],
  "recommended_skill_slugs": ["slug1", "slug2"],
  "recommended_connector_slugs": ["slug1"],
  "estimated_minutes": 10
}

Only recommend skills/connectors that exist in the catalog above. Return ONLY the JSON array.`;
}

// ── Regenerate a single failing module ──
async function regenerateSingleModule(
  m: any, reasons: string[], role_slug: string, difficulty: string, apiKey: string
): Promise<any> {
  const fixPrompt = `Fix this course module for a ${difficulty}-level ${role_slug} course. Issues: ${reasons.join(", ")}.

Current content (improve it, don't start from scratch):
${(m.content_md || "").slice(0, 2000)}

Requirements:
- 400-600 words of educational content
- Use \\n\\n between every paragraph
- Include at least 2 interactive blocks (:::tryit, :::tip, :::step)
- Must have exactly 3 quiz questions
- Content must explain concepts, not just provide prompts

Return a JSON object with: content_md, content_md_es, quiz_json (array of 3 questions with question, question_es, options, options_es, correct_index)`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You fix course module content. Return only valid JSON." },
        { role: "user", content: fixPrompt },
      ],
    }),
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  let content = (data.choices?.[0]?.message?.content || "")
    .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  content = sanitizeContent(content);
  try {
    return JSON.parse(content);
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { role_slug, title, title_es, description, description_es, difficulty, emoji, mode, course_slug } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── FIX-TRANSLATIONS MODE ──
    if (mode === "fix-translations") {
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id, sort_order, content_md, content_md_es, title, title_es")
        .order("sort_order");

      let fixed = 0;
      for (const m of (modules || [])) {
        const enLen = (m.content_md || "").length;
        const esLen = (m.content_md_es || "").length;
        if (enLen > 0 && esLen < enLen * 0.5) {
          try {
            const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: "Translate the following lesson content to Spanish. Return ONLY the translated markdown." },
                  { role: "user", content: m.content_md },
                ],
              }),
            });
            if (resp.ok) {
              const data = await resp.json();
              const translated = sanitizeContent(data.choices?.[0]?.message?.content || "");
              if (translated.length >= enLen * 0.5) {
                await supabase.from("course_modules").update({ content_md_es: translated }).eq("id", m.id);
                fixed++;
              }
            }
          } catch (e) { console.error(`Fix translation error module ${m.id}:`, e); }
        }
      }
      return new Response(JSON.stringify({ success: true, fixed, total: (modules || []).length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── REGENERATE-COURSE MODE: only fix failing modules ──
    if (mode === "regenerate-course" && course_slug) {
      const { data: course } = await supabase
        .from("courses")
        .select("id, role_slug, difficulty")
        .eq("slug", course_slug)
        .single();

      if (!course) throw new Error(`Course ${course_slug} not found`);

      const { data: modules } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", course.id)
        .order("sort_order");

      let regenerated = 0;
      for (const m of (modules || [])) {
        const gate = passesQualityGate(m);
        if (!gate.pass) {
          console.log(`⚠️ Module ${m.sort_order} "${m.title}" fails: ${gate.reasons.join(", ")}`);
          const fixed = await regenerateSingleModule(m, gate.reasons, course.role_slug, course.difficulty, LOVABLE_API_KEY);
          if (fixed) {
            const update: any = {};
            if (fixed.content_md && fixed.content_md.length >= 1200) {
              update.content_md = sanitizeContent(fixed.content_md);
            }
            if (fixed.content_md_es) {
              update.content_md_es = sanitizeContent(fixed.content_md_es);
            }
            if (fixed.quiz_json && fixed.quiz_json.length >= 2) {
              update.quiz_json = fixed.quiz_json;
            }
            if (Object.keys(update).length > 0) {
              await supabase.from("course_modules").update(update).eq("id", m.id);
              regenerated++;
              console.log(`✅ Module ${m.sort_order} regenerated`);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true, course_slug, regenerated, total: (modules || []).length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── FULL GENERATION MODE ──
    const { data: skills } = await supabase
      .from("skills").select("slug, display_name, category, tagline")
      .eq("status", "approved").limit(200);
    const { data: connectors } = await supabase
      .from("mcp_servers").select("slug, name, category")
      .eq("status", "approved").limit(100);

    const skillList = (skills || []).map((s: any) => `${s.slug}: ${s.display_name} (${s.category}) - ${s.tagline}`).join("\n");
    const connectorList = (connectors || []).map((c: any) => `${c.slug}: ${c.name} (${c.category})`).join("\n");

    const prompt = buildModulePrompt(role_slug, title, description, difficulty || "beginner", skillList, connectorList);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    content = sanitizeContent(content);
    const modules = JSON.parse(content);

    // ── Quality gate + fix loop ──
    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      m.content_md = sanitizeContent(m.content_md);
      m.content_md_es = sanitizeContent(m.content_md_es);

      // Validate quiz
      if (!m.quiz_json || m.quiz_json.length < 2) {
        m.quiz_json = m.quiz_json || [];
      }

      const gate = passesQualityGate(m);
      if (!gate.pass) {
        console.log(`⚠️ Module ${m.sort_order}: Fails quality gate: ${gate.reasons.join(", ")}. Attempting fix...`);
        const fixed = await regenerateSingleModule(m, gate.reasons, role_slug, difficulty || "beginner", LOVABLE_API_KEY);
        if (fixed) {
          if (fixed.content_md && fixed.content_md.length >= m.content_md.length) {
            m.content_md = sanitizeContent(fixed.content_md);
          }
          if (fixed.content_md_es) {
            m.content_md_es = sanitizeContent(fixed.content_md_es);
          }
          if (fixed.quiz_json && fixed.quiz_json.length >= 2) {
            m.quiz_json = fixed.quiz_json;
          }
        }
      }

      // Spanish translation fallback
      const enLen = (m.content_md || "").length;
      const esLen = (m.content_md_es || "").length;
      if (enLen > 0 && esLen < enLen * 0.5) {
        console.log(`⚠️ Module ${m.sort_order}: Spanish too short. Translating...`);
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
            const translated = sanitizeContent(fixData.choices?.[0]?.message?.content || "");
            if (translated.length >= enLen * 0.5) m.content_md_es = translated;
          }
        } catch (e) { console.error(`Failed to fix Spanish for module ${m.sort_order}:`, e); }
      }
    }

    // Create course
    const slug = course_slug || `claude-para-${role_slug}`;
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
      .select().single();

    if (courseErr) throw courseErr;

    await supabase.from("course_modules").delete().eq("course_id", course.id);

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
