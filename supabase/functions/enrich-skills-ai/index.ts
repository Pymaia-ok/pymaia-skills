import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let batchSize = 10;
    let mode = "enrich"; // "enrich" | "cleanup"
    try {
      const body = await req.json();
      batchSize = body?.batchSize || 10;
      mode = body?.mode || "enrich";
    } catch { /* no body */ }

    // ─── MODE: cleanup — mark 1-char residues without github_url as pending ───
    if (mode === "cleanup") {
      // Find skills with very short descriptions (parsing residues) that can't be enriched
      const { data: residues, error: resErr } = await supabase
        .from("skills")
        .select("id, slug, description_human, github_url")
        .eq("status", "approved")
        .is("github_url", null)
        .limit(batchSize);

      if (resErr || !residues) {
        return new Response(JSON.stringify({ success: false, error: resErr?.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter to only truly bad ones (1-3 char descriptions or generic placeholders)
      const toClean = residues.filter(s => {
        const desc = (s.description_human || "").trim();
        return desc.length < 5
          || /^[|>!\-\s]{1,5}$/.test(desc)
          || desc.includes("ecosistema open-source");
      });

      let cleaned = 0;
      for (const skill of toClean) {
        const { error } = await supabase
          .from("skills")
          .update({ status: "pending" })
          .eq("id", skill.id);
        if (!error) cleaned++;
      }

      return new Response(JSON.stringify({
        success: true, mode: "cleanup",
        checked: residues.length, cleaned,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODE: enrich — use AI to generate better descriptions ───
    console.log(`[enrich-ai] Starting batch of ${batchSize}...`);

    // Find skills with github_url but still poor descriptions after github-enrich
    const { data: skills, error } = await supabase
      .from("skills")
      .select("id, slug, display_name, tagline, description_human, github_url, category")
      .eq("status", "approved")
      .not("github_url", "is", null)
      .or("description_human.ilike.%ecosistema open-source%,tagline.ilike.%skill del ecosistema%")
      .limit(batchSize);

    if (error || !skills || skills.length === 0) {
      console.log(`[enrich-ai] No skills to enrich (${error?.message || "0 found"})`);
      return new Response(JSON.stringify({ success: true, enriched: 0, message: "No skills to enrich" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[enrich-ai] Processing ${skills.length} skills...`);
    let enriched = 0;

    // Process in small batches to avoid rate limits
    for (const skill of skills) {
      try {
        const ghMatch = skill.github_url?.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/);
        const repoName = ghMatch ? `${ghMatch[1]}/${ghMatch[2]}` : skill.display_name;

        const prompt = `You are a technical copywriter for a developer tools marketplace.

Given this tool/skill:
- Name: ${skill.display_name}
- GitHub: ${repoName}
- Current category: ${skill.category}
- Current description: ${skill.description_human || "none"}

Generate:
1. A tagline (max 120 chars, one sentence, what it does concisely)
2. A description (2-3 sentences, max 300 chars, what it does + who it's for + key benefit)

Both in English. Be specific and practical, not generic.`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: prompt }],
            tools: [{
              type: "function",
              function: {
                name: "set_descriptions",
                description: "Set the tagline and description for a skill",
                parameters: {
                  type: "object",
                  properties: {
                    tagline: { type: "string", description: "Short tagline, max 120 chars" },
                    description: { type: "string", description: "2-3 sentence description, max 300 chars" },
                  },
                  required: ["tagline", "description"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "set_descriptions" } },
          }),
        });

        if (aiRes.status === 429) {
          console.log("[enrich-ai] Rate limited, stopping batch");
          break;
        }
        if (!aiRes.ok) {
          console.error(`[enrich-ai] AI error ${aiRes.status} for ${skill.slug}`);
          continue;
        }

        const aiData = await aiRes.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) { console.log(`[enrich-ai] No tool call for ${skill.slug}`); continue; }

        const args = JSON.parse(toolCall.function.arguments);
        if (!args.tagline || !args.description) continue;

        const updates: Record<string, unknown> = {};
        // Only update if current is generic
        if (skill.tagline?.includes("Skill del ecosistema") || (skill.tagline || "").length < 10) {
          updates.tagline = args.tagline.slice(0, 120);
        }
        if (skill.description_human?.includes("ecosistema open-source") || (skill.description_human || "").length < 40) {
          updates.description_human = args.description.slice(0, 500);
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateErr } = await supabase.from("skills").update(updates).eq("id", skill.id);
          if (!updateErr) enriched++;
          else console.error(`[enrich-ai] Update error for ${skill.slug}:`, updateErr.message);
        }

        // Small delay between AI calls
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error(`[enrich-ai] Error for ${skill.slug}:`, (e as Error).message);
      }
    }

    console.log(`[enrich-ai] Enriched ${enriched}/${skills.length}`);
    return new Response(JSON.stringify({
      success: true, mode: "enrich",
      processed: skills.length, enriched,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[enrich-ai] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
