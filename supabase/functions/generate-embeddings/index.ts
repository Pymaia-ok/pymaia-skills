import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate a 64-dim semantic vector via tool calling
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
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
          content: `You are an embedding generator. Given text about an AI tool/skill, produce a 64-dimensional normalized float vector that captures its semantic meaning. Values should be between -1 and 1. Focus on: purpose, domain, technology, user type, and capabilities.`,
        },
        { role: "user", content: text.slice(0, 500) },
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
    const { table = "skills", batch_size = 20 } = await req.json().catch(() => ({}));
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch records without embeddings
    let query;
    if (table === "skills") {
      query = supabase
        .from("skills")
        .select("id, display_name, tagline, description_human, category")
        .eq("status", "approved")
        .is("embedding", null)
        .limit(batch_size);
    } else if (table === "mcp_servers") {
      query = supabase
        .from("mcp_servers")
        .select("id, name, description, category")
        .eq("status", "approved")
        .is("embedding", null)
        .limit(batch_size);
    } else if (table === "plugins") {
      query = supabase
        .from("plugins")
        .select("id, name, description, category")
        .eq("status", "approved")
        .is("embedding", null)
        .limit(batch_size);
    } else {
      return new Response(JSON.stringify({ error: "Invalid table" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: records, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ message: "No records to process", table }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Build text for embedding
        const textParts = table === "skills"
          ? [record.display_name, record.tagline, record.description_human, record.category]
          : [record.name, record.description, record.category];
        const text = textParts.filter(Boolean).join(" | ");

        const vector = await generateEmbedding(text, LOVABLE_API_KEY);

        // Store embedding - use raw SQL via RPC since vector type needs special handling
        const vectorStr = `[${vector.join(",")}]`;
        const { error: updateError } = await supabase
          .from(table as any)
          .update({ embedding: vectorStr } as any)
          .eq("id", record.id);

        if (updateError) {
          console.error(`Update error for ${record.id}:`, updateError);
          errors++;
        } else {
          processed++;
        }

        // Small delay to avoid rate limiting
        if (processed < records.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (e) {
        console.error(`Error processing ${record.id}:`, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ table, processed, errors, remaining: records.length - processed - errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-embeddings error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
