import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let batchSize = 10;
    let mode = "enrich"; // "enrich" | "cleanup" | "detect-mcps"
    try {
      const body = await req.json();
      batchSize = body?.batchSize || 10;
      mode = body?.mode || "enrich";
    } catch { /* no body */ }

    // ─── MODE: cleanup — mark 1-char residues without github_url as pending ───
    if (mode === "cleanup") {
      // Find skills with very short descriptions (parsing residues) that can't be enriched
      const { data: residues, error: resErr } = await supabase
        .from("skills")
        .select("id, slug, description_human, github_url")
        .eq("status", "approved")
        .is("github_url", null)
        .limit(batchSize);

      if (resErr || !residues) {
        return new Response(JSON.stringify({ success: false, error: resErr?.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter to only truly bad ones (1-3 char descriptions or generic placeholders)
      const toClean = residues.filter(s => {
        const desc = (s.description_human || "").trim();
        return desc.length < 5
          || /^[|>!\-\s]{1,5}$/.test(desc)
          || desc.includes("ecosistema open-source");
      });

      let cleaned = 0;
      for (const skill of toClean) {
        const { error } = await supabase
          .from("skills")
          .update({ status: "pending" })
          .eq("id", skill.id);
        if (!error) cleaned++;
      }

      return new Response(JSON.stringify({
        success: true, mode: "cleanup",
        checked: residues.length, cleaned,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODE: bulk-mark-no-mcp — mark skills without external tool keywords ───
    if (mode === "bulk-mark-no-mcp") {
      console.log(`[bulk-mark] Marking non-candidate skills...`);
      // Keywords that suggest external tool usage
      const keywords = ['github','slack','email','gmail','smtp','database','postgres','mysql','mongo','stripe','webhook','whatsapp','telegram','discord','jira','linear','notion','google drive','dropbox','s3','aws','gcp','azure','puppeteer','playwright','firecrawl','brave search','calendar','oauth','salesforce','hubspot','twitter','linkedin','trello','asana','jenkins','ci/cd','filesystem','file system','api key','docker','kubernetes','redis','elasticsearch','supabase','firebase'];
      
      // Find skills with empty mcps that DON'T match any keyword
      const { data: nonCandidates, error } = await supabase.rpc('exec_sql', { sql: '' }); // Can't do complex NOT ILIKE ANY via JS client
      
      // Use a simpler approach: fetch batch, check keywords locally, mark non-matches
      const { data: skills, error: fetchErr } = await supabase
        .from("skills")
        .select("id, slug, description_human, readme_summary")
        .eq("status", "approved")
        .eq("required_mcps", '[]')
        .limit(batchSize);
      
      if (fetchErr || !skills || skills.length === 0) {
        return new Response(JSON.stringify({ success: true, mode: "bulk-mark-no-mcp", marked: 0, skipped: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let marked = 0;
      let skipped = 0;
      const ids: string[] = [];
      
      for (const skill of skills) {
        const text = `${skill.description_human || ""} ${skill.readme_summary || ""}`.toLowerCase();
        const hasKeyword = keywords.some(kw => text.includes(kw));
        if (!hasKeyword) {
          ids.push(skill.id);
        } else {
          skipped++;
        }
      }

      // Bulk update non-candidates in chunks of 200
      if (ids.length > 0) {
        for (let i = 0; i < ids.length; i += 200) {
          const chunk = ids.slice(i, i + 200);
          const { error: updateErr } = await supabase
            .from("skills")
            .update({ required_mcps: null })
            .in("id", chunk);
          if (!updateErr) marked += chunk.length;
          else console.error(`[bulk-mark] Update error:`, updateErr.message);
        }
      }

      console.log(`[bulk-mark] Marked ${marked} as no-MCP, skipped ${skipped} candidates`);
      return new Response(JSON.stringify({ success: true, mode: "bulk-mark-no-mcp", checked: skills.length, marked, skipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODE: detect-mcps — analyze skills to populate required_mcps ───
    if (mode === "detect-mcps") {
      console.log(`[detect-mcps] Starting batch of ${batchSize}...`);

      // Only fetch skills with empty array (candidates) — null means already marked as no-MCP
      const keywords = ['github','slack','email','gmail','smtp','database','postgres','mysql','mongo','stripe','webhook','whatsapp','telegram','discord','jira','linear','notion','google drive','dropbox','s3','aws','gcp','azure','puppeteer','playwright','firecrawl','calendar','oauth','salesforce','hubspot','twitter','linkedin','trello','asana','jenkins','docker','kubernetes','redis','elasticsearch','supabase','firebase','api key','filesystem','file system'];
      
      const { data: allSkills, error } = await supabase
        .from("skills")
        .select("id, slug, display_name, description_human, readme_summary, readme_raw, category, install_command, github_url")
        .eq("status", "approved")
        .eq("required_mcps", '[]')
        .limit(batchSize * 3); // fetch more, filter locally

      if (error || !allSkills || allSkills.length === 0) {
        console.log(`[detect-mcps] No skills to analyze (${error?.message || "0 found"})`);
        return new Response(JSON.stringify({ success: true, mode: "detect-mcps", analyzed: 0, detected: 0, marked_no_mcp: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Split into candidates (have keywords) and non-candidates
      const candidates: typeof allSkills = [];
      const nonCandidateIds: string[] = [];
      
      for (const skill of allSkills) {
        const text = `${skill.description_human || ""} ${skill.readme_summary || ""}`.toLowerCase();
        if (keywords.some(kw => text.includes(kw))) {
          if (candidates.length < batchSize) candidates.push(skill);
        } else {
          nonCandidateIds.push(skill.id);
        }
      }

      // Bulk mark non-candidates as null (no MCPs needed, skip in future)
      let markedNoMcp = 0;
      if (nonCandidateIds.length > 0) {
        const { error: markErr } = await supabase
          .from("skills")
          .update({ required_mcps: null })
          .in("id", nonCandidateIds);
        if (!markErr) markedNoMcp = nonCandidateIds.length;
      }

      if (candidates.length === 0) {
        console.log(`[detect-mcps] No candidates in batch, marked ${markedNoMcp} as no-MCP`);
        return new Response(JSON.stringify({ success: true, mode: "detect-mcps", analyzed: 0, detected: 0, marked_no_mcp: markedNoMcp }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const skills = candidates;

      if (error || !skills || skills.length === 0) {
        console.log(`[detect-mcps] No skills to analyze (${error?.message || "0 found"})`);
        return new Response(JSON.stringify({ success: true, mode: "detect-mcps", analyzed: 0, detected: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[detect-mcps] Analyzing ${skills.length} skills...`);
      let detected = 0;

      for (const skill of skills) {
        try {
          // Build context from available data
          const contextParts = [
            `Name: ${skill.display_name}`,
            `Category: ${skill.category}`,
            `Description: ${skill.description_human || "none"}`,
            skill.install_command ? `Install command: ${skill.install_command}` : "",
            skill.github_url ? `GitHub: ${skill.github_url}` : "",
            skill.readme_summary ? `README summary: ${skill.readme_summary.slice(0, 1500)}` : "",
          ].filter(Boolean).join("\n");

          const prompt = `You are an expert in MCP (Model Context Protocol) servers and developer tool dependencies.

Analyze this AI skill/tool and determine if it requires any external MCP servers or tools to function properly.

${contextParts}

An MCP server is needed when the skill interacts with:
- Email services (Gmail, Outlook, SMTP)
- Messaging (Slack, Discord, WhatsApp, Telegram)
- Cloud storage (Google Drive, Dropbox, S3)
- Databases (PostgreSQL, MySQL, MongoDB)
- Version control (GitHub, GitLab, Bitbucket)
- Project management (Jira, Linear, Asana, Trello)
- CRM (Salesforce, HubSpot)
- Web scraping/browsing (Puppeteer, Playwright, Firecrawl)
- File system access
- Calendar (Google Calendar, Outlook Calendar)
- Payment systems (Stripe)
- CI/CD (GitHub Actions, Jenkins)
- Cloud platforms (AWS, GCP, Azure)
- Search engines (Brave Search, Exa)
- Social media (Twitter/X, LinkedIn)
- Any other external API or service

If this skill is purely a prompt/instruction set that doesn't need external connections, return an empty array.
Be precise — only include MCPs that are truly required based on the evidence.`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [{ role: "user", content: prompt }],
              tools: [{
                type: "function",
                function: {
                  name: "set_required_mcps",
                  description: "Set the required MCP servers for this skill. Return empty array if none needed.",
                  parameters: {
                    type: "object",
                    properties: {
                      requires_external: { type: "boolean", description: "Whether this skill requires any external MCP servers" },
                      mcps: {
                        type: "array",
                        description: "List of required MCP servers. Empty if none needed.",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string", description: "MCP server name, e.g. 'GitHub MCP'" },
                            description: { type: "string", description: "What this MCP does for the skill, max 100 chars" },
                            url: { type: "string", description: "GitHub repo URL of the MCP server if known, or empty string" },
                            install_command: { type: "string", description: "Install command like 'npx @anthropic/mcp-server-github' or empty string" },
                            required_tools: {
                              type: "array",
                              items: { type: "string" },
                              description: "Specific tool names needed, e.g. ['send_email', 'search_inbox']"
                            },
                            credentials_needed: {
                              type: "array",
                              items: { type: "string" },
                              description: "Credentials the user must provide, e.g. ['GitHub PAT', 'OAuth token']"
                            },
                            optional: { type: "boolean", description: "Whether this MCP is optional (false = required)" }
                          },
                          required: ["name", "description", "required_tools", "optional"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["requires_external", "mcps"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "set_required_mcps" } },
            }),
          });

          if (aiRes.status === 429) {
            console.log("[detect-mcps] Rate limited, stopping batch");
            break;
          }
          if (!aiRes.ok) {
            console.error(`[detect-mcps] AI error ${aiRes.status} for ${skill.slug}`);
            continue;
          }

          const aiData = await aiRes.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall) { console.log(`[detect-mcps] No tool call for ${skill.slug}`); continue; }

          const args = JSON.parse(toolCall.function.arguments);

          if (args.requires_external && args.mcps && args.mcps.length > 0) {
            // Clean up MCP entries
            const cleanMcps = args.mcps.map((m: any) => ({
              name: m.name || "Unknown MCP",
              description: (m.description || "").slice(0, 200),
              url: m.url || "",
              install_command: m.install_command || "",
              required_tools: Array.isArray(m.required_tools) ? m.required_tools : [],
              credentials_needed: Array.isArray(m.credentials_needed) ? m.credentials_needed : [],
              optional: !!m.optional,
            }));

            const { error: updateErr } = await supabase
              .from("skills")
              .update({ required_mcps: cleanMcps })
              .eq("id", skill.id);

            if (!updateErr) {
              detected++;
              console.log(`[detect-mcps] ${skill.slug}: ${cleanMcps.length} MCP(s) detected`);
            } else {
              console.error(`[detect-mcps] Update error for ${skill.slug}:`, updateErr.message);
            }
          } else {
            // Mark as analyzed — set null to distinguish from "not yet analyzed" ([])
            await supabase.from("skills").update({ required_mcps: null }).eq("id", skill.id);
            console.log(`[detect-mcps] ${skill.slug}: no MCPs needed`);
          }

          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          console.error(`[detect-mcps] Error for ${skill.slug}:`, (e as Error).message);
        }
      }

      console.log(`[detect-mcps] Detected MCPs in ${detected}/${skills.length} skills, marked ${markedNoMcp} as no-MCP`);
      return new Response(JSON.stringify({
        success: true, mode: "detect-mcps",
        analyzed: skills.length, detected, marked_no_mcp: markedNoMcp,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODE: enrich — use AI to generate better descriptions ───
    console.log(`[enrich-ai] Starting batch of ${batchSize}...`);

    // Find skills with github_url but still poor descriptions after github-enrich
    const { data: skills, error } = await supabase
      .from("skills")
      .select("id, slug, display_name, tagline, description_human, github_url, category")
      .eq("status", "approved")
      .not("github_url", "is", null)
      .or("description_human.ilike.%ecosistema open-source%,tagline.ilike.%skill del ecosistema%")
      .limit(batchSize);

    if (error || !skills || skills.length === 0) {
      console.log(`[enrich-ai] No skills to enrich (${error?.message || "0 found"})`);
      return new Response(JSON.stringify({ success: true, enriched: 0, message: "No skills to enrich" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[enrich-ai] Processing ${skills.length} skills...`);
    let enriched = 0;

    // Process in small batches to avoid rate limits
    for (const skill of skills) {
      try {
        const ghMatch = skill.github_url?.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/);
        const repoName = ghMatch ? `${ghMatch[1]}/${ghMatch[2]}` : skill.display_name;

        const prompt = `You are a technical copywriter for a developer tools marketplace.

Given this tool/skill:
- Name: ${skill.display_name}
- GitHub: ${repoName}
- Current category: ${skill.category}
- Current description: ${skill.description_human || "none"}

Generate:
1. A tagline (max 120 chars, one sentence, what it does concisely)
2. A description (2-3 sentences, max 300 chars, what it does + who it's for + key benefit)

Both in English. Be specific and practical, not generic.`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: prompt }],
            tools: [{
              type: "function",
              function: {
                name: "set_descriptions",
                description: "Set the tagline and description for a skill",
                parameters: {
                  type: "object",
                  properties: {
                    tagline: { type: "string", description: "Short tagline, max 120 chars" },
                    description: { type: "string", description: "2-3 sentence description, max 300 chars" },
                  },
                  required: ["tagline", "description"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "set_descriptions" } },
          }),
        });

        if (aiRes.status === 429) {
          console.log("[enrich-ai] Rate limited, stopping batch");
          break;
        }
        if (!aiRes.ok) {
          console.error(`[enrich-ai] AI error ${aiRes.status} for ${skill.slug}`);
          continue;
        }

        const aiData = await aiRes.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) { console.log(`[enrich-ai] No tool call for ${skill.slug}`); continue; }

        const args = JSON.parse(toolCall.function.arguments);
        if (!args.tagline || !args.description) continue;

        const updates: Record<string, unknown> = {};
        // Only update if current is generic
        if (skill.tagline?.includes("Skill del ecosistema") || (skill.tagline || "").length < 10) {
          updates.tagline = args.tagline.slice(0, 120);
        }
        if (skill.description_human?.includes("ecosistema open-source") || (skill.description_human || "").length < 40) {
          updates.description_human = args.description.slice(0, 500);
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateErr } = await supabase.from("skills").update(updates).eq("id", skill.id);
          if (!updateErr) enriched++;
          else console.error(`[enrich-ai] Update error for ${skill.slug}:`, updateErr.message);
        }

        // Small delay between AI calls
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error(`[enrich-ai] Error for ${skill.slug}:`, (e as Error).message);
      }
    }

    console.log(`[enrich-ai] Enriched ${enriched}/${skills.length}`);
    return new Response(JSON.stringify({
      success: true, mode: "enrich",
      processed: skills.length, enriched,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[enrich-ai] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
