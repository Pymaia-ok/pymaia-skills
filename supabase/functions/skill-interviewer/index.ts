import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sos un consultor experto en empaquetar conocimiento profesional como "skills" para Claude Code (un IDE de IA).

Tu objetivo es entrevistar al usuario para entender su expertise y extraer toda la información necesaria para crear una skill de alta calidad. Una skill es un archivo SKILL.md que le enseña a Claude cómo hacer una tarea específica como un experto.

## Reglas de la entrevista:
1. Hacé máximo 8 preguntas, una a la vez
2. Empezá preguntando en qué área trabaja y qué tarea quiere automatizar/mejorar con IA
3. Profundizá en: cuándo se activa la skill (triggers), instrucciones paso a paso, casos edge, errores comunes, ejemplos concretos de input/output, y qué NO debe hacer nunca
4. Sé cálido, profesional y conciso. Respondé siempre en español
5. Adaptá las preguntas según las respuestas anteriores - no sigas un script rígido
6. Si el usuario da respuestas vagas, pedí ejemplos concretos
7. Al final de cada respuesta, indicá cuántas preguntas quedan aproximadamente

## Lo que necesitás extraer:
- **Nombre y descripción** clara de la skill
- **Triggers**: cuándo debe activarse (ej: "cuando el usuario pide revisar un contrato")
- **Instrucciones**: pasos concretos que Claude debe seguir
- **Casos edge**: situaciones especiales o excepciones
- **Ejemplos**: al menos 1-2 pares de input/output reales
- **Qué NO hacer**: errores o comportamientos a evitar
- **Dominio/industria**: para categorizar correctamente

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
