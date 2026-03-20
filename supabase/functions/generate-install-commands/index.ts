// generate-install-commands v2 — Extract install commands from GitHub READMEs (skills + connectors)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { batchSize = 10, minStars = 0, table = "mcp_servers" } = await req.json().catch(() => ({}));

    const targetTable = table === "skills" ? "skills" : "mcp_servers";

    // Get items with github_url but no install_command
    const { data: items, error } = await supabase
      .from(targetTable)
      .select("id, slug, name, github_url, github_stars, readme_raw" + (targetTable === "skills" ? ", display_name" : ""))
      .eq("status", "approved")
      .not("github_url", "is", null)
      .neq("github_url", "")
      .or("install_command.eq.,install_command.is.null")
      .gte("github_stars", minStars)
      .order("github_stars", { ascending: false })
      .limit(batchSize);

    if (error) throw error;
    if (!items || items.length === 0) {
      return jsonRes({ processed: 0, message: "No items to process", table: targetTable });
    }

    const ghHeaders: Record<string, string> = { Accept: "application/vnd.github.v3.raw" };
    if (githubToken) ghHeaders["Authorization"] = `token ${githubToken}`;

    let generated = 0, rejected = 0, skipped = 0;

    for (const item of items) {
      try {
        const itemName = (item as any).display_name || item.name;
        let readme = item.readme_raw || "";

        if (!readme || readme.length < 50) {
          const match = item.github_url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
          if (!match) {
            await supabase.from(targetTable).update({ status: "rejected", updated_at: new Date().toISOString() } as any).eq("id", item.id);
            rejected++;
            continue;
          }
          const repo = match[1].replace(/\.git$/, "").replace(/\/$/, "");
          
          const res = await fetch(`https://api.github.com/repos/${repo}/readme`, { headers: ghHeaders });
          if (res.status === 403 || res.status === 429) break;
          if (res.status === 404) {
            await supabase.from(targetTable).update({ status: "rejected", updated_at: new Date().toISOString() } as any).eq("id", item.id);
            rejected++;
            continue;
          }
          if (!res.ok) { skipped++; continue; }
          readme = await res.text();
          if (readme.length > 15000) readme = readme.slice(0, 15000);
        }

        let installCmd = extractInstallCommand(readme, item.github_url, itemName);

        if (!installCmd && lovableApiKey && (item.github_stars ?? 0) >= 10) {
          installCmd = await aiExtractCommand(lovableApiKey, readme, itemName, item.github_url);
        }

        if (installCmd) {
          const updateData: Record<string, any> = {
            install_command: installCmd,
            updated_at: new Date().toISOString(),
          };
          if (!item.readme_raw) updateData.readme_raw = readme;
          
          await supabase.from(targetTable).update(updateData as any).eq("id", item.id);
          generated++;
          console.log(`✅ [${targetTable}] ${item.slug}: ${installCmd.slice(0, 80)}...`);
        } else if ((item.github_stars ?? 0) < 5) {
          await supabase.from(targetTable).update({ status: "rejected", updated_at: new Date().toISOString() } as any).eq("id", item.id);
          rejected++;
        } else {
          skipped++;
          await supabase.from(targetTable).update({ updated_at: new Date().toISOString() } as any).eq("id", item.id);
        }
      } catch (e) {
        console.error(`Error ${item.slug}:`, e);
        skipped++;
      }
    }

    await supabase.from("automation_logs").insert({
      function_name: "generate-install-commands",
      action_type: "batch_generate",
      reason: `[${targetTable}] Generated ${generated}, rejected ${rejected}, skipped ${skipped} of ${items.length}`,
      metadata: { generated, rejected, skipped, total: items.length, table: targetTable },
    });

    return jsonRes({ generated, rejected, skipped, processed: items.length, table: targetTable });
  } catch (e) {
    console.error("Error:", (e as Error).message);
    return jsonRes({ error: (e as Error).message }, 500);
  }
});

function extractInstallCommand(readme: string, githubUrl: string, name: string): string | null {
  // Pattern 1: npx command
  const npxMatch = readme.match(/(?:```[^\n]*\n)?\s*(npx\s+(?:-y\s+)?@?[\w\/-]+[\w@.\/-]*)/m);
  if (npxMatch) return npxMatch[1].trim();

  // Pattern 2: claude mcp add
  const claudeMatch = readme.match(/(?:```[^\n]*\n)?\s*(claude\s+mcp\s+add\s+[^\n]+)/m);
  if (claudeMatch) return claudeMatch[1].trim();

  // Pattern 3: JSON config block with mcpServers
  const jsonMatch = readme.match(/({\s*"mcpServers"\s*:\s*{[\s\S]*?}\s*})\s*\n?\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.mcpServers) return jsonMatch[1].trim();
    } catch { /* not valid JSON */ }
  }

  // Pattern 4: uvx command (Python MCP servers)
  const uvxMatch = readme.match(/(?:```[^\n]*\n)?\s*(uvx\s+[\w@.\/-]+)/m);
  if (uvxMatch) return uvxMatch[1].trim();

  // Pattern 5: pip install + python run
  const pipMatch = readme.match(/pip\s+install\s+([\w-]+)/);
  if (pipMatch) {
    const pkg = pipMatch[1];
    return `pip install ${pkg} && python -m ${pkg}`;
  }

  // Pattern 6: Docker
  const dockerMatch = readme.match(/(docker\s+run\s+[^\n]+)/m);
  if (dockerMatch) return dockerMatch[1].trim();

  // Pattern 7: npm package name from package.json reference
  const npmMatch = readme.match(/npm\s+(?:install|i)\s+(?:-g\s+)?(@?[\w\/-]+)/);
  if (npmMatch) return `npx -y ${npmMatch[1]}`;

  return null;
}

async function aiExtractCommand(
  apiKey: string, readme: string, name: string, githubUrl: string
): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You extract MCP server install commands from READMEs. Return ONLY the install command or JSON config, nothing else. Prefer: 1) npx command 2) claude mcp add command 3) JSON mcpServers config 4) uvx/pip command 5) docker run. If the README doesn't contain a clear install method for an MCP server, return "NONE".`,
          },
          {
            role: "user",
            content: `Tool: "${name}"\nGitHub: ${githubUrl}\n\nREADME (first 4000 chars):\n${readme.slice(0, 4000)}`,
          },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content === "NONE" || content.length < 5 || content.length > 2000) return null;
    return content;
  } catch {
    return null;
  }
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
