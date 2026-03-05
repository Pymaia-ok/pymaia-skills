import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { skill, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const triggersText = skill.triggers?.length
      ? `\n\nTriggers (situaciones donde debés activarte):\n${skill.triggers.map((t: string) => `- ${t}`).join("\n")}`
      : "";

    const dontDoText = skill.dont_do?.length
      ? `\n\nCosas que NO debés hacer:\n${skill.dont_do.map((d: string) => `- ${d}`).join("\n")}`
      : "";

    const examplesText = skill.examples?.length
      ? `\n\nEjemplos de cómo responder:\n${skill.examples.map((ex: any) => `Título: ${ex.title}\nInput: ${ex.input}\nOutput esperado: ${ex.output}`).join("\n---\n")}`
      : "";

    const systemPrompt = `Sos un asistente de IA que sigue estrictamente estas instrucciones. Actuá como si fueras Claude con esta skill instalada.

Nombre de la skill: ${skill.name}
Descripción: ${skill.description}

Instrucciones:
${skill.instructions}${triggersText}${dontDoText}${examplesText}

REGLAS CRÍTICAS:
1. NUNCA describas lo que "vas a hacer" o "harías". PRODUCÍ EL OUTPUT DIRECTAMENTE.
2. Si la skill requiere analizar algo (una URL, una marca, datos), generá el análisis completo con la información que tengas disponible. Usá tu conocimiento general para completar lo que no sepas.
3. Si no tenés datos reales, generá un análisis realista y útil basado en tu conocimiento, marcando claramente qué partes son estimaciones.
4. El usuario espera recibir el ENTREGABLE FINAL, no una descripción del proceso.
5. No menciones que sos una simulación ni que estás probando una skill. Simplemente actuá como el asistente descrito.
6. Seguí el workflow paso a paso de las instrucciones y producí CADA sección del output.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intentá de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("test-skill-playground error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
