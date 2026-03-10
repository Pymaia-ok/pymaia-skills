import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const mcp = new McpServer({
  name: "pymaia-agent",
  version: "5.0.0",
});

// Sanitize queries for PostgREST .or() filter parsing
function sanitizeForPostgrest(query: string): string {
  return query.replace(/[,()."\\]/g, "").trim().toLowerCase();
}

// Build word-split fallback query for multi-word searches
async function wordSplitSearch(
  table: "skills" | "mcp_servers" | "plugins",
  selectCols: string,
  words: string[],
  orderCol: string,
  limit: number,
  extraFilters?: (q: any) => any,
): Promise<any[]> {
  const nameCol = table === "skills" ? "display_name" : "name";
  const descCol = "description";
  // Build a query that matches ALL words (each word must appear in at least one field)
  let q = supabase.from(table).select(selectCols);
  if (table === "skills") q = q.eq("status", "approved");
  else q = q.eq("status", "approved");
  
  for (const word of words) {
    const cols = [`${nameCol}.ilike.%${word}%`, `slug.ilike.%${word}%`, `${descCol}.ilike.%${word}%`];
    if (table === "mcp_servers") cols.push(`description_es.ilike.%${word}%`);
    if (table === "skills") {
      cols.push(`tagline.ilike.%${word}%`);
      cols.push(`tagline_es.ilike.%${word}%`);
    }
    if (table === "plugins") cols.push(`description_es.ilike.%${word}%`);
    q = q.or(cols.join(","));
  }
  
  if (extraFilters) q = extraFilters(q);
  q = q.order(orderCol, { ascending: false }).limit(limit);
  
  const { data } = await q;
  return data || [];
}

// ─── DISCOVERY TOOLS ───

mcp.tool("search_skills", {
  description: "Search the SkillHub directory for Agent Skills by name, tagline, or description. Returns install command, rating, and install count.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query describing the task or skill needed" },
      category: { type: "string", description: "Optional category filter: desarrollo, diseño, marketing, automatización, productividad, legal, negocios, creatividad, datos, ia" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
    required: ["query"],
  },
  handler: async (args: { query: string; category?: string; limit?: number }) => {
    const lim = Math.min(args.limit || 5, 10);
    const q = sanitizeForPostgrest(args.query);

    let dbQuery = supabase
      .from("skills")
      .select("display_name, tagline, slug, avg_rating, review_count, install_count, install_command, category, target_roles")
      .eq("status", "approved")
      .or(`display_name.ilike.%${q}%,tagline.ilike.%${q}%,slug.ilike.%${q}%`)
      .order("install_count", { ascending: false })
      .limit(lim);

    if (args.category) dbQuery = dbQuery.eq("category", args.category);

    const { data: matched, error } = await dbQuery;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    let results = matched || [];

    // Word-split fallback for multi-word queries
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    if (results.length === 0 && words.length > 1) {
      results = await wordSplitSearch(
        "skills",
        "display_name, tagline, slug, avg_rating, review_count, install_count, install_command, category, target_roles",
        words, "install_count", lim,
        args.category ? (qb: any) => qb.eq("category", args.category) : undefined,
      );
    }

    // Fallback to top skills if still no match
    if (results.length === 0) {
      let fallback = supabase
        .from("skills")
        .select("display_name, tagline, slug, avg_rating, review_count, install_count, install_command, category, target_roles")
        .eq("status", "approved")
        .order("install_count", { ascending: false })
        .limit(3);
      if (args.category) fallback = fallback.eq("category", args.category);
      const { data: topData } = await fallback;
      results = topData || [];
    }

    if (results.length === 0) return { content: [{ type: "text" as const, text: "No encontré skills relevantes." }] };

    const text = results
      .map((s: any) => `**${s.display_name}** [${s.category}] (⭐ ${Number(s.avg_rating).toFixed(1)}, ${s.install_count.toLocaleString()} installs)\n${s.tagline}\nInstalar: \`${s.install_command}\``)
      .join("\n\n---\n\n");

    return { content: [{ type: "text" as const, text }] };
  },
});

mcp.tool("get_skill_details", {
  description: "Get detailed information about a specific skill including description, use cases, category, and install command.",
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

    const text = `# ${skill.display_name}\n\n📂 Categoría: ${skill.category}\n🎯 Roles: ${skill.target_roles?.join(", ") || "todos"}\n\n${skill.tagline}\n\n⭐ ${Number(skill.avg_rating).toFixed(1)} (${skill.review_count} reviews) · ${skill.install_count.toLocaleString()} instalaciones\n\n## Descripción\n${skill.description_human}\n\n${useCases ? `## Casos de uso\n${useCases}\n\n` : ""}## Instalación\n\`${skill.install_command}\``;

    return { content: [{ type: "text" as const, text }] };
  },
});

// ─── RANKING TOOLS ───

mcp.tool("list_popular_skills", {
  description: "List the most popular skills sorted by installations or rating. Optionally filter by category.",
  inputSchema: {
    type: "object",
    properties: {
      sort_by: { type: "string", description: "Sort by 'installs' or 'rating' (default: installs)" },
      category: { type: "string", description: "Optional category filter" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
  },
  handler: async (args: { sort_by?: string; category?: string; limit?: number }) => {
    const orderCol = args.sort_by === "rating" ? "avg_rating" : "install_count";
    let q = supabase
      .from("skills")
      .select("display_name, tagline, slug, avg_rating, install_count, install_command, category")
      .eq("status", "approved")
      .order(orderCol, { ascending: false })
      .limit(Math.min(args.limit || 5, 10));

    if (args.category) q = q.eq("category", args.category);

    const { data: skills, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const text = (skills || [])
      .map((s: any, i: number) => `${i + 1}. **${s.display_name}** [${s.category}] — ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs\n   \`${s.install_command}\``)
      .join("\n\n");

    return { content: [{ type: "text" as const, text: text || "No hay skills disponibles." }] };
  },
});

mcp.tool("list_new_skills", {
  description: "List the most recently added skills to the directory.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
  },
  handler: async (args: { limit?: number }) => {
    const { data: skills, error } = await supabase
      .from("skills")
      .select("display_name, tagline, slug, install_count, install_command, category, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(Math.min(args.limit || 5, 10));

    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const text = (skills || [])
      .map((s: any, i: number) => {
        const date = new Date(s.created_at).toLocaleDateString("es");
        return `${i + 1}. **${s.display_name}** [${s.category}] — ${s.tagline}\n   📅 ${date} · ${s.install_count.toLocaleString()} installs\n   \`${s.install_command}\``;
      })
      .join("\n\n");

    return { content: [{ type: "text" as const, text: text || "No hay skills nuevas." }] };
  },
});

// ─── CATEGORIZATION TOOLS ───

mcp.tool("list_categories", {
  description: "List all available skill categories with the number of skills in each.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    const { data: skills, error } = await supabase
      .from("skills")
      .select("category")
      .eq("status", "approved");

    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const counts: Record<string, number> = {};
    for (const s of skills || []) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }

    const categoryDescriptions: Record<string, string> = {
      desarrollo: "🛠️ Frameworks, best practices, y herramientas de código",
      diseño: "🎨 UI/UX, sistemas de diseño, y guidelines visuales",
      marketing: "📣 SEO, copywriting, contenido, y analytics",
      automatización: "⚡ Navegación web, scraping, y flujos automatizados",
      productividad: "🚀 Brainstorming, organización, y eficiencia",
      legal: "⚖️ Documentos legales, contratos, y compliance",
      negocios: "💼 Presentaciones, pitch decks, y estrategia",
      creatividad: "✨ Video, animación, y contenido creativo",
      datos: "📊 Análisis de datos, extracción, y visualización",
      ia: "🤖 Modelos de IA, agentes, y herramientas inteligentes",
      general: "📦 Otras skills del ecosistema",
    };

    const text = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${categoryDescriptions[cat] || cat} — **${cat}** (${count} skills)`)
      .join("\n");

    return { content: [{ type: "text" as const, text: `# Categorías disponibles\n\n${text}` }] };
  },
});

mcp.tool("search_by_role", {
  description: "Find the best skills for a specific professional role: marketer, abogado, consultor, founder, diseñador, or general.",
  inputSchema: {
    type: "object",
    properties: {
      role: { type: "string", description: "Professional role: marketer, abogado, consultor, founder, disenador, otro" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
    required: ["role"],
  },
  handler: async (args: { role: string; limit?: number }) => {
    const { data: skills, error } = await supabase
      .from("skills")
      .select("display_name, tagline, slug, avg_rating, install_count, install_command, category, target_roles")
      .eq("status", "approved")
      .contains("target_roles", [args.role])
      .order("install_count", { ascending: false })
      .limit(Math.min(args.limit || 5, 10));

    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    if (!skills?.length) return { content: [{ type: "text" as const, text: `No encontré skills para el rol "${args.role}".` }] };

    const roleLabels: Record<string, string> = {
      marketer: "📣 Marketer", abogado: "⚖️ Abogado", consultor: "💼 Consultor",
      founder: "🚀 Founder", disenador: "🎨 Diseñador", otro: "✨ General",
    };

    const text = skills
      .map((s: any, i: number) => `${i + 1}. **${s.display_name}** [${s.category}] — ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs\n   \`${s.install_command}\``)
      .join("\n\n");

    return { content: [{ type: "text" as const, text: `# Skills para ${roleLabels[args.role] || args.role}\n\n${text}` }] };
  },
});

// ─── RECOMMENDATION TOOLS ───

mcp.tool("recommend_for_task", {
  description: "Get skill recommendations based on a specific task you want to accomplish. Describe what you need to do and get the best matching skills.",
  inputSchema: {
    type: "object",
    properties: {
      task: { type: "string", description: "Describe the task you want to accomplish (e.g., 'crear contenido para redes sociales', 'revisar un contrato', 'automatizar reportes')" },
      role: { type: "string", description: "Optional: your professional role for better recommendations" },
    },
    required: ["task"],
  },
  handler: async (args: { task: string; role?: string }) => {
    let q = supabase
      .from("skills")
      .select("display_name, tagline, slug, avg_rating, install_count, install_command, category, target_roles, description_human, industry")
      .eq("status", "approved")
      .order("install_count", { ascending: false })
      .limit(20);

    if (args.role) q = q.contains("target_roles", [args.role]);

    const { data: skills, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const taskLower = args.task.toLowerCase();
    const keywords = taskLower.split(/\s+/).filter(w => w.length > 3);

    const scored = (skills || []).map((s: any) => {
      let score = 0;
      const searchable = `${s.display_name} ${s.tagline} ${s.description_human} ${(s.industry || []).join(" ")}`.toLowerCase();
      for (const kw of keywords) {
        if (searchable.includes(kw)) score += 2;
      }
      if (s.install_count > 100000) score += 3;
      else if (s.install_count > 50000) score += 2;
      else if (s.install_count > 10000) score += 1;
      score += Number(s.avg_rating) * 0.5;
      return { ...s, score };
    });

    const results = scored.sort((a: any, b: any) => b.score - a.score).slice(0, 5);
    if (results.length === 0) return { content: [{ type: "text" as const, text: "No encontré skills relevantes para esa tarea." }] };

    const text = results
      .map((s: any, i: number) => `${i + 1}. **${s.display_name}** [${s.category}]\n   ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs\n   \`${s.install_command}\``)
      .join("\n\n");

    return { content: [{ type: "text" as const, text: `# Recomendaciones para: "${args.task}"\n\n${text}` }] };
  },
});

mcp.tool("compare_skills", {
  description: "Compare two or more skills side by side to decide which one to install.",
  inputSchema: {
    type: "object",
    properties: {
      slugs: { type: "array", items: { type: "string" }, description: "Array of skill slugs to compare (2-4 skills)" },
    },
    required: ["slugs"],
  },
  handler: async (args: { slugs: string[] }) => {
    const { data: skills, error } = await supabase
      .from("skills")
      .select("*")
      .in("slug", args.slugs)
      .eq("status", "approved");

    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    if (!skills?.length) return { content: [{ type: "text" as const, text: "No encontré las skills solicitadas." }] };

    const text = skills.map((s: any) =>
      `## ${s.display_name}\n📂 ${s.category} · 🎯 ${s.target_roles?.join(", ")}\n⭐ ${Number(s.avg_rating).toFixed(1)} (${s.review_count} reviews) · ${s.install_count.toLocaleString()} installs\n⏱️ ${s.time_to_install_minutes} min instalación\n\n${s.tagline}\n\n\`${s.install_command}\``
    ).join("\n\n---\n\n");

    return { content: [{ type: "text" as const, text: `# Comparación de Skills\n\n${text}` }] };
  },
});

// Deduplicate connectors by brand: prefer is_official, then curated source, then highest stars
function deduplicateConnectors(connectors: any[]): any[] {
  const brandMap = new Map<string, any>();
  for (const c of connectors) {
    // Normalize brand key: lowercase, remove common suffixes like -mcp, -server
    const brand = c.name.toLowerCase().replace(/[-_](mcp|server|connector)$/i, "").replace(/\s+/g, "-");
    const existing = brandMap.get(brand);
    if (!existing) {
      brandMap.set(brand, c);
    } else {
      // Prefer official, then higher stars
      if (c.is_official && !existing.is_official) {
        brandMap.set(brand, c);
      } else if (c.is_official === existing.is_official && (c.github_stars || 0) > (existing.github_stars || 0)) {
        brandMap.set(brand, c);
      }
    }
  }
  return Array.from(brandMap.values());
}

// ─── CONNECTOR TOOLS ───

mcp.tool("search_connectors", {
  description: "Search MCP connectors (integrations) by name, category, or description. Connectors give Claude access to external tools and services like Slack, GitHub, databases, etc.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      category: { type: "string", description: "Optional category filter: dev-tools, data, communication, productivity, ai, cloud, design, business, finance, marketing, security, analytics, automation" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
    required: ["query"],
  },
  handler: async (args: { query: string; category?: string; limit?: number }) => {
    const lim = Math.min(args.limit || 5, 10);
    const queryLower = sanitizeForPostgrest(args.query);

    let q = supabase
      .from("mcp_servers")
      .select("name, slug, description, description_es, category, github_stars, github_url, install_command, is_official, icon_url")
      .eq("status", "approved")
      .or(`name.ilike.%${queryLower}%,slug.ilike.%${queryLower}%,description.ilike.%${queryLower}%,description_es.ilike.%${queryLower}%`)
      .order("github_stars", { ascending: false })
      .limit(lim);

    if (args.category) q = q.eq("category", args.category);

    const { data: matched, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    let results = deduplicateConnectors(matched || []);

    // Word-split fallback for multi-word queries
    const words = queryLower.split(/\s+/).filter(w => w.length >= 2);
    if (results.length === 0 && words.length > 1) {
      const fallbackData = await wordSplitSearch(
        "mcp_servers",
        "name, slug, description, description_es, category, github_stars, github_url, install_command, is_official, icon_url",
        words, "github_stars", lim,
        args.category ? (qb: any) => qb.eq("category", args.category) : undefined,
      );
      results = deduplicateConnectors(fallbackData);
    }

    if (results.length === 0) {
      let fallback = supabase
        .from("mcp_servers")
        .select("name, slug, description, description_es, category, github_stars, github_url, install_command, is_official, icon_url")
        .eq("status", "approved")
        .order("github_stars", { ascending: false })
        .limit(3);
      if (args.category) fallback = fallback.eq("category", args.category);
      const { data: topData } = await fallback;
      results = deduplicateConnectors(topData || []);
    }

    if (results.length === 0) return { content: [{ type: "text" as const, text: "No connectors found." }] };

    const text = results
      .map((c: any) => `**${c.name}** [${c.category}]${c.is_official ? " ✅ Official" : ""} (⭐ ${(c.github_stars || 0).toLocaleString()} GitHub stars)\n${c.description}\n${c.github_url ? `GitHub: ${c.github_url}` : ""}`)
      .join("\n\n---\n\n");

    return { content: [{ type: "text" as const, text }] };
  },
});

mcp.tool("get_connector_details", {
  description: "Get detailed information about a specific MCP connector by slug.",
  inputSchema: {
    type: "object",
    properties: { slug: { type: "string", description: "The slug identifier of the connector" } },
    required: ["slug"],
  },
  handler: async (args: { slug: string }) => {
    const { data: c, error } = await supabase
      .from("mcp_servers").select("*").eq("slug", args.slug).eq("status", "approved").maybeSingle();

    if (error || !c) return { content: [{ type: "text" as const, text: `Connector "${args.slug}" not found.` }] };

    const creds = Array.isArray(c.credentials_needed) && c.credentials_needed.length > 0
      ? `\n🔑 Credentials: ${c.credentials_needed.join(", ")}` : "";

    const text = `# ${c.name}${c.is_official ? " ✅ Official" : ""}\n\n📂 Category: ${c.category}\n⭐ ${(c.github_stars || 0).toLocaleString()} GitHub stars${creds}\n🔒 Security: ${c.security_status}\n\n${c.description}\n\n${c.github_url ? `GitHub: ${c.github_url}\n` : ""}${c.homepage ? `Homepage: ${c.homepage}\n` : ""}${c.docs_url ? `Docs: ${c.docs_url}\n` : ""}\n## Install\n\`\`\`\n${c.install_command}\n\`\`\``;

    return { content: [{ type: "text" as const, text }] };
  },
});

mcp.tool("list_popular_connectors", {
  description: "List the most popular MCP connectors sorted by GitHub stars.",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string", description: "Optional category filter" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
  },
  handler: async (args: { category?: string; limit?: number }) => {
    let q = supabase
      .from("mcp_servers")
      .select("name, slug, description, category, github_stars, is_official, install_command")
      .eq("status", "approved")
      .order("github_stars", { ascending: false })
      .limit(Math.min(args.limit || 5, 10));

    if (args.category) q = q.eq("category", args.category);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const text = (data || [])
      .map((c: any, i: number) => `${i + 1}. **${c.name}** [${c.category}]${c.is_official ? " ✅" : ""} — ${c.description}\n   ⭐ ${(c.github_stars || 0).toLocaleString()} stars`)
      .join("\n\n");

    return { content: [{ type: "text" as const, text: text || "No connectors available." }] };
  },
});

// ─── PLUGIN TOOLS ───

mcp.tool("search_plugins", {
  description: "Search plugins for Claude Code and Cowork platforms by name or category.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      category: { type: "string", description: "Optional category filter: development, productivity, design, data, marketing, business, communication, security, ai, education" },
      platform: { type: "string", description: "Optional platform filter: claude-code, cowork" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
    required: ["query"],
  },
  handler: async (args: { query: string; category?: string; platform?: string; limit?: number }) => {
    const lim = Math.min(args.limit || 5, 10);
    const queryLower = sanitizeForPostgrest(args.query);

    let q = supabase
      .from("plugins")
      .select("name, slug, description, category, platform, github_stars, github_url, is_official, is_anthropic_verified, install_count")
      .eq("status", "approved")
      .or(`name.ilike.%${queryLower}%,slug.ilike.%${queryLower}%,description.ilike.%${queryLower}%`)
      .order("install_count", { ascending: false })
      .limit(lim);

    if (args.category) q = q.eq("category", args.category);
    if (args.platform) q = q.eq("platform", args.platform);

    const { data: matched, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    let results = matched || [];

    // Word-split fallback for multi-word queries
    const words = queryLower.split(/\s+/).filter(w => w.length >= 2);
    if (results.length === 0 && words.length > 1) {
      results = await wordSplitSearch(
        "plugins",
        "name, slug, description, category, platform, github_stars, github_url, is_official, is_anthropic_verified, install_count",
        words, "install_count", lim,
        (qb: any) => {
          if (args.category) qb = qb.eq("category", args.category);
          if (args.platform) qb = qb.eq("platform", args.platform);
          return qb;
        },
      );
    }

    if (results.length === 0) {
      let fallback = supabase
        .from("plugins")
        .select("name, slug, description, category, platform, github_stars, github_url, is_official, is_anthropic_verified, install_count")
        .eq("status", "approved")
        .order("install_count", { ascending: false })
        .limit(3);
      if (args.category) fallback = fallback.eq("category", args.category);
      if (args.platform) fallback = fallback.eq("platform", args.platform);
      const { data: topData } = await fallback;
      results = topData || [];
    }

    if (results.length === 0) return { content: [{ type: "text" as const, text: "No plugins found." }] };

    const text = results
      .map((p: any) => {
        const badges = [p.is_anthropic_verified ? "🏅 Anthropic Verified" : "", p.is_official ? "✅ Official" : ""].filter(Boolean).join(" ");
        return `**${p.name}** [${p.category}] ${badges}\n${p.description}\n📦 ${p.platform} · ${p.install_count.toLocaleString()} installs`;
      })
      .join("\n\n---\n\n");

    return { content: [{ type: "text" as const, text }] };
  },
});

mcp.tool("get_plugin_details", {
  description: "Get detailed information about a specific plugin by slug.",
  inputSchema: {
    type: "object",
    properties: { slug: { type: "string", description: "The slug identifier of the plugin" } },
    required: ["slug"],
  },
  handler: async (args: { slug: string }) => {
    const { data: p, error } = await supabase
      .from("plugins").select("*").eq("slug", args.slug).eq("status", "approved").maybeSingle();

    if (error || !p) return { content: [{ type: "text" as const, text: `Plugin "${args.slug}" not found.` }] };

    const badges = [p.is_anthropic_verified ? "🏅 Anthropic Verified" : "", p.is_official ? "✅ Official" : ""].filter(Boolean).join(" · ");

    const text = `# ${p.name} ${badges}\n\n📂 Category: ${p.category}\n📦 Platform: ${p.platform}\n⭐ ${p.github_stars.toLocaleString()} GitHub stars · ${p.install_count.toLocaleString()} installs\n🔒 Security: ${p.security_status}\n\n${p.description}\n\n${p.github_url ? `GitHub: ${p.github_url}\n` : ""}${p.homepage ? `Homepage: ${p.homepage}` : ""}`;

    return { content: [{ type: "text" as const, text }] };
  },
});

mcp.tool("list_popular_plugins", {
  description: "List the most popular plugins sorted by installations.",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string", description: "Optional category filter" },
      platform: { type: "string", description: "Optional platform: claude-code, cowork" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
  },
  handler: async (args: { category?: string; platform?: string; limit?: number }) => {
    let q = supabase
      .from("plugins")
      .select("name, slug, description, category, platform, install_count, is_official, is_anthropic_verified")
      .eq("status", "approved")
      .order("install_count", { ascending: false })
      .limit(Math.min(args.limit || 5, 10));

    if (args.category) q = q.eq("category", args.category);
    if (args.platform) q = q.eq("platform", args.platform);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const text = (data || [])
      .map((p: any, i: number) => {
        const badge = p.is_anthropic_verified ? " 🏅" : p.is_official ? " ✅" : "";
        return `${i + 1}. **${p.name}**${badge} [${p.category}] — ${p.description}\n   📦 ${p.platform} · ${p.install_count.toLocaleString()} installs`;
      })
      .join("\n\n");

    return { content: [{ type: "text" as const, text: text || "No plugins available." }] };
  },
});

// ─── UNIFIED SEARCH ───

mcp.tool("explore_directory", {
  description: "Search across the entire Pymaia directory — skills, MCP connectors, and plugins — in a single query. Great for broad discovery.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query describing what you're looking for" },
      limit: { type: "number", description: "Max results per type (default: 3)" },
    },
    required: ["query"],
  },
  handler: async (args: { query: string; limit?: number }) => {
    const lim = Math.min(args.limit || 3, 5);
    const q = sanitizeForPostgrest(args.query);
    const words = q.split(/\s+/).filter(w => w.length >= 2);

    async function searchTable(table: "skills" | "mcp_servers" | "plugins", selectCols: string, orderCol: string) {
      const nameCol = table === "skills" ? "display_name" : "name";
      let query = supabase.from(table).select(selectCols).eq("status", "approved")
        .or(`${nameCol}.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`)
        .order(orderCol, { ascending: false }).limit(lim);
      const { data } = await query;
      if ((data || []).length > 0) return data!;
      // Word-split fallback
      if (words.length > 1) {
        return await wordSplitSearch(table, selectCols, words, orderCol, lim);
      }
      return [];
    }

    const [skills, connectorsRaw, plugins] = await Promise.all([
      searchTable("skills", "display_name, tagline, slug, category, install_count, install_command", "install_count"),
      searchTable("mcp_servers", "name, description, slug, category, github_stars, is_official", "github_stars"),
      searchTable("plugins", "name, description, slug, category, platform, install_count, is_official", "install_count"),
    ]);

    const connectors = deduplicateConnectors(connectorsRaw);

    const sections: string[] = [];

    if (skills.length > 0) {
      sections.push("## 🧠 Skills\n\n" + skills.map((s: any) => `- **${s.display_name}** [${s.category}] — ${s.tagline}\n  \`${s.install_command}\``).join("\n"));
    }
    if (connectors.length > 0) {
      sections.push("## 🔌 MCP Connectors\n\n" + connectors.map((c: any) => `- **${c.name}** [${c.category}]${c.is_official ? " ✅" : ""} — ${c.description}`).join("\n"));
    }
    if (plugins.length > 0) {
      sections.push("## 🧩 Plugins\n\n" + plugins.map((p: any) => `- **${p.name}** [${p.category}] (${p.platform}) — ${p.description}`).join("\n"));
    }

    if (sections.length === 0) return { content: [{ type: "text" as const, text: `No results found for "${args.query}".` }] };

    return { content: [{ type: "text" as const, text: `# Directory results for "${args.query}"\n\n${sections.join("\n\n")}` }] };
  },
});

// ─── HELPERS: Cross-catalog search & compatibility ───

async function crossCatalogSearch(keywords: string[], limit = 5) {
  const results: { skills: any[]; connectors: any[]; plugins: any[] } = { skills: [], connectors: [], plugins: [] };
  
  for (const kw of keywords.slice(0, 6)) {
    const q = sanitizeForPostgrest(kw);
    if (!q || q.length < 2) continue;
    
    const [{ data: sk }, { data: mc }, { data: pl }] = await Promise.all([
      supabase.from("skills")
        .select("display_name, slug, tagline, category, avg_rating, install_count, install_command, trust_score, security_status, github_stars")
        .eq("status", "approved")
        .or(`display_name.ilike.%${q}%,tagline.ilike.%${q}%,slug.ilike.%${q}%,category.ilike.%${q}%`)
        .order("install_count", { ascending: false }).limit(limit),
      supabase.from("mcp_servers")
        .select("name, slug, description, category, github_stars, is_official, install_command, trust_score, security_status")
        .eq("status", "approved")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
        .order("github_stars", { ascending: false }).limit(limit),
      supabase.from("plugins")
        .select("name, slug, description, category, platform, install_count, is_official, is_anthropic_verified, trust_score, security_status, github_stars")
        .eq("status", "approved")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
        .order("install_count", { ascending: false }).limit(limit),
    ]);
    
    if (sk) results.skills.push(...sk);
    if (mc) results.connectors.push(...mc);
    if (pl) results.plugins.push(...pl);
  }
  
  const seenSlugs = new Set<string>();
  results.skills = results.skills.filter(s => { if (seenSlugs.has(s.slug)) return false; seenSlugs.add(s.slug); return true; });
  results.connectors = deduplicateConnectors(results.connectors.filter(c => { if (seenSlugs.has(c.slug)) return false; seenSlugs.add(c.slug); return true; }));
  results.plugins = results.plugins.filter(p => { if (seenSlugs.has(p.slug)) return false; seenSlugs.add(p.slug); return true; });
  
  return results;
}

async function getCompatibilityWarnings(items: any[]): Promise<string[]> {
  const warnings: string[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const { data } = await supabase
        .from("compatibility_matrix")
        .select("*")
        .or(`and(item_a_slug.eq.${items[i].slug},item_b_slug.eq.${items[j].slug}),and(item_a_slug.eq.${items[j].slug},item_b_slug.eq.${items[i].slug})`)
        .limit(1);
      const compat = data?.[0];
      if (compat) {
        if (compat.status === "conflict") warnings.push(`⛔ **Conflict**: ${items[i].name} + ${items[j].name} — ${compat.reason}`);
        else if (compat.status === "redundant") warnings.push(`⚠️ **Redundant**: ${items[i].name} + ${items[j].name} — ${compat.reason}`);
        else if (compat.status === "recommended" && compat.data_flow) warnings.push(`✅ **Synergy**: ${items[i].name} + ${items[j].name} — ${compat.data_flow}`);
      }
    }
  }
  return warnings;
}

// ─── AGENT TOOLS (Pymaia Agent v5 — AI Solutions Architect) ───

mcp.tool("solve_goal", {
  description: "Given a business goal, Pymaia Agent searches 35K+ skills/MCPs/plugins and returns TWO options (A: simple, B: flexible) with trust scores, compatibility analysis, security warnings, and step-by-step installation. The core AI Solutions Architect tool.",
  inputSchema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "The user's goal in natural language (e.g., 'automate outbound sales', 'set up CI/CD pipeline')" },
      role: { type: "string", description: "Optional: user's professional role" },
      technical_level: { type: "string", description: "Optional: non-technical, semi-technical, technical, developer" },
      budget: { type: "string", description: "Optional: free-only, paid-ok, enterprise" },
    },
    required: ["goal"],
  },
  handler: async (args: { goal: string; role?: string; technical_level?: string; budget?: string }) => {
    const goalLower = args.goal.toLowerCase();

    // 1. Match goal templates
    const { data: templates } = await supabase.from("goal_templates").select("*").eq("is_active", true);
    let matchedTemplate: any = null;
    let bestScore = 0;
    for (const t of templates || []) {
      let score = 0;
      for (const trigger of (t.triggers || [])) {
        if (goalLower.includes(trigger.toLowerCase())) score += trigger.length;
      }
      if (score > bestScore) { bestScore = score; matchedTemplate = t; }
    }

    const capabilities = matchedTemplate?.capabilities || [];
    const templateDomain = matchedTemplate?.domain || "general";

    // 2. Collect all search keywords
    const allKeywords: string[] = [];
    for (const cap of capabilities) { if (cap.keywords) allKeywords.push(...cap.keywords); }
    const goalWords = goalLower.split(/\s+/).filter((w: string) => w.length >= 3);
    allKeywords.push(...goalWords);
    const uniqueKeywords = [...new Set(allKeywords)];

    // 3. Cross-catalog search
    const searchResults = await crossCatalogSearch(uniqueKeywords, 8);
    const allItems = [
      ...searchResults.skills.map((s: any) => ({ ...s, type: "skill", name: s.display_name, desc: s.tagline })),
      ...searchResults.connectors.map((c: any) => ({ ...c, type: "connector", desc: c.description })),
      ...searchResults.plugins.map((p: any) => ({ ...p, type: "plugin", desc: p.description })),
    ];

    // 4. Score by relevance
    const scored = allItems.map((item: any) => {
      let score = 0;
      const searchable = `${item.name} ${item.desc || ""} ${item.category || ""}`.toLowerCase();
      for (const kw of goalWords) { if (searchable.includes(kw)) score += 3; }
      for (const kw of uniqueKeywords) { if (searchable.includes(kw.toLowerCase())) score += 1; }
      const stars = item.github_stars || item.install_count || 0;
      if (stars > 10000) score += 5; else if (stars > 1000) score += 3; else if (stars > 100) score += 1;
      if (item.is_official) score += 3;
      if (item.is_anthropic_verified) score += 2;
      score += (item.trust_score || 0) / 20;
      return { ...item, relevance: score };
    }).sort((a: any, b: any) => b.relevance - a.relevance);

    // 5. Compose Option A (simple — fewer tools, prefer plugins/bundles)
    const optionA: any[] = [];
    const usedA = new Set<string>();
    for (const item of scored.filter((i: any) => i.type === "plugin")) { if (optionA.length >= 3 || usedA.has(item.slug)) continue; optionA.push(item); usedA.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "connector")) { if (optionA.length >= 4 || usedA.has(item.slug)) continue; optionA.push(item); usedA.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "skill")) { if (optionA.length >= 5 || usedA.has(item.slug)) continue; optionA.push(item); usedA.add(item.slug); }

    // 6. Compose Option B (flexible — connectors first, then skills)
    const optionB: any[] = [];
    const usedB = new Set<string>();
    for (const item of scored.filter((i: any) => i.type === "connector" && i.is_official)) { if (optionB.length >= 2 || usedB.has(item.slug)) continue; optionB.push(item); usedB.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "connector" && !i.is_official)) { if (optionB.filter((x: any) => x.type === "connector").length >= 3 || usedB.has(item.slug)) continue; optionB.push(item); usedB.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "skill")) { if (optionB.length >= 6 || usedB.has(item.slug)) continue; optionB.push(item); usedB.add(item.slug); }

    // 7. Compatibility analysis
    const [warningsA, warningsB] = await Promise.all([getCompatibilityWarnings(optionA), getCompatibilityWarnings(optionB)]);

    // 8. Build response
    const sections: string[] = [];
    sections.push(`# 🎯 Pymaia Agent — Solution for: "${args.goal}"\n`);

    if (matchedTemplate) {
      sections.push(`**Goal detected:** ${matchedTemplate.display_name} (${templateDomain})`);
      if (matchedTemplate.description) sections.push(`*${matchedTemplate.description}*\n`);
    }

    if (capabilities.length > 0) {
      sections.push(`## Capabilities needed\n`);
      for (const cap of capabilities) {
        sections.push(`- ${cap.required ? "✅" : "➕"} **${cap.name}** (${cap.type})${cap.required ? "" : " — optional"}`);
      }
      sections.push("");
    }

    function formatOption(label: string, subtitle: string, items: any[], warnings: string[]) {
      if (items.length === 0) { sections.push(`## ${label}: ${subtitle}\n\n*No matching tools found.*\n`); return; }
      const ts = items.map((i: any) => i.trust_score || 0).filter((t: number) => t > 0);
      const avg = ts.length > 0 ? Math.round(ts.reduce((a: number, b: number) => a + b, 0) / ts.length) : 0;
      const badge = avg >= 70 ? "🟢 Verified" : avg >= 40 ? "🟡 Reviewed" : "⚪ Unverified";
      sections.push(`## ${label}: ${subtitle}`);
      sections.push(`**Trust: ${avg}/100** ${badge} · **${items.length} tools**\n`);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const tb = (item.trust_score || 0) >= 70 ? "🟢" : (item.trust_score || 0) >= 40 ? "🟡" : "⚪";
        const tn = item.type === "connector" ? "🔌 MCP" : item.type === "plugin" ? "🧩 Plugin" : "🧠 Skill";
        const of = item.is_official ? " ✅ Official" : "";
        const st = item.github_stars ? ` · ⭐ ${item.github_stars.toLocaleString()}` : "";
        sections.push(`${i + 1}. ${tn} **${item.name}**${of}`);
        sections.push(`   ${tb} Trust: ${item.trust_score || "N/A"}/100${st}`);
        sections.push(`   ${item.desc || ""}`);
        if (item.install_command) sections.push(`   \`${item.install_command}\``);
        sections.push("");
      }
      if (warnings.length > 0) { sections.push(`**Compatibility:**`); for (const w of warnings) sections.push(`- ${w}`); sections.push(""); }
      const low = items.filter((i: any) => (i.trust_score || 0) > 0 && (i.trust_score || 0) < 40);
      if (low.length > 0) { sections.push(`**⚠️ Security:**`); for (const l of low) sections.push(`- ${l.name}: low Trust (${l.trust_score}/100)`); sections.push(""); }
    }

    formatOption("Option A", "Simple & Fast", optionA, warningsA);
    formatOption("Option B", "Flexible & Customizable", optionB, warningsB);

    // Recommendation logic
    const conflictsA = warningsA.some(w => w.includes("Conflict"));
    const conflictsB = warningsB.some(w => w.includes("Conflict"));
    const synA = warningsA.filter(w => w.includes("Synergy")).length;
    const synB = warningsB.filter(w => w.includes("Synergy")).length;
    let rec = "A", reason = "Fewer tools, faster setup";
    if (conflictsA && !conflictsB) { rec = "B"; reason = "Option A has conflicts"; }
    else if (synB > synA) { rec = "B"; reason = "More tool synergies"; }
    else if (args.technical_level === "developer") { rec = "B"; reason = "More control for developers"; }
    else if (args.technical_level === "non-technical") { rec = "A"; reason = "Simpler for non-technical users"; }

    sections.push(`## 💡 Recommendation: Option ${rec}\n*${reason}*\n`);

    // Quick install
    const best = rec === "A" ? optionA : optionB;
    if (best.length > 0) {
      sections.push(`## 🚀 Quick Install (Option ${rec})\n`);
      const ordered = [...best.filter((i: any) => i.type === "connector"), ...best.filter((i: any) => i.type !== "connector")];
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].install_command) sections.push(`**Step ${i + 1}:** ${ordered[i].name}\n\`\`\`\n${ordered[i].install_command}\n\`\`\`\n`);
      }
    }

    if (!matchedTemplate) sections.push(`\n*No exact goal template matched. Results based on keyword analysis.*`);

    if (matchedTemplate) {
      await supabase.from("goal_templates").update({ usage_count: (matchedTemplate.usage_count || 0) + 1 }).eq("id", matchedTemplate.id);
    }

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

mcp.tool("rate_recommendation", {
  description: "Submit feedback on a Pymaia Agent recommendation. Helps improve future recommendations.",
  inputSchema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "The original goal" },
      chosen_option: { type: "string", description: "Which option was chosen: A, B, or neither" },
      rating: { type: "number", description: "Rating 1-5 (5 = very helpful)" },
      comment: { type: "string", description: "Optional feedback" },
    },
    required: ["goal", "rating"],
  },
  handler: async (args: { goal: string; chosen_option?: string; rating: number; comment?: string }) => {
    await supabase.from("recommendation_feedback").insert({
      goal: args.goal,
      chosen_option: args.chosen_option || null,
      rating: Math.min(5, Math.max(1, args.rating)),
      comment: args.comment || null,
      recommended_slugs: [],
    });
    return { content: [{ type: "text" as const, text: `✅ Thank you for your feedback! Rating: ${args.rating}/5${args.comment ? ` — "${args.comment}"` : ""}` }] };
  },
});

mcp.tool("get_role_kit", {
  description: "Returns a curated kit of recommended tools (skills, MCPs, plugins) for a specific professional role. Optionally filters by tech stack.",
  inputSchema: {
    type: "object",
    properties: {
      role: { type: "string", description: "Professional role: marketer, developer, product-manager, designer, sales, consultant, lawyer, founder, data-analyst, devops, doctor, teacher, hr, other" },
      stack: { type: "array", items: { type: "string" }, description: "Optional: current tools/platforms (e.g., ['nextjs', 'supabase', 'figma'])" },
      limit: { type: "number", description: "Max tools per section (default: 5)" },
    },
    required: ["role"],
  },
  handler: async (args: { role: string; stack?: string[]; limit?: number }) => {
    const lim = Math.min(args.limit || 5, 10);
    const roleLower = args.role.toLowerCase();

    // Map common role names to target_roles values
    const roleMap: Record<string, string[]> = {
      "marketer": ["marketer"],
      "developer": ["developer", "ingeniero"],
      "product-manager": ["product-manager", "founder"],
      "designer": ["disenador", "designer"],
      "sales": ["ventas", "sales"],
      "consultant": ["consultor"],
      "lawyer": ["abogado"],
      "founder": ["founder"],
      "data-analyst": ["data-analyst", "datos"],
      "devops": ["devops", "developer"],
      "doctor": ["medico"],
      "teacher": ["profesor"],
      "hr": ["rrhh"],
      "other": ["otro"],
    };

    const roleFilters = roleMap[roleLower] || [roleLower];

    // Fetch skills for this role
    let skillQuery = supabase
      .from("skills")
      .select("display_name, slug, tagline, category, avg_rating, install_count, install_command, trust_score, target_roles")
      .eq("status", "approved")
      .order("install_count", { ascending: false })
      .limit(lim * 2);

    // Filter by any matching role
    skillQuery = skillQuery.overlaps("target_roles", roleFilters);

    const { data: roleSkills } = await skillQuery;

    // If stack provided, search for stack-specific connectors
    let stackConnectors: any[] = [];
    if (args.stack && args.stack.length > 0) {
      for (const tool of args.stack.slice(0, 3)) {
        const q = sanitizeForPostgrest(tool);
        const { data } = await supabase
          .from("mcp_servers")
          .select("name, slug, description, category, github_stars, is_official, install_command, trust_score")
          .eq("status", "approved")
          .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
          .order("github_stars", { ascending: false })
          .limit(2);
        if (data) stackConnectors.push(...data);
      }
      stackConnectors = deduplicateConnectors(stackConnectors);
    }

    // Fetch bundles for this role
    const { data: bundles } = await supabase
      .from("skill_bundles")
      .select("title, title_es, description, skill_slugs, hero_emoji")
      .eq("is_active", true)
      .eq("role_slug", roleLower)
      .limit(3);

    // Build response
    const sections: string[] = [];
    const roleLabel = args.role.charAt(0).toUpperCase() + args.role.slice(1);

    sections.push(`# 🎯 Tool Kit for ${roleLabel}\n`);

    // Essential skills
    const essential = (roleSkills || []).slice(0, lim);
    if (essential.length > 0) {
      sections.push(`## Essential Skills\n`);
      sections.push(`Top ${essential.length} skills used by ${roleLabel}s:\n`);
      for (let i = 0; i < essential.length; i++) {
        const s = essential[i];
        const trustBadge = (s.trust_score || 0) >= 70 ? "🟢" : (s.trust_score || 0) >= 40 ? "🟡" : "⚪";
        sections.push(`${i + 1}. **${s.display_name}** [${s.category}] ${trustBadge} Trust: ${s.trust_score || "N/A"}`);
        sections.push(`   ${s.tagline}`);
        sections.push(`   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs`);
        sections.push(`   \`${s.install_command}\`\n`);
      }
    }

    // Stack-specific connectors
    if (stackConnectors.length > 0) {
      sections.push(`## Stack-Specific Connectors\n`);
      sections.push(`Based on your stack (${args.stack!.join(", ")}):\n`);
      for (const c of stackConnectors) {
        const official = c.is_official ? " ✅ Official" : "";
        sections.push(`- **${c.name}**${official} [${c.category}] — ${c.description}`);
        if (c.install_command) sections.push(`  \`${c.install_command}\``);
      }
      sections.push("");
    }

    // Bundles
    if (bundles && bundles.length > 0) {
      sections.push(`## Pre-built Kits\n`);
      for (const b of bundles) {
        sections.push(`${b.hero_emoji || "📦"} **${b.title}** — ${b.description}`);
        sections.push(`   Includes ${b.skill_slugs.length} tools\n`);
      }
    }

    // Quick install suggestion
    if (essential.length > 0) {
      sections.push(`## 🚀 Quick Start\n`);
      sections.push(`Install the top 3 essentials now:\n`);
      for (const s of essential.slice(0, 3)) {
        sections.push(`\`\`\`\n${s.install_command}\n\`\`\`\n`);
      }
    }

    if (essential.length === 0 && stackConnectors.length === 0) {
      sections.push(`No specific tools found for "${args.role}". Try \`explore_directory\` or \`solve_goal\` for a more targeted search.`);
    }

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

mcp.tool("explain_combination", {
  description: "Explains how multiple tools work together: data flow, compatibility, potential issues, and setup order.",
  inputSchema: {
    type: "object",
    properties: {
      slugs: { type: "array", items: { type: "string" }, description: "Array of tool slugs (skills, connectors, or plugins) to explain" },
    },
    required: ["slugs"],
  },
  handler: async (args: { slugs: string[] }) => {
    // Search across all 3 tables
    const [{ data: skills }, { data: connectors }, { data: plugins }] = await Promise.all([
      supabase.from("skills").select("display_name, slug, tagline, description_human, category, install_command, trust_score, security_status, required_mcps").in("slug", args.slugs).eq("status", "approved"),
      supabase.from("mcp_servers").select("name, slug, description, category, install_command, trust_score, security_status, credentials_needed, is_official").in("slug", args.slugs).eq("status", "approved"),
      supabase.from("plugins").select("name, slug, description, category, platform, trust_score, security_status, is_official, is_anthropic_verified").in("slug", args.slugs).eq("status", "approved"),
    ]);

    const allItems = [
      ...(skills || []).map((s: any) => ({ ...s, type: "skill", name: s.display_name })),
      ...(connectors || []).map((c: any) => ({ ...c, type: "connector" })),
      ...(plugins || []).map((p: any) => ({ ...p, type: "plugin" })),
    ];

    if (allItems.length === 0) {
      return { content: [{ type: "text" as const, text: `No tools found matching slugs: ${args.slugs.join(", ")}` }] };
    }

    const sections: string[] = [];
    sections.push(`# 🔗 Tool Combination Analysis\n`);

    // List all found tools
    sections.push(`## Tools in this combination\n`);
    for (const item of allItems) {
      const typeName = item.type === "connector" ? "🔌 MCP" : item.type === "plugin" ? "🧩 Plugin" : "🧠 Skill";
      const trustBadge = (item.trust_score || 0) >= 70 ? "🟢" : (item.trust_score || 0) >= 40 ? "🟡" : "⚪";
      sections.push(`- ${typeName} **${item.name}** [${item.category}] ${trustBadge} Trust: ${item.trust_score || "N/A"}`);
      sections.push(`  ${item.tagline || item.description || ""}`);
    }

    // Trust overview
    const trustScores = allItems.map((i: any) => i.trust_score || 0).filter((t: number) => t > 0);
    const avgTrust = trustScores.length > 0 ? Math.round(trustScores.reduce((a: number, b: number) => a + b, 0) / trustScores.length) : 0;
    const minTrust = trustScores.length > 0 ? Math.min(...trustScores) : 0;

    sections.push(`\n## Security Overview\n`);
    sections.push(`- Average Trust Score: **${avgTrust}/100**`);
    sections.push(`- Lowest Trust Score: **${minTrust}/100**`);
    if (minTrust < 40 && minTrust > 0) {
      sections.push(`- ⚠️ **Warning:** Some tools have low trust scores. Review before using in production.`);
    }

    // Dependencies
    const skillsWithMcps = (skills || []).filter((s: any) => s.required_mcps && Array.isArray(s.required_mcps) && s.required_mcps.length > 0);
    if (skillsWithMcps.length > 0) {
      sections.push(`\n## Dependencies\n`);
      for (const s of skillsWithMcps) {
        sections.push(`**${s.display_name}** requires:`);
        for (const dep of s.required_mcps as any[]) {
          const depName = dep.name || dep.slug || JSON.stringify(dep);
          sections.push(`  - ${depName}`);
        }
      }
    }

    // Credentials needed
    const withCreds = (connectors || []).filter((c: any) => c.credentials_needed && c.credentials_needed.length > 0);
    if (withCreds.length > 0) {
      sections.push(`\n## Credentials Required\n`);
      for (const c of withCreds) {
        sections.push(`**${c.name}:** ${c.credentials_needed.join(", ")}`);
      }
    }

    // Installation order
    sections.push(`\n## Recommended Installation Order\n`);
    // MCPs first, then skills, then plugins
    const ordered = [
      ...allItems.filter((i: any) => i.type === "connector"),
      ...allItems.filter((i: any) => i.type === "skill"),
      ...allItems.filter((i: any) => i.type === "plugin"),
    ];
    for (let i = 0; i < ordered.length; i++) {
      const item = ordered[i];
      if (item.install_command) {
        sections.push(`${i + 1}. **${item.name}** (${item.type})\n\`\`\`\n${item.install_command}\n\`\`\`\n`);
      }
    }

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

// ─── PHASE 2: CUSTOM GENERATION ───

mcp.tool("generate_custom_skill", {
  description: "Generates a SKILL.md or plugin.json that orchestrates multiple recommended tools into a single automated workflow. Use after solve_goal to create a unified skill from the recommended combination.",
  inputSchema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "The business goal this skill solves (e.g., 'automate outbound sales')" },
      tools: { type: "array", items: { type: "string" }, description: "Slugs of tools to orchestrate (from solve_goal recommendations)" },
      output_format: { type: "string", description: "Output format: 'skill' (SKILL.md) or 'plugin' (plugin.json + README). Default: skill" },
      custom_name: { type: "string", description: "Optional custom name for the generated skill/plugin" },
    },
    required: ["goal", "tools"],
  },
  handler: async (args: { goal: string; tools: string[]; output_format?: string; custom_name?: string }) => {
    const format = args.output_format || "skill";

    // 1. Fetch details for all referenced tools
    const [{ data: skills }, { data: connectors }, { data: plugins }] = await Promise.all([
      supabase.from("skills").select("display_name, slug, tagline, description_human, category, install_command, trust_score, required_mcps").in("slug", args.tools).eq("status", "approved"),
      supabase.from("mcp_servers").select("name, slug, description, category, install_command, trust_score, credentials_needed, is_official").in("slug", args.tools).eq("status", "approved"),
      supabase.from("plugins").select("name, slug, description, category, platform, trust_score, is_official").in("slug", args.tools).eq("status", "approved"),
    ]);

    const allItems = [
      ...(skills || []).map((s: any) => ({ ...s, type: "skill", name: s.display_name, desc: s.tagline || s.description_human })),
      ...(connectors || []).map((c: any) => ({ ...c, type: "connector", desc: c.description })),
      ...(plugins || []).map((p: any) => ({ ...p, type: "plugin", desc: p.description })),
    ];

    if (allItems.length === 0) {
      return { content: [{ type: "text" as const, text: `❌ No tools found matching slugs: ${args.tools.join(", ")}. Use \`solve_goal\` first to find tools, then pass their slugs here.` }] };
    }

    // 2. Build names
    const kebabName = (args.custom_name || args.goal)
      .toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64) || "custom-workflow";
    const displayName = args.custom_name || args.goal.split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    // 3. Collect dependencies
    const mcpDeps: any[] = [];
    for (const item of allItems) {
      if (item.type === "connector") {
        mcpDeps.push({ name: item.name, slug: item.slug, install: item.install_command, creds: item.credentials_needed || [] });
      }
      if (item.required_mcps && Array.isArray(item.required_mcps)) {
        for (const dep of item.required_mcps) {
          mcpDeps.push({ name: dep.name || dep.slug, slug: dep.slug || "", install: dep.install_command || "", creds: dep.credentials_needed || [] });
        }
      }
    }

    // 4. Compatibility check
    const warnings = await getCompatibilityWarnings(allItems);
    const hasConflicts = warnings.some(w => w.includes("Conflict"));

    // 5. Trust evaluation
    const trustScores = allItems.map((i: any) => i.trust_score || 0).filter((t: number) => t > 0);
    const avgTrust = trustScores.length > 0 ? Math.round(trustScores.reduce((a: number, b: number) => a + b, 0) / trustScores.length) : 0;
    const securityBadge = avgTrust >= 70 ? "✅ Verified" : avgTrust >= 40 ? "🟡 Reviewed" : "⚠️ Unverified";

    const sections: string[] = [];

    if (format === "plugin") {
      // Generate plugin.json + README
      const pluginJson = {
        name: kebabName,
        version: "1.0.0",
        description: `Orchestrates ${allItems.length} tools to ${args.goal.toLowerCase()}`,
        skills: allItems.filter((i: any) => i.type === "skill").map((s: any) => `skills/${s.slug}`),
        permissions: mcpDeps.map((d: any) => d.slug).filter(Boolean),
        author: "pymaia-agent",
        license: "MIT",
        generated_by: "pymaia-agent-v5",
      };

      sections.push(`# 🧩 Generated Plugin: ${displayName}\n`);
      sections.push(`## plugin.json\n\n\`\`\`json\n${JSON.stringify(pluginJson, null, 2)}\n\`\`\`\n`);

      // README
      sections.push(`## README.md\n`);
      sections.push(`\`\`\`markdown`);
      sections.push(`# ${displayName}\n`);
      sections.push(`> Generated by Pymaia Agent — AI Solutions Architect\n`);
      sections.push(`${pluginJson.description}\n`);
      sections.push(`## Installation\n`);
      sections.push(`\`\`\`bash\nclaude plugin install pymaia/${kebabName}\n\`\`\`\n`);
      sections.push(`## What's included\n`);
      for (const item of allItems) {
        const tn = item.type === "connector" ? "🔌 MCP" : item.type === "plugin" ? "🧩 Plugin" : "🧠 Skill";
        sections.push(`- ${tn} **${item.name}** — ${item.desc}`);
      }
      if (mcpDeps.length > 0) {
        sections.push(`\n## Required Connectors\n`);
        for (const dep of mcpDeps) {
          sections.push(`- **${dep.name}**${dep.install ? `: \`${dep.install}\`` : ""}`);
          if (dep.creds.length > 0) sections.push(`  Credentials: ${dep.creds.join(", ")}`);
        }
      }
      sections.push(`\n## License\nMIT\n\`\`\``);
    } else {
      // Generate SKILL.md
      sections.push(`# 🧠 Generated SKILL.md: ${displayName}\n`);
      sections.push(`\`\`\`markdown`);
      sections.push(`---`);
      sections.push(`name: ${kebabName}`);
      sections.push(`description: "Orchestrates ${allItems.length} tools to ${args.goal.toLowerCase()}. Use when the user asks to ${args.goal.toLowerCase()}."`);
      sections.push(`compatibility: claude-code`);
      sections.push(`metadata:`);
      sections.push(`  author: pymaia-agent`);
      sections.push(`  version: "1.0"`);
      sections.push(`  generated_by: pymaia-agent-v5`);
      sections.push(`---\n`);
      sections.push(`# ${displayName}\n`);
      sections.push(`This skill orchestrates ${allItems.length} tools to accomplish: **${args.goal}**.\n`);
      sections.push(`Security: ${securityBadge} (avg trust: ${avgTrust}/100)\n`);

      // Decision tree
      sections.push(`## Decision Tree\n`);
      sections.push(`\`\`\``);
      sections.push(`¿The user asks to ${args.goal.toLowerCase()}?`);
      sections.push(`├── YES → Activate this skill`);
      sections.push(`│   ├── All tools available? → Execute full workflow`);
      sections.push(`│   └── Missing tools? → Guide installation first`);
      sections.push(`└── NO → Don't activate`);
      sections.push(`\`\`\`\n`);

      // Workflow
      sections.push(`## Workflow\n`);
      const orderedItems = [
        ...allItems.filter((i: any) => i.type === "connector"),
        ...allItems.filter((i: any) => i.type === "skill"),
        ...allItems.filter((i: any) => i.type === "plugin"),
      ];
      for (let i = 0; i < orderedItems.length; i++) {
        const item = orderedItems[i];
        const tn = item.type === "connector" ? "MCP" : item.type === "plugin" ? "Plugin" : "Skill";
        sections.push(`${i + 1}. **Use ${item.name}** (${tn}): ${item.desc || "Execute this tool's capabilities"}`);
      }
      sections.push("");

      // Dependencies
      if (mcpDeps.length > 0) {
        sections.push(`## Dependencies\n`);
        sections.push(`This skill requires the following MCP servers:\n`);
        for (const dep of mcpDeps) {
          sections.push(`### ${dep.name}${dep.install ? " (required)" : ""}`);
          if (dep.install) sections.push(`- **Install**: \`${dep.install}\``);
          if (dep.creds.length > 0) sections.push(`- **Credentials**: ${dep.creds.join(", ")}`);
          sections.push("");
        }
      }

      // What NOT to do
      sections.push(`## What NOT to Do\n`);
      sections.push(`- NEVER skip tool availability checks before starting the workflow`);
      sections.push(`- NEVER proceed if required credentials are missing`);
      if (hasConflicts) sections.push(`- NEVER use conflicting tools simultaneously`);
      sections.push(`- NEVER expose API keys or credentials in output`);
      sections.push("");

      sections.push(`\`\`\``);
    }

    // Installation commands
    sections.push(`\n## 🚀 Install All Tools\n`);
    for (const item of allItems) {
      if (item.install_command) {
        sections.push(`**${item.name}** (${item.type}):\n\`\`\`\n${item.install_command}\n\`\`\`\n`);
      }
    }

    // Warnings
    if (warnings.length > 0) {
      sections.push(`## ⚠️ Compatibility Notes\n`);
      for (const w of warnings) sections.push(`- ${w}`);
    }

    if (hasConflicts) {
      sections.push(`\n> ⛔ **Warning:** This combination contains conflicting tools. Review the conflicts above and consider removing one of the conflicting tools.`);
    }

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

// ─── STATS TOOLS ───

mcp.tool("get_directory_stats", {
  description: "Get overall statistics about the SkillHub directory: total skills, categories, top rated, most installed.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    const { data: skills, error } = await supabase
      .from("skills")
      .select("display_name, slug, avg_rating, install_count, category, created_at")
      .eq("status", "approved")
      .order("install_count", { ascending: false });

    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const all = skills || [];
    const totalInstalls = all.reduce((sum: number, s: any) => sum + s.install_count, 0);
    const categories = new Set(all.map((s: any) => s.category));
    const topInstalled = all[0];
    const topRated = [...all].sort((a: any, b: any) => Number(b.avg_rating) - Number(a.avg_rating))[0];
    const newest = [...all].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const text = `# 📊 SkillHub Directory Stats\n\n- **${all.length}** skills disponibles\n- **${categories.size}** categorías\n- **${totalInstalls.toLocaleString()}** instalaciones totales\n\n## Highlights\n- 🏆 Más instalada: **${topInstalled?.display_name}** (${topInstalled?.install_count.toLocaleString()})\n- ⭐ Mejor valorada: **${topRated?.display_name}** (${Number(topRated?.avg_rating).toFixed(1)})\n- 🆕 Más reciente: **${newest?.display_name}**`;

    return { content: [{ type: "text" as const, text }] };
  },
});

mcp.tool("get_install_command", {
  description: "Quickly get just the install command for a skill by name or slug. Perfect for fast installation.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Skill name or slug" },
    },
    required: ["name"],
  },
  handler: async (args: { name: string }) => {
    const nameLower = args.name.toLowerCase().replace(/\s+/g, "-");

    const { data: skill } = await supabase
      .from("skills")
      .select("display_name, install_command, slug")
      .eq("status", "approved")
      .eq("slug", nameLower)
      .maybeSingle();

    if (skill) {
      return { content: [{ type: "text" as const, text: `**${skill.display_name}**\n\n\`\`\`\n${skill.install_command}\n\`\`\`` }] };
    }

    // Fuzzy search
    const { data: skills } = await supabase
      .from("skills")
      .select("display_name, install_command, slug")
      .eq("status", "approved")
      .ilike("display_name", `%${args.name}%`)
      .limit(3);

    if (skills?.length) {
      const text = skills.map((s: any) => `**${s.display_name}**\n\`\`\`\n${s.install_command}\n\`\`\``).join("\n\n");
      return { content: [{ type: "text" as const, text }] };
    }

    return { content: [{ type: "text" as const, text: `No encontré "${args.name}". Usa search_skills para buscar.` }] };
  },
});

// ─── RATE LIMITER ───

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

// Bind transport
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

const app = new Hono();
const mcpApp = new Hono();

// Rate limit middleware for MCP endpoint
mcpApp.use("/mcp", async (c, next) => {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return c.json(
      { error: "Rate limit exceeded. Max 30 requests per minute." },
      429
    );
  }
  await next();
});

mcpApp.get("/", (c) => c.json({
  message: "Pymaia Agent — AI Solutions Architect",
  version: "5.0.0",
  rateLimit: "30 requests/minute per IP",
  agent: {
    description: "Pymaia Agent understands your business goals and recommends the optimal combination of skills, MCPs, and plugins from a catalog of 35K+ tools. Phase 1: Smart Composition with A/B options, compatibility matrix, and feedback.",
    capabilities: ["Goal decomposition", "Cross-catalog search", "A/B solution composition", "Compatibility analysis", "Trust evaluation", "Security warnings", "Role-based kits", "Feedback loop"],
  },
  tools: [
    "search_skills", "get_skill_details", "list_popular_skills", "list_new_skills",
    "list_categories", "search_by_role", "recommend_for_task", "compare_skills",
    "get_directory_stats", "get_install_command",
    "search_connectors", "get_connector_details", "list_popular_connectors",
    "search_plugins", "get_plugin_details", "list_popular_plugins",
    "explore_directory",
    "solve_goal", "get_role_kit", "explain_combination", "rate_recommendation",
  ],
}));
mcpApp.all("/mcp", async (c) => await httpHandler(c.req.raw));

app.route("/mcp-server", mcpApp);

Deno.serve(app.fetch);
