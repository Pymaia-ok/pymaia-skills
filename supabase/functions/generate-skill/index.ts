import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

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

### 1. Frontmatter con description keyword-rich y negative triggers
La description DEBE decir QUÉ hace + CUÁNDO usarla + CUÁNDO NO usarla + keywords de matching:

---
name: nombre-en-kebab-case
description: "[QUÉ hace en 1 frase]. [CUÁNDO usarla]. Use when [keywords de activación]. Do NOT use for [situaciones donde NO aplica]."
compatibility: claude-code
license: MIT
allowed-tools: ["Bash", "Read", "Write"]
metadata:
  author: pymaia
  version: "1.0"
---

IMPORTANTE sobre el frontmatter:
- La description DEBE incluir negative triggers ("Do NOT use for X, Y, Z")
- NUNCA uses angle brackets XML (<, >) dentro del frontmatter YAML — causan errores de parsing
- El campo "allowed-tools" es opcional: incluilo solo si la skill necesita herramientas específicas
- El campo "license" siempre debe ser "MIT" salvo que el usuario pida otra

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

[Lista de mejores prácticas del dominio, específicas y accionables]

- **[Práctica 1]**: [Explicación concisa de por qué y cómo]
- **[Práctica 2]**: [Explicación concisa]

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

## Troubleshooting

[Errores comunes con formato tabla o lista estructurada]

| Error | Causa | Solución |
|-------|-------|----------|
| [Error 1] | [Por qué ocurre] | [Cómo resolverlo] |
| [Error 2] | [Por qué ocurre] | [Cómo resolverlo] |

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
- Usar markdown semántico: headers, listas, code blocks, bold para énfasis
- NUNCA uses angle brackets XML (<tag>) en el frontmatter YAML`;

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

    const validateSkillFields = (s: any) => {
      // name: max 64 chars, kebab-case, no "anthropic"/"claude"
      if (s.name) {
        let kebab = s.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
        kebab = kebab.replace(/anthropic|claude/gi, '').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
        s.name = kebab.slice(0, 64) || 'custom-skill';
      }
      // description: max 1024 chars
      if (s.description && s.description.length > 1024) {
        s.description = s.description.slice(0, 1021) + '...';
      }
      return s;
    };

    if (action === "generate") {
      // Detect artifact type from conversation [TIPO:xxx] tag
      const conversationText = conversation
        .map((m: any) => `${m.role === "user" ? "Usuario" : "Entrevistador"}: ${m.content}`)
        .join("\n\n");

      const tipoMatch = conversationText.match(/\[TIPO:(skill|api-connector|workflow|slash-command|subagent)\]/i);
      const artifactType = tipoMatch ? tipoMatch[1].toLowerCase() : "skill";

      // Augment generate prompt with type-specific instructions
      let typeContext = "";
      if (artifactType === "api-connector") {
        typeContext = "\n\nIMPORTANTE: Este es un API connector. El campo required_mcps DEBE incluir al menos un MCP server con los detalles de la API (URL, tools, credenciales). El SKILL.md debe incluir una sección ## Dependencies con instrucciones de instalación del MCP.";
      } else if (artifactType === "workflow") {
        typeContext = "\n\nIMPORTANTE: Este es un workflow completo. El SKILL.md debe describir múltiples pasos encadenados y puede referenciar otros skills/commands. Incluí secciones claras para cada fase del workflow.";
      } else if (artifactType === "slash-command") {
        typeContext = "\n\nIMPORTANTE: Este es un slash command. El nombre debe empezar con / y ser corto. El SKILL.md debe ser conciso y enfocado en una sola acción rápida.";
      } else if (artifactType === "subagent") {
        typeContext = "\n\nIMPORTANTE: Este es un subagente. El SKILL.md debe definir claramente el dominio de expertise, las condiciones de invocación, y el protocolo de respuesta. Debe poder operar autónomamente dentro de su dominio.";
      }

      let skill = await callAI(
        [
          { role: "system", content: GENERATE_PROMPT + typeContext },
          { role: "user", content: `Tipo de artefacto detectado: ${artifactType}\n\nConversación de entrevista:\n\n${conversationText}` },
        ],
        "google/gemini-2.5-flash",
        [skillTool],
        { type: "function", function: { name: "create_skill" } }
      );

      // Validate and sanitize per Anthropic spec
      skill = validateSkillFields(skill);

      // Step 2: Judge the skill quality (use lite model for speed)
      const judgeRaw = await callAI(
        [
          { role: "system", content: JUDGE_PROMPT },
          { role: "user", content: JSON.stringify(skill) },
        ],
        "google/gemini-2.5-flash-lite"
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

    if (action === "wrap_plugin") {
      // Generate plugin.json and README.md from an existing skill
      const wrapPrompt = `Given this skill, generate a Claude Code Plugin wrapper.

Skill data:
${JSON.stringify(skill)}

Generate ONLY a valid JSON (no markdown, no backticks) with:
{
  "plugin_json": {
    "name": "kebab-case-name",
    "version": "1.0.0",
    "description": "One line description of what the plugin does",
    "skills": ["skills/skill-name"],
    "permissions": [],
    "author": "pymaia-community",
    "license": "MIT"
  },
  "readme": "Full README.md content in markdown explaining the plugin, how to install, what it does, and examples",
  "plugin_name": "Human readable plugin name",
  "plugin_description": "2-3 sentence description for marketplace listing"
}

Rules:
- plugin_json.name must be kebab-case, max 64 chars
- plugin_json.description max 200 chars
- README should include: title, description, installation command, features list, examples, license
- Installation command is: claude plugin install pymaia/plugin-name
- The readme should reference that this plugin was created with Pymaia SkillForge`;

      const wrapRaw = await callAI(
        [
          { role: "system", content: "You are an expert in Claude Code Plugins. Generate plugin wrappers following Anthropic's official plugin specification." },
          { role: "user", content: wrapPrompt },
        ],
        "google/gemini-2.5-flash"
      );

      let wrapper;
      try {
        wrapper = JSON.parse(sanitizeJson(wrapRaw));
      } catch {
        const match = wrapRaw.match(/\{[\s\S]*\}/);
        if (match) wrapper = JSON.parse(sanitizeJson(match[0]));
        else throw new Error("Failed to generate plugin wrapper");
      }

      return new Response(
        JSON.stringify(wrapper),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refine") {
      // Refine an existing skill based on user feedback using tool calling
      const refinePrompt = `Tenés esta skill existente:\n\n${JSON.stringify(skill)}\n\nEl usuario pidió este cambio: "${refinement_request}"\n\nModificá la skill según lo pedido y devolvé la skill completa actualizada.`;

      let refined = await callAI(
        [
          { role: "system", content: GENERATE_PROMPT },
          { role: "user", content: refinePrompt },
        ],
        "google/gemini-2.5-flash",
        [skillTool],
        { type: "function", function: { name: "create_skill" } }
      );

      refined = validateSkillFields(refined);

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

    if (action === "detect_api") {
      const { api_url, api_description } = await req.json().catch(() => ({ api_url: "", api_description: "" }));
      const detectPrompt = `Given this API information, detect the main endpoints available.

API URL: ${api_url || "unknown"}
Description: ${api_description || "unknown"}

Try to infer common REST endpoints based on the description. If it sounds like a CRM, suggest CRUD endpoints for contacts, deals, etc. If it sounds like a messaging API, suggest send/receive endpoints.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "endpoints": [
    { "method": "GET", "path": "/resource", "summary": "What this endpoint does" }
  ]
}`;

      const detectRaw = await callAI(
        [
          { role: "system", content: "You are an API expert. Detect REST API endpoints from descriptions." },
          { role: "user", content: detectPrompt },
        ],
        "google/gemini-2.5-flash"
      );

      let detected;
      try {
        detected = JSON.parse(sanitizeJson(detectRaw));
      } catch {
        const match = detectRaw.match(/\{[\s\S]*\}/);
        detected = match ? JSON.parse(sanitizeJson(match[0])) : { endpoints: [] };
      }

      return new Response(
        JSON.stringify(detected),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_mcp") {
      const { api_url, api_description, auth_type, api_key_header, endpoints: selectedEndpoints } = await req.json().catch(() => ({}));

      const mcpPrompt = `Generate a complete MCP (Model Context Protocol) server in TypeScript for Deno that connects to this API.

API URL: ${api_url}
Description: ${api_description || "External API"}
Auth type: ${auth_type || "api-key"}
Auth header: ${api_key_header || "Authorization"}
Endpoints to expose as tools:
${JSON.stringify(selectedEndpoints || [], null, 2)}

Generate ONLY valid JSON (no markdown, no backticks):
{
  "mcp_server_code": "Full TypeScript source code for a Deno MCP server that exposes each endpoint as a tool. Use fetch() for HTTP calls. Include proper error handling, input validation, and type safety. The server should read credentials from environment variables.",
  "mcp_config": {
    "mcpServers": {
      "api-name": {
        "command": "deno",
        "args": ["run", "--allow-net", "--allow-env", "src/server.ts"],
        "env": { "API_KEY": "your-api-key-here", "API_BASE_URL": "${api_url}" }
      }
    }
  },
  "skill_context": "Context paragraph for the SKILL.md explaining what MCP tools are available and how to use them. Include tool names in mcp__servername__toolname format.",
  "credentials_needed": ["List of environment variables the user needs to set"]
}

Rules:
- Each endpoint becomes a tool with a descriptive name
- Tool names should be snake_case
- Include proper TypeScript types
- Handle errors gracefully
- Use environment variables for secrets, never hardcode`;

      const mcpRaw = await callAI(
        [
          { role: "system", content: "You are an expert MCP server developer. Generate production-ready TypeScript MCP servers." },
          { role: "user", content: mcpPrompt },
        ],
        "google/gemini-2.5-flash"
      );

      let mcpResult;
      try {
        mcpResult = JSON.parse(sanitizeJson(mcpRaw));
      } catch {
        const match = mcpRaw.match(/\{[\s\S]*\}/);
        if (match) mcpResult = JSON.parse(sanitizeJson(match[0]));
        else throw new Error("Failed to generate MCP server");
      }

      return new Response(
        JSON.stringify(mcpResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "auto_improve") {
      // Auto-improve loop: test → analyze failures → refine → re-test (max 3 cycles)
      const MAX_CYCLES = 3;
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      let currentSkill = { ...skill };
      let bestScore = 0;
      let bestSkill = currentSkill;
      const iterations: any[] = [];

      for (let cycle = 0; cycle < MAX_CYCLES; cycle++) {
        // 1. Test the current skill
        const testResp = await fetch(`${supabaseUrl}/functions/v1/test-skill`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ skill: currentSkill }),
        });
        if (!testResp.ok) break;
        const testData = await testResp.json();

        const passRate = testData.test_results?.filter((t: any) => t.passed).length / (testData.test_results?.length || 1);
        const avgScore = testData.overall_score || 0;

        iterations.push({
          cycle: cycle + 1,
          pass_rate: passRate,
          avg_score: avgScore,
          critical_gaps: testData.critical_gaps || [],
          test_results: testData.test_results,
        });

        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestSkill = { ...currentSkill };
        }

        // If pass rate is 100% and score >= 8, stop early
        if (passRate >= 1.0 && avgScore >= 8) break;

        // 2. Analyze failures and refine
        const failures = (testData.test_results || []).filter((t: any) => !t.passed || t.score < 7);
        if (failures.length === 0) break;

        const failureSummary = failures.map((f: any) =>
          `Test "${f.title}" (score: ${f.score}): ${f.feedback}. Output was: ${(f.real_output || "").slice(0, 200)}`
        ).join("\n");

        const refinePrompt = `Tenés esta skill:\n\n${JSON.stringify(currentSkill)}\n\nEstas pruebas fallaron o tuvieron score bajo:\n${failureSummary}\n\nGaps críticos: ${(testData.critical_gaps || []).join(", ")}\n\nMejorá la skill para que pase estas pruebas. Enfocate en los gaps específicos sin cambiar lo que ya funciona bien.`;

        let refined = await callAI(
          [
            { role: "system", content: GENERATE_PROMPT },
            { role: "user", content: refinePrompt },
          ],
          "google/gemini-2.5-flash",
          [skillTool],
          { type: "function", function: { name: "create_skill" } }
        );
        refined = validateSkillFields(refined);
        currentSkill = refined;
      }

      // Final quality judge
      const judgeRaw = await callAI(
        [
          { role: "system", content: JUDGE_PROMPT },
          { role: "user", content: JSON.stringify(bestSkill) },
        ],
        "google/gemini-2.5-flash-lite"
      );
      let judge;
      try {
        judge = JSON.parse(sanitizeJson(judgeRaw));
      } catch {
        const match = judgeRaw.match(/\{[\s\S]*\}/);
        judge = match ? JSON.parse(sanitizeJson(match[0])) : { score: 7, feedback: "", strengths: [], improvements: [] };
      }

      return new Response(
        JSON.stringify({
          skill: bestSkill,
          quality: judge,
          iterations,
          cycles_run: iterations.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "import_skill") {
      // Parse a raw SKILL.md into structured fields using AI
      const { skill_md } = await req.json().catch(() => ({ skill_md: "" }));
      if (!skill_md || skill_md.length < 20) {
        return new Response(
          JSON.stringify({ error: "SKILL.md content is too short" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const importPrompt = `Analizá este archivo SKILL.md y extraé la información estructurada.\n\nSKILL.md:\n\`\`\`\n${skill_md.slice(0, 8000)}\n\`\`\`\n\nExtraé todos los campos posibles del contenido. Si no encontrás un campo, usá un valor por defecto razonable.`;

      let imported = await callAI(
        [
          { role: "system", content: GENERATE_PROMPT },
          { role: "user", content: importPrompt },
        ],
        "google/gemini-2.5-flash",
        [skillTool],
        { type: "function", function: { name: "create_skill" } }
      );
      imported = validateSkillFields(imported);
      // Ensure install_command has the original MD if AI didn't preserve it
      if (!imported.install_command || imported.install_command.length < skill_md.length * 0.5) {
        imported.install_command = skill_md;
      }

      // Judge
      const judgeRaw = await callAI(
        [
          { role: "system", content: JUDGE_PROMPT },
          { role: "user", content: JSON.stringify(imported) },
        ],
        "google/gemini-2.5-flash-lite"
      );
      let judge;
      try {
        judge = JSON.parse(sanitizeJson(judgeRaw));
      } catch {
        const match = judgeRaw.match(/\{[\s\S]*\}/);
        judge = match ? JSON.parse(sanitizeJson(match[0])) : { score: 7, feedback: "", strengths: [], improvements: [] };
      }

      return new Response(
        JSON.stringify({ skill: imported, quality: judge }),
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
