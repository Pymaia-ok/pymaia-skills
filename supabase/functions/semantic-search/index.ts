import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate a 64-dim semantic vector via tool calling
async function generateQueryEmbedding(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are an embedding generator. Given a search query about AI tools/skills, produce a 64-dimensional normalized float vector that captures its semantic meaning. Values should be between -1 and 1. Focus on: purpose, domain, technology, user type, and capabilities.`,
        },
        { role: "user", content: text.slice(0, 300) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "store_embedding",
          description: "Store the 64-dimensional semantic embedding vector",
          parameters: {
            type: "object",
            properties: {
              vector: {
                type: "array",
                items: { type: "number" },
                description: "Exactly 64 normalized float values between -1 and 1",
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

  if (!resp.ok) {
    const status = resp.status;
    if (status === 429) throw new Error("RATE_LIMIT");
    if (status === 402) throw new Error("CREDITS_EXHAUSTED");
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");

  const args = JSON.parse(toolCall.function.arguments);
  let vector = args.vector as number[];

  // Pad or truncate to exactly 64 dimensions
  if (vector.length < 64) {
    vector = [...vector, ...new Array(64 - vector.length).fill(0)];
  } else if (vector.length > 64) {
    vector = vector.slice(0, 64);
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    vector = vector.map(v => v / magnitude);
  }

  return vector;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { query, category, sort_by, page, tables } = await req.json();
    if (!query || typeof query !== "string")
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Generate query embedding (single LLM call)
    const queryEmbedding = await generateQueryEmbedding(query, LOVABLE_API_KEY);
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    // 2. Vector similarity search (single fast SQL query)
    const pageNum = page ?? 0;
    const pageSize = 24;

    const { data: results, error } = await supabase.rpc("semantic_search_skills", {
      query_embedding: vectorStr,
      filter_category: category || null,
      filter_roles: null,
      match_count: pageSize,
      similarity_threshold: 0.2,
    });

    if (error) {
      console.error("semantic search error:", error);
      // Fallback to traditional search
      return new Response(
        JSON.stringify({ error: "semantic_search_unavailable", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        data: results || [],
        count: results?.length || 0,
        mode: "semantic",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("semantic-search error:", msg);

    if (msg === "RATE_LIMIT") {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded, try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (msg === "CREDITS_EXHAUSTED") {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
