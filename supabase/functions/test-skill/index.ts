import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

// Phase 1: Generate test cases
const GENERATE_CASES_PROMPT = `Sos un diseñador de QA para skills de Claude Code. Generá 5 casos de test precisos y diversos.

## Tipos de casos (uno de cada uno):
1. **happy_path**: Uso estándar donde la skill debería activarse y funcionar perfectamente
2. **edge_case**: Situación límite o input inusual que la skill debería manejar bien
3. **no_activation**: Consulta similar pero donde la skill NO debería activarse (testea el decision tree)
4. **pitfall**: Un error común que los pitfalls de la skill deberían prevenir
5. **complex**: Uso avanzado que requiera seguir el workflow completo paso a paso

Para cada caso, generá un prompt de usuario realista y natural (como lo escribiría una persona real).`;

// Phase 3: Judge the real output
const JUDGE_PROMPT = `Sos un evaluador experto de skills de Claude Code, calibrado contra el estándar best-in-class de Anthropic.

Te doy:
- La skill completa (system prompt)
- El input del usuario (caso de test)
- El tipo de caso (happy_path, edge_case, no_activation, pitfall, complex)
- El output REAL que produjo el modelo

Evaluá:
1. ¿El output es correcto y útil para el caso?
2. ¿Sigue la estructura/workflow definido en la skill?
3. ¿Respeta los pitfalls y guardrails?
4. Para casos "no_activation": ¿el modelo correctamente NO activó el workflow de la skill?
5. ¿La calidad del output es comparable a best-in-class?

Sé riguroso pero justo.`;

async function callAI(apiKey: string, messages: any[], tools?: any[], toolChoice?: any, model = "google/gemini-2.5-flash") {
  const body: any = { model, messages };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI error ${res.status}: ${t}`);
  }

  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skill } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const skillContent = typeof skill === "string" ? skill : JSON.stringify(skill, null, 2);

    // ═══════════════════════════════════════════
    // PHASE 1: Generate test cases
    // ═══════════════════════════════════════════
    console.log("[test-skill] Phase 1: Generating test cases...");

    const casesResponse = await callAI(LOVABLE_API_KEY, [
      { role: "system", content: GENERATE_CASES_PROMPT },
      { role: "user", content: `Skill a testear:\n\n${skillContent}` },
    ], [{
      type: "function",
      function: {
        name: "generate_test_cases",
        description: "Generate 5 test cases for the skill",
        parameters: {
          type: "object",
          properties: {
            cases: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  case_type: { type: "string", enum: ["happy_path", "edge_case", "no_activation", "pitfall", "complex"] },
                  title: { type: "string", description: "Descriptive title in Spanish" },
                  user_input: { type: "string", description: "Realistic user prompt" },
                  expected_behavior: { type: "string", description: "What the skill should do in this case (for the judge)" },
                },
                required: ["case_type", "title", "user_input", "expected_behavior"],
                additionalProperties: false,
              },
            },
          },
          required: ["cases"],
          additionalProperties: false,
        },
      },
    }], { type: "function", function: { name: "generate_test_cases" } });

    const casesToolCall = casesResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!casesToolCall) throw new Error("No se pudieron generar los casos de test");
    const { cases } = JSON.parse(casesToolCall.function.arguments);
    console.log(`[test-skill] Generated ${cases.length} test cases`);

    // ═══════════════════════════════════════════
    // PHASE 2: Execute each case with the skill as system prompt
    // ═══════════════════════════════════════════
    console.log("[test-skill] Phase 2: Executing test cases...");

    const executions: { case_type: string; title: string; user_input: string; expected_behavior: string; real_output: string }[] = [];

    for (const testCase of cases) {
      try {
        const execResponse = await callAI(LOVABLE_API_KEY, [
          { role: "system", content: skillContent },
          { role: "user", content: testCase.user_input },
        ]);

        const output = execResponse.choices?.[0]?.message?.content || "(sin respuesta)";
        executions.push({
          ...testCase,
          real_output: output.slice(0, 1500), // Cap to avoid token explosion in phase 3
        });
      } catch (e) {
        if ((e as Error).message === "RATE_LIMIT") {
          console.log("[test-skill] Rate limited during execution, using partial results");
          break;
        }
        executions.push({
          ...testCase,
          real_output: `(Error de ejecución: ${(e as Error).message})`,
        });
      }

      // Small delay between executions
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[test-skill] Executed ${executions.length}/${cases.length} cases`);

    // ═══════════════════════════════════════════
    // PHASE 3: Judge all results together
    // ═══════════════════════════════════════════
    console.log("[test-skill] Phase 3: Judging results...");

    const judgeInput = executions.map((e, i) => 
      `### Caso ${i + 1}: ${e.title} (${e.case_type})
**Input del usuario:** ${e.user_input}
**Comportamiento esperado:** ${e.expected_behavior}
**Output real del modelo:**
${e.real_output}`
    ).join("\n\n---\n\n");

    const judgeResponse = await callAI(LOVABLE_API_KEY, [
      { role: "system", content: JUDGE_PROMPT },
      { role: "user", content: `## Skill testeada:\n${skillContent.slice(0, 3000)}\n\n## Resultados de ejecución:\n\n${judgeInput}` },
    ], [{
      type: "function",
      function: {
        name: "judge_results",
        description: "Judge the test results for each case",
        parameters: {
          type: "object",
          properties: {
            test_results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  case_number: { type: "number" },
                  case_type: { type: "string" },
                  title: { type: "string" },
                  input: { type: "string", description: "The user input that was tested" },
                  real_output: { type: "string", description: "Summary of what the model actually produced (2-3 lines)" },
                  passed: { type: "boolean" },
                  score: { type: "number", description: "1-10 score" },
                  feedback: { type: "string", description: "Why it passed or failed. If failed, what needs improvement." },
                },
                required: ["case_number", "case_type", "title", "input", "real_output", "passed", "score", "feedback"],
                additionalProperties: false,
              },
            },
            overall_score: { type: "number", description: "Average score 1-10" },
            overall_feedback: { type: "string", description: "Overall evaluation comparing against Anthropic best-in-class standards" },
            critical_gaps: {
              type: "array",
              items: { type: "string" },
              description: "Critical gaps found: missing decision tree? missing pitfalls? poor description?",
            },
          },
          required: ["test_results", "overall_score", "overall_feedback", "critical_gaps"],
          additionalProperties: false,
        },
      },
    }], { type: "function", function: { name: "judge_results" } }, "google/gemini-2.5-pro");

    const judgeToolCall = judgeResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!judgeToolCall) throw new Error("No se pudieron evaluar los resultados");
    const results = JSON.parse(judgeToolCall.function.arguments);

    // Merge real_output from executions into results for display
    if (results.test_results) {
      results.test_results.forEach((r: any, i: number) => {
        if (executions[i]) {
          r.full_output = executions[i].real_output;
        }
      });
    }

    console.log(`[test-skill] Done! Score: ${results.overall_score}/10`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("test-skill error:", e);
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intentá de nuevo en unos segundos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (msg === "PAYMENT_REQUIRED") {
      return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
