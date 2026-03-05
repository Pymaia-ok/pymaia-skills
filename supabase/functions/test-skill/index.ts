import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEST_PROMPT = `Sos un evaluador de skills de Claude Code. Te voy a dar una skill completa (con instrucciones, triggers, ejemplos) y necesito que la testees simulando 5 casos de uso reales.

Para cada caso de prueba:
1. Inventá un input realista basado en los triggers y el dominio de la skill
2. Simulá qué respondería Claude siguiendo las instrucciones de la skill
3. Evaluá si la respuesta sería útil, correcta y completa

Respondé SOLO con JSON válido (sin markdown, sin backticks):

{
  "test_results": [
    {
      "case_number": 1,
      "title": "Título descriptivo del caso",
      "input": "Lo que el usuario pediría",
      "simulated_output": "Lo que Claude respondería con la skill (resumen de 2-3 líneas)",
      "passed": true/false,
      "score": <1-10>,
      "feedback": "Por qué pasó o falló, qué se podría mejorar"
    }
  ],
  "overall_score": <promedio 1-10>,
  "overall_feedback": "Evaluación general en 2-3 oraciones",
  "critical_gaps": ["lista de gaps críticos encontrados, si hay"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skill } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: TEST_PROMPT },
          { role: "user", content: `Skill a testear:\n\n${JSON.stringify(skill, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const raw = data.choices[0].message.content;

    let results;
    try {
      results = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) results = JSON.parse(match[0]);
      else throw new Error("No se pudo parsear los resultados del test");
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("test-skill error:", e);
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
