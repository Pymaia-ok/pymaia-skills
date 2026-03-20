import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 10 } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch skills with github_url but no readme_raw yet
    const { data: skills, error } = await supabase
      .from("skills")
      .select("id, display_name, github_url, slug")
      .not("github_url", "is", null)
      .is("readme_raw", null)
      .eq("status", "approved")
      .limit(batchSize);

    if (error) throw error;
    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No skills to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const skill of skills) {
      try {
        // Extract owner/repo from github_url
        const match = skill.github_url!.match(/github\.com\/([^\/]+\/[^\/]+)/);
        if (!match) {
          console.log(`Invalid github_url for ${skill.slug}: ${skill.github_url}`);
          // Mark as empty so we don't retry
          await supabase.from("skills").update({ readme_raw: "" }).eq("id", skill.id);
          continue;
        }

        const ownerRepo = match[1].replace(/\.git$/, "").replace(/\/$/, "");
        
        // Fetch README from GitHub API
        const headers: Record<string, string> = { Accept: "application/vnd.github.v3.raw" };
        if (githubToken) headers["Authorization"] = `token ${githubToken}`;

        const readmeRes = await fetch(`https://api.github.com/repos/${ownerRepo}/readme`, { headers });

        if (!readmeRes.ok) {
          console.log(`No README for ${ownerRepo}: ${readmeRes.status}`);
          await supabase.from("skills").update({ readme_raw: "" }).eq("id", skill.id);
          continue;
        }

        const readmeContent = await readmeRes.text();
        
        // Truncate very long READMEs to 15k chars to save DB space
        const readme = readmeContent.length > 15000 ? readmeContent.slice(0, 15000) + "\n\n[...truncated]" : readmeContent;

        // Generate summary with AI if available
        let summary: string | null = null;
        if (lovableApiKey && readme.length > 50) {
          try {
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                tools: [{
                  type: "function",
                  function: {
                    name: "set_summary",
                    description: "Set the structured summary for this skill",
                    parameters: {
                      type: "object",
                      properties: {
                        what_it_does: { type: "string", description: "1-2 sentences on what the tool does" },
                        key_features: { type: "array", items: { type: "string" }, description: "3-5 key features" },
                        requirements: { type: "string", description: "Prerequisites or requirements" },
                        how_to_use: { type: "string", description: "Brief usage instructions" },
                      },
                      required: ["what_it_does", "key_features"],
                      additionalProperties: false,
                    },
                  },
                }],
                tool_choice: { type: "function", function: { name: "set_summary" } },
                messages: [
                  {
                    role: "system",
                    content: "You are a technical documentation summarizer. Given a GitHub README, create a concise, structured summary. Be specific and technical. Write in the same language as the README (if English, respond in English; if Spanish, in Spanish).",
                  },
                  {
                    role: "user",
                    content: `Summarize this README for the tool "${skill.display_name}":\n\n${readme.slice(0, 8000)}`,
                  },
                ],
              }),
            });

            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
              if (toolCall) {
                const parsed = JSON.parse(toolCall.function.arguments);
                const parts: string[] = [];
                if (parsed.what_it_does) parts.push(`## What it does\n${parsed.what_it_does}`);
                if (parsed.key_features?.length) parts.push(`## Key features\n${parsed.key_features.map((f: string) => `- ${f}`).join("\n")}`);
                if (parsed.requirements) parts.push(`## Requirements\n${parsed.requirements}`);
                if (parsed.how_to_use) parts.push(`## How to use\n${parsed.how_to_use}`);
                summary = parts.join("\n\n");
              }
            } else {
              const errText = await aiRes.text();
              console.log(`AI summary failed for ${skill.slug}: ${aiRes.status} ${errText}`);
            }
          } catch (aiErr) {
            console.log(`AI error for ${skill.slug}:`, aiErr);
          }
        }

        // Update skill
        await supabase.from("skills").update({
          readme_raw: readme,
          readme_summary: summary,
        }).eq("id", skill.id);

        processed++;
        console.log(`✅ ${skill.slug}: README ${readme.length} chars, summary ${summary ? summary.length : 0} chars`);
      } catch (skillErr) {
        console.error(`Error processing ${skill.slug}:`, skillErr);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors, total: skills.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-readme error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
