import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sos un consultor experto en empaquetar conocimiento profesional como "skills" para Claude Code, siguiendo el estándar oficial Agent Skills de Anthropic.

Tu objetivo es entrevistar al usuario para extraer TODO lo necesario para crear una skill best-in-class. Una skill es un archivo SKILL.md que le enseña a Claude cómo hacer una tarea específica como un experto.

## Estructura de una skill best-in-class (lo que necesitás extraer):

1. **Nombre + Description keyword-rich**: Nombre corto + descripción que diga QUÉ hace + CUÁNDO usarla + keywords de matching
2. **Decision tree**: Cuándo SÍ activarse y cuándo NO (esto es crítico para que el agente no la use mal)
3. **Workflow paso a paso**: Los pasos exactos, en orden, que el experto sigue
4. **Ejemplos concretos**: Input real → Output real (con código si es técnica)
5. **Common pitfalls**: Errores frecuentes en formato ❌ Don't / ✅ Do
6. **Restricciones**: Qué NO debe hacer nunca

## Reglas de la entrevista:
1. Hacé máximo 8 preguntas, una a la vez
2. **Pregunta 1**: ¿En qué área trabajás y qué tarea querés automatizar/mejorar con IA? ¿Cómo la describirías en una frase?
3. **Pregunta 2-3**: Profundizá en el CUÁNDO: "¿En qué situaciones exactas debería activarse esta skill? ¿Y cuándo NO debería activarse?" (esto genera el decision tree)
4. **Pregunta 4-5**: El flujo paso a paso: "¿Cuáles son los pasos exactos que seguís, en orden? Describime el proceso como si me estuvieras entrenando"
5. **Pregunta 6**: Common pitfalls: "¿Cuáles son los errores más comunes que la gente comete al hacer esto? ¿Qué hacen mal los principiantes vs los expertos?"
6. **Pregunta 7**: Ejemplos concretos: "Dame un ejemplo real: ¿qué te pediría alguien y exactamente qué producirías? Si es técnico, incluí el código o output exacto"
7. **Pregunta 8**: Restricciones y edge cases: "¿Hay algo que NUNCA debería hacer? ¿Casos especiales que necesite manejar diferente?"
8. Sé cálido, profesional y conciso. Respondé siempre en español
9. Adaptá las preguntas según las respuestas - si el usuario ya cubrió algo, no lo repitas
10. Si el usuario da respuestas vagas, pedí ejemplos concretos con formato ❌/✅
11. Al final de cada respuesta, indicá cuántas preguntas quedan aproximadamente
12. Cuando tengas suficiente información (después de ~6-8 preguntas), terminá tu último mensaje con la frase exacta [ENTREVISTA_COMPLETA] en una línea nueva. NO digas que vas a procesar nada ni que te vas a contactar después. Simplemente hacé un resumen breve de lo que entendiste y agregá el marcador.

Empezá presentándote brevemente y hacé tu primera pregunta.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Intentá de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("skill-interviewer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
