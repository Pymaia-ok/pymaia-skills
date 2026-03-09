import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { batchSize = 20, table = "mcp_servers" } = await req.json().catch(() => ({}));

    const targetTable = table === "plugins" ? "plugins" : "mcp_servers";
    const nameField = targetTable === "plugins" ? "name" : "name";
    const descEsField = "description_es";
    const nameEsField = targetTable === "plugins" ? "name_es" : null;

    // Get items without Spanish description
    const { data: pending, error: fetchErr } = await supabase
      .from(targetTable)
      .select(`id, ${nameField}, description`)
      .is(descEsField, null)
      .neq("description", "")
      .limit(batchSize);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ translated: 0, remaining: 0, table: targetTable }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt
    const items = pending.map((c: any, i: number) => `${i + 1}. [${c[nameField]}]: ${c.description}`).join("\n");
    const extraFields = nameEsField ? ', "name_es"' : '';
    const prompt = `Translate these ${targetTable === "plugins" ? "plugin" : "MCP connector"} descriptions to Spanish (Latin American). Keep technical terms in English. Return ONLY a JSON array of objects with "id", "description_es"${extraFields} fields. No markdown, no explanation.

${items}

IDs: ${JSON.stringify(pending.map((c: any) => c.id))}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a translator. Output only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);
    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in AI response");
    const translations = JSON.parse(jsonMatch[0]);

    let translated = 0;
    for (const t of translations) {
      if (!t.id || !t.description_es) continue;
      const updateData: Record<string, string> = { description_es: t.description_es };
      if (nameEsField && t.name_es) updateData.name_es = t.name_es;
      const { error } = await supabase
        .from(targetTable)
        .update(updateData)
        .eq("id", t.id);
      if (!error) translated++;
    }

    // Count remaining
    const { count } = await supabase
      .from(targetTable)
      .select("id", { count: "exact", head: true })
      .is(descEsField, null)
      .neq("description", "");

    return new Response(
      JSON.stringify({ translated, remaining: count ?? 0, table: targetTable }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Translate error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
