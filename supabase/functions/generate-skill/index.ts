import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERATE_PROMPT = `Sos un experto en crear skills para Claude Code siguiendo el estándar oficial Agent Skills de Anthropic. Basándote en la conversación de entrevista que te paso, generá una skill estructurada.

Respondé SOLO con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:

{
  "name": "Nombre corto y descriptivo de la skill",
  "tagline": "Una frase de máximo 100 caracteres que describe qué hace",
  "description": "Descripción detallada de 2-3 párrafos explicando qué hace la skill, para quién es, y qué problema resuelve",
  "triggers": ["lista de situaciones o comandos que activan la skill"],
  "instructions": "Instrucciones detalladas paso a paso que Claude debe seguir, en formato markdown",
  "examples": [
    {
      "title": "Título del ejemplo",
      "input": "Lo que el usuario pide",
      "output": "Lo que Claude debería responder/hacer"
    }
  ],
  "dont_do": ["lista de cosas que Claude NO debe hacer nunca"],
  "edge_cases": ["lista de casos edge o situaciones especiales"],
  "category": "una de: ia, desarrollo, diseño, marketing, automatización, datos, creatividad, productividad, legal, negocios",
  "industry": ["industrias relevantes de: Agencias, Legal, Consultoras, E-commerce, Startups, Educación, Finanzas"],
  "target_roles": ["roles objetivo de: marketer, abogado, consultor, founder, disenador, desarrollador, otro"],
  "install_command": "El contenido completo del SKILL.md en formato estándar Agent Skills de Anthropic (ver abajo)"
}

IMPORTANTE: El campo "install_command" DEBE ser un archivo SKILL.md válido según el estándar oficial de Anthropic con este formato exacto:

---
name: nombre-en-kebab-case
description: Descripción concisa de qué hace la skill y cuándo usarla (max 1024 chars)
compatibility: claude-code
metadata:
  author: pymaia
  version: "1.0"
---

# Nombre de la Skill

[Instrucciones principales en markdown]

## Triggers

[Lista de triggers/situaciones que activan la skill]

## Examples

[Ejemplos concretos de input/output]

## Guidelines

[Reglas, restricciones y edge cases]

## What NOT to do

[Lista explícita de restricciones]

El SKILL.md debe ser profesional, completo y directamente compatible con Claude Code y Claude.ai.`;

const JUDGE_PROMPT = `Sos un evaluador experto de skills para Claude Code. Evaluá la siguiente skill generada y dá un score de calidad del 1 al 10.

Criterios de evaluación:
- **Claridad** (2pts): ¿Las instrucciones son claras y sin ambigüedad?
- **Completitud** (2pts): ¿Cubre triggers, instrucciones, ejemplos, edge cases y restricciones?
- **Especificidad** (2pts): ¿Es específica o demasiado genérica? ¿Tiene ejemplos concretos?
- **Utilidad** (2pts): ¿Resuelve un problema real? ¿Ahorra tiempo significativo?
- **Calidad del SKILL.md** (2pts): ¿El install_command es un SKILL.md bien estructurado y profesional?

Respondé SOLO con un JSON válido (sin markdown, sin backticks):

{
  "score": <número del 1 al 10>,
  "feedback": "Feedback específico de mejora en 2-3 oraciones. Sé constructivo y concreto.",
  "strengths": ["lista de 2-3 fortalezas"],
  "improvements": ["lista de 2-3 mejoras sugeridas"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation, action, skill, refinement_request } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const callAI = async (messages: any[], model = "google/gemini-2.5-flash") => {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages }),
        }
      );

      if (!response.ok) {
        const status = response.status;
        if (status === 429) throw new Error("RATE_LIMITED");
        if (status === 402) throw new Error("PAYMENT_REQUIRED");
        throw new Error(`AI error: ${status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    };

    if (action === "generate") {
      // Step 1: Generate the skill from conversation
      const conversationText = conversation
        .map((m: any) => `${m.role === "user" ? "Usuario" : "Entrevistador"}: ${m.content}`)
        .join("\n\n");

      const skillRaw = await callAI([
        { role: "system", content: GENERATE_PROMPT },
        { role: "user", content: `Conversación de entrevista:\n\n${conversationText}` },
      ]);

      let skill;
      try {
        skill = JSON.parse(skillRaw);
      } catch {
        // Try to extract JSON from response
        const match = skillRaw.match(/\{[\s\S]*\}/);
        if (match) skill = JSON.parse(match[0]);
        else throw new Error("No se pudo parsear la skill generada");
      }

      // Step 2: Judge the skill quality
      const judgeRaw = await callAI(
        [
          { role: "system", content: JUDGE_PROMPT },
          { role: "user", content: JSON.stringify(skill) },
        ],
        "google/gemini-2.5-flash"
      );

      let judge;
      try {
        judge = JSON.parse(judgeRaw);
      } catch {
        const match = judgeRaw.match(/\{[\s\S]*\}/);
        if (match) judge = JSON.parse(match[0]);
        else judge = { score: 7, feedback: "No se pudo evaluar automáticamente.", strengths: [], improvements: [] };
      }

      return new Response(
        JSON.stringify({ skill, quality: judge }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refine") {
      // Refine an existing skill based on user feedback
      const refinePrompt = `Tenés esta skill existente:\n\n${JSON.stringify(skill)}\n\nEl usuario pidió este cambio: "${refinement_request}"\n\nModificá la skill según lo pedido y devolvé el JSON completo actualizado con la misma estructura. Respondé SOLO con JSON válido, sin markdown ni backticks.`;

      const refinedRaw = await callAI([
        { role: "system", content: GENERATE_PROMPT },
        { role: "user", content: refinePrompt },
      ]);

      let refined;
      try {
        refined = JSON.parse(refinedRaw);
      } catch {
        const match = refinedRaw.match(/\{[\s\S]*\}/);
        if (match) refined = JSON.parse(match[0]);
        else throw new Error("No se pudo parsear la skill refinada");
      }

      // Re-judge
      const judgeRaw = await callAI(
        [
          { role: "system", content: JUDGE_PROMPT },
          { role: "user", content: JSON.stringify(refined) },
        ],
        "google/gemini-2.5-flash"
      );

      let judge;
      try {
        judge = JSON.parse(judgeRaw);
      } catch {
        const match = judgeRaw.match(/\{[\s\S]*\}/);
        if (match) judge = JSON.parse(match[0]);
        else judge = { score: 7, feedback: "No se pudo evaluar.", strengths: [], improvements: [] };
      }

      return new Response(
        JSON.stringify({ skill: refined, quality: judge }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no válida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-skill error:", e);
    const msg = e instanceof Error ? e.message : "Error desconocido";
    const status = msg === "RATE_LIMITED" ? 429 : msg === "PAYMENT_REQUIRED" ? 402 : 500;
    return new Response(
      JSON.stringify({ error: msg === "RATE_LIMITED" ? "Demasiadas solicitudes." : msg === "PAYMENT_REQUIRED" ? "Créditos insuficientes." : msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
