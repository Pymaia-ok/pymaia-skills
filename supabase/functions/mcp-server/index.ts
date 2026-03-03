import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const mcp = new McpServer({
  name: "skillhub",
  version: "1.0.0",
});

// Tool: Search skills
mcp.tool("search_skills", {
  description: "Search the SkillHub directory for Claude Code skills by name, tagline, or description.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query describing the task or skill needed" },
      industry: { type: "string", description: "Optional industry filter (e.g. marketing, legal, finanzas)" },
    },
    required: ["query"],
  },
  handler: async (args: { query: string; industry?: string }) => {
    let dbQuery = supabase
      .from("skills")
      .select("display_name, tagline, slug, avg_rating, review_count, install_count, install_command, industry, time_to_install_minutes")
      .eq("status", "approved")
      .order("avg_rating", { ascending: false })
      .limit(5);

    if (args.industry) dbQuery = dbQuery.contains("industry", [args.industry]);

    const { data: skills, error } = await dbQuery;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const q = args.query.toLowerCase();
    const matched = (skills || []).filter(
      (s: any) => s.display_name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q)
    );
    const results = matched.length > 0 ? matched : (skills || []).slice(0, 3);

    if (results.length === 0) return { content: [{ type: "text" as const, text: "No encontré skills relevantes." }] };

    const text = results
      .map((s: any) => `**${s.display_name}** (⭐ ${Number(s.avg_rating).toFixed(1)}, ${s.install_count} instalaciones)\n${s.tagline}\nInstalar: \`${s.install_command}\``)
      .join("\n\n---\n\n");

    return { content: [{ type: "text" as const, text }] };
  },
});

// Tool: Get skill details
mcp.tool("get_skill_details", {
  description: "Get detailed information about a specific skill including description, use cases, and install command.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "The slug identifier of the skill" },
    },
    required: ["slug"],
  },
  handler: async (args: { slug: string }) => {
    const { data: skill, error } = await supabase
      .from("skills").select("*").eq("slug", args.slug).eq("status", "approved").maybeSingle();

    if (error || !skill) return { content: [{ type: "text" as const, text: `Skill "${args.slug}" no encontrada.` }] };

    const useCases = Array.isArray(skill.use_cases)
      ? (skill.use_cases as { title: string; after: string }[]).map((uc) => `• ${uc.title}: ${uc.after}`).join("\n")
      : "";

    const text = `# ${skill.display_name}\n\n${skill.tagline}\n\n⭐ ${Number(skill.avg_rating).toFixed(1)} (${skill.review_count} reviews) · ${skill.install_count} instalaciones\n\n## Descripción\n${skill.description_human}\n\n${useCases ? `## Casos de uso\n${useCases}\n\n` : ""}## Instalación\n\`${skill.install_command}\``;

    return { content: [{ type: "text" as const, text }] };
  },
});

// Tool: List popular skills
mcp.tool("list_popular_skills", {
  description: "List the most popular skills sorted by installations or rating.",
  inputSchema: {
    type: "object",
    properties: {
      sort_by: { type: "string", description: "Sort by 'installs' or 'rating' (default: installs)" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
  },
  handler: async (args: { sort_by?: string; limit?: number }) => {
    const orderCol = args.sort_by === "rating" ? "avg_rating" : "install_count";
    const { data: skills, error } = await supabase
      .from("skills")
      .select("display_name, tagline, slug, avg_rating, install_count, install_command")
      .eq("status", "approved")
      .order(orderCol, { ascending: false })
      .limit(Math.min(args.limit || 5, 10));

    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const text = (skills || [])
      .map((s: any, i: number) => `${i + 1}. **${s.display_name}** — ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count} instalaciones\n   Instalar: \`${s.install_command}\``)
      .join("\n\n");

    return { content: [{ type: "text" as const, text: text || "No hay skills disponibles." }] };
  },
});

// Bind transport
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

// Two Hono apps pattern for Supabase Edge Functions
const app = new Hono();
const mcpApp = new Hono();

mcpApp.get("/", (c) => c.json({ message: "SkillHub MCP Server", endpoints: { mcp: "/mcp" } }));
mcpApp.all("/mcp", async (c) => await httpHandler(c.req.raw));

app.route("/mcp-server", mcpApp);

Deno.serve(app.fetch);
