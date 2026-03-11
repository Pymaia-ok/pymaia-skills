import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "No API key" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Test 1: Try /v1/embeddings endpoint
  const results: Record<string, any> = {};
  
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        input: "test embedding query",
      }),
    });
    results.embeddings_endpoint = {
      status: resp.status,
      body: await resp.text().then(t => { try { return JSON.parse(t); } catch { return t; } }),
    };
  } catch (e) {
    results.embeddings_endpoint = { error: String(e) };
  }

  // Test 2: Try tool calling to generate a numeric vector
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You generate semantic embedding vectors for text. Given input text, produce a 64-dimensional normalized float vector capturing the semantic meaning.",
          },
          { role: "user", content: "automated email marketing for e-commerce" },
        ],
        tools: [{
          type: "function",
          function: {
            name: "store_embedding",
            description: "Store the semantic embedding vector",
            parameters: {
              type: "object",
              properties: {
                vector: {
                  type: "array",
                  items: { type: "number" },
                  description: "64-dimensional normalized float vector",
                },
              },
              required: ["vector"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "store_embedding" } },
      }),
    });
    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      results.tool_call_vector = {
        status: resp.status,
        vector_length: args.vector?.length,
        sample: args.vector?.slice(0, 5),
      };
    } else {
      results.tool_call_vector = { status: resp.status, raw: data };
    }
  } catch (e) {
    results.tool_call_vector = { error: String(e) };
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
