import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERATE_PROMPT = `Sos un experto en crear skills best-in-class para Claude Code siguiendo el estándar oficial Agent Skills de Anthropic. Estudiaste las mejores skills del ecosistema (webapp-testing, mcp-builder, pdf-tools, frontend-design) y aplicás sus patrones.

Basándote en la conversación de entrevista, generá una skill estructurada.

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
      "output": "Lo que Claude debería responder/hacer (con código si es técnica)"
    }
  ],
  "dont_do": ["lista de cosas que Claude NO debe hacer nunca"],
  "edge_cases": ["lista de casos edge o situaciones especiales"],
  "category": "una de: ia, desarrollo, diseño, marketing, automatización, datos, creatividad, productividad, legal, negocios",
  "industry": ["industrias relevantes de: Agencias, Legal, Consultoras, E-commerce, Startups, Educación, Finanzas"],
  "target_roles": ["roles objetivo de: marketer, abogado, consultor, founder, disenador, desarrollador, otro"],
  "install_command": "El contenido completo del SKILL.md (ver formato abajo)",
  "required_mcps": [
    {
      "name": "Nombre del MCP Server requerido",
      "description": "Qué hace este MCP",
      "url": "URL del repositorio del MCP",
      "install_command": "Comando de instalación (ej: npx @anthropic/mcp-server-gmail init)",
      "required_tools": ["lista de tools específicas que usa la skill"],
      "credentials_needed": ["credenciales necesarias (ej: Gmail OAuth, API Key)"],
      "optional": false
    }
  ]
}

## FORMATO OBLIGATORIO del SKILL.md (campo install_command)

El SKILL.md DEBE seguir estos patrones best-in-class de Anthropic:

### 1. Frontmatter con description keyword-rich
La description DEBE decir QUÉ hace + CUÁNDO usarla + keywords de matching:

---
name: nombre-en-kebab-case
description: "[QUÉ hace en 1 frase]. [CUÁNDO usarla]. Use when [keywords de activación]."
compatibility: claude-code
metadata:
  author: pymaia
  version: "1.0"
---

### 2. Estructura del body (secciones obligatorias)

# Nombre de la Skill

[1-2 párrafos de overview: qué hace, para quién, qué problema resuelve]

## Decision Tree

[Árbol de decisión en ASCII que ayude al agente a decidir CUÁNDO activar la skill]

Ejemplo de formato:
\`\`\`
¿El usuario pide [trigger principal]?
├── SÍ → Activar esta skill
│   ├── ¿Es caso simple? → Seguir flujo estándar
│   └── ¿Es caso complejo? → Aplicar variante extendida
└── NO → No activar
    ├── ¿Es [caso similar pero diferente]? → Sugerir skill alternativa
    └── ¿Es otra cosa? → No aplica
\`\`\`

## Workflow

[Pasos numerados exactos que Claude debe seguir, en orden]

1. **Paso 1**: [descripción clara]
2. **Paso 2**: [descripción clara]
...

## Examples

[Mínimo 2 ejemplos con input/output concretos. Si es técnica, incluir bloques de código]

### Example 1: [título descriptivo]
**Input**: [lo que pide el usuario]
**Output**: [lo que Claude produce, con código si aplica]

## Best Practices

[Lista de mejores prácticas del dominio]

## Common Pitfalls

[Errores frecuentes con formato visual ❌/✅]

❌ **Don't**: [error común que cometen los principiantes]
✅ **Do**: [la forma correcta de hacerlo]

❌ **Don't**: [otro error]
✅ **Do**: [la corrección]

## What NOT to Do

[Lista explícita de restricciones absolutas]
- NEVER [restricción 1]
- NEVER [restricción 2]

### 3. Sección ## Dependencies (SOLO si la skill necesita MCPs externos)

Si la skill requiere interacción con sistemas externos (email, WhatsApp, APIs, bases de datos, archivos en la nube, etc.), DEBE incluir una sección Dependencies en el SKILL.md Y llenar el campo required_mcps con los MCPs necesarios.

Si la skill NO necesita MCPs (solo trabaja con archivos locales, código o texto), dejar required_mcps como array vacío [].

Ejemplo de sección Dependencies en el SKILL.md:

## Dependencies

This skill requires the following MCP servers:

### Gmail MCP (required)
- **Install**: \`npx @anthropic/mcp-server-gmail init\`
- **Tools used**: send_email, search_inbox
- **Credentials**: Gmail OAuth token

Before executing, verify MCP availability:
1. Check if tools are accessible via \`mcp__gmail__send_email\`
2. If not found, run the install command above
3. Add to ~/.claude/mcp_servers.json and restart

### 4. Reglas adicionales
- El SKILL.md debe tener MENOS de 500 líneas (progressive disclosure)
- Si necesita más detalle, referenciar archivos externos
- Los ejemplos deben ser EJECUTABLES, no genéricos
- El tono debe ser directo e imperativo (instrucciones para un agente, no documentación para humanos)
- Usar markdown semántico: headers, listas, code blocks, bold para énfasis`;

const JUDGE_PROMPT = `Sos un evaluador experto de skills para Claude Code, calibrado contra las mejores skills del ecosistema de Anthropic (webapp-testing, mcp-builder, pdf-tools). Evaluá la skill generada con estos criterios best-in-class:

Criterios de evaluación (10 puntos total):
- **Description keyword-rich** (1.5pts): ¿La description del frontmatter dice QUÉ hace + CUÁNDO usarla + keywords de matching? ¿Ayudaría a un agente a decidir si activarla?
- **Decision tree** (1.5pts): ¿Tiene un árbol de decisión claro que ayude al agente a saber cuándo SÍ y cuándo NO activar la skill?
- **Workflow estructurado** (2pts): ¿Los pasos son claros, ordenados y sin ambigüedad? ¿Un agente podría seguirlos mecánicamente?
- **Ejemplos ejecutables** (2pts): ¿Los ejemplos tienen input/output concretos? ¿Incluyen código real si es técnica? ¿Son copy-pasteables?
- **Common pitfalls ❌/✅** (1.5pts): ¿Tiene errores comunes con formato visual ❌ Don't / ✅ Do? ¿Son específicos del dominio?
- **Progressive disclosure** (1.5pts): ¿El SKILL.md tiene menos de 500 líneas? ¿Usa referencias a archivos externos si necesita más detalle?

Respondé SOLO con un JSON válido (sin markdown, sin backticks):

{
  "score": <número del 1 al 10>,
  "feedback": "Feedback específico de mejora en 2-3 oraciones comparando contra el estándar best-in-class.",
  "strengths": ["lista de 2-3 fortalezas"],
  "improvements": ["lista de 2-3 mejoras concretas y accionables"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation, action, skill, refinement_request } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const callAI = async (messages: any[], model = "google/gemini-2.5-flash", tools?: any[], tool_choice?: any) => {
      const body: any = { model, messages };
      if (tools) { body.tools = tools; body.tool_choice = tool_choice; }
      
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const status = response.status;
        if (status === 429) throw new Error("RATE_LIMITED");
        if (status === 402) throw new Error("PAYMENT_REQUIRED");
        throw new Error(`AI error: ${status}`);
      }

      const data = await response.json();
      const msg = data.choices[0].message;
      
      // If tool call, return parsed arguments
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        return JSON.parse(msg.tool_calls[0].function.arguments);
      }
      return msg.content;
    };

    const sanitizeJson = (str: string): string => {
      let cleaned = str.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      let result = '';
      let inString = false;
      let escape = false;
      for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (escape) { result += ch; escape = false; continue; }
        if (ch === '\\' && inString) { result += ch; escape = true; continue; }
        if (ch === '"') { inString = !inString; result += ch; continue; }
        if (inString) {
          if (ch === '\n') { result += '\\n'; continue; }
          if (ch === '\r') { result += '\\r'; continue; }
          if (ch === '\t') { result += '\\t'; continue; }
          if (ch.charCodeAt(0) < 0x20) { continue; }
        }
        result += ch;
      }
      return result;
    };

    // Tool definition for structured skill generation
    const skillTool = {
      type: "function",
      function: {
        name: "create_skill",
        description: "Create a structured skill from the interview conversation",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short descriptive name" },
            tagline: { type: "string", description: "One line description, max 100 chars" },
            description: { type: "string", description: "Detailed 2-3 paragraph description" },
            triggers: { type: "array", items: { type: "string" }, description: "Situations that activate the skill" },
            instructions: { type: "string", description: "Step by step instructions in markdown" },
            examples: { type: "array", items: { type: "object", properties: { title: { type: "string" }, input: { type: "string" }, output: { type: "string" } }, required: ["title", "input", "output"] } },
            dont_do: { type: "array", items: { type: "string" }, description: "Things Claude must NEVER do" },
            edge_cases: { type: "array", items: { type: "string" }, description: "Special situations" },
            category: { type: "string", enum: ["ia", "desarrollo", "diseño", "marketing", "automatización", "datos", "creatividad", "productividad", "legal", "negocios"] },
            industry: { type: "array", items: { type: "string" } },
            target_roles: { type: "array", items: { type: "string" } },
            install_command: { type: "string", description: "Full SKILL.md content following Anthropic Agent Skills standard" },
            required_mcps: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { 
                  name: { type: "string", description: "MCP server name" },
                  description: { type: "string", description: "What this MCP does" },
                  url: { type: "string", description: "Repository URL" },
                  install_command: { type: "string", description: "Installation command" },
                  required_tools: { type: "array", items: { type: "string" }, description: "Specific tools used" },
                  credentials_needed: { type: "array", items: { type: "string" }, description: "Required credentials" },
                  optional: { type: "boolean", description: "Whether this MCP is optional" }
                },
                required: ["name", "description", "required_tools", "optional"]
              },
              description: "MCP servers required by this skill. Empty array if none needed."
            },
          },
          required: ["name", "tagline", "description", "triggers", "instructions", "examples", "dont_do", "edge_cases", "category", "industry", "target_roles", "install_command", "required_mcps"],
          additionalProperties: false,
        },
      },
    };

    if (action === "generate") {
      // Step 1: Generate the skill from conversation using tool calling
      const conversationText = conversation
        .map((m: any) => `${m.role === "user" ? "Usuario" : "Entrevistador"}: ${m.content}`)
        .join("\n\n");

      let skill = await callAI(
        [
          { role: "system", content: GENERATE_PROMPT },
          { role: "user", content: `Conversación de entrevista:\n\n${conversationText}` },
        ],
        "google/gemini-2.5-flash",
        [skillTool],
        { type: "function", function: { name: "create_skill" } }
      );

      // Validate and sanitize per Anthropic spec
      skill = validateSkillFields(skill);

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
        judge = JSON.parse(sanitizeJson(judgeRaw));
      } catch {
        const match = judgeRaw.match(/\{[\s\S]*\}/);
        if (match) judge = JSON.parse(sanitizeJson(match[0]));
        else judge = { score: 7, feedback: "No se pudo evaluar automáticamente.", strengths: [], improvements: [] };
      }

      return new Response(
        JSON.stringify({ skill, quality: judge }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refine") {
      // Refine an existing skill based on user feedback using tool calling
      const refinePrompt = `Tenés esta skill existente:\n\n${JSON.stringify(skill)}\n\nEl usuario pidió este cambio: "${refinement_request}"\n\nModificá la skill según lo pedido y devolvé la skill completa actualizada.`;

      const refined = await callAI(
        [
          { role: "system", content: GENERATE_PROMPT },
          { role: "user", content: refinePrompt },
        ],
        "google/gemini-2.5-flash",
        [skillTool],
        { type: "function", function: { name: "create_skill" } }
      );

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
        judge = JSON.parse(sanitizeJson(judgeRaw));
      } catch {
        const match = judgeRaw.match(/\{[\s\S]*\}/);
        if (match) judge = JSON.parse(sanitizeJson(match[0]));
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
