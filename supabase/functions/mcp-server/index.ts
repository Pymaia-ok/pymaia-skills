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
    const q = args.query.toLowerCase();

    // Server-side search for accurate results
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

    // Fallback to top skills if no match
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
    const queryLower = args.query.toLowerCase();

    // Server-side search using ilike for accurate results
    let q = supabase
      .from("mcp_servers")
      .select("name, slug, description, description_es, category, github_stars, github_url, install_command, is_official, icon_url")
      .eq("status", "approved")
      .or(`name.ilike.%${queryLower}%,slug.ilike.%${queryLower}%,description.ilike.%${queryLower}%`)
      .order("github_stars", { ascending: false })
      .limit(lim);

    if (args.category) q = q.eq("category", args.category);

    const { data: matched, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    // If no server-side matches, fall back to top connectors
    let results = matched || [];
    if (results.length === 0) {
      let fallback = supabase
        .from("mcp_servers")
        .select("name, slug, description, description_es, category, github_stars, github_url, install_command, is_official, icon_url")
        .eq("status", "approved")
        .order("github_stars", { ascending: false })
        .limit(3);
      if (args.category) fallback = fallback.eq("category", args.category);
      const { data: topData } = await fallback;
      results = topData || [];
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
    const queryLower = args.query.toLowerCase();

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
    const q = args.query.toLowerCase();

    const [skillsRes, connectorsRes, pluginsRes] = await Promise.all([
      supabase.from("skills")
        .select("display_name, tagline, slug, category, install_count, install_command")
        .eq("status", "approved")
        .or(`display_name.ilike.%${q}%,tagline.ilike.%${q}%,slug.ilike.%${q}%`)
        .order("install_count", { ascending: false })
        .limit(lim),
      supabase.from("mcp_servers")
        .select("name, description, slug, category, github_stars, is_official")
        .eq("status", "approved")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`)
        .order("github_stars", { ascending: false })
        .limit(lim),
      supabase.from("plugins")
        .select("name, description, slug, category, platform, install_count, is_official")
        .eq("status", "approved")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`)
        .order("install_count", { ascending: false })
        .limit(lim),
    ]);

    const skills = skillsRes.data || [];
    const connectors = connectorsRes.data || [];
    const plugins = pluginsRes.data || [];

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
  message: "SkillHub MCP Server",
  version: "3.0.0",
  rateLimit: "30 requests/minute per IP",
  tools: [
    "search_skills", "get_skill_details", "list_popular_skills", "list_new_skills",
    "list_categories", "search_by_role", "recommend_for_task", "compare_skills",
    "get_directory_stats", "get_install_command",
    "search_connectors", "get_connector_details", "list_popular_connectors",
    "search_plugins", "get_plugin_details", "list_popular_plugins",
    "explore_directory",
  ],
  categories: ["desarrollo", "diseño", "marketing", "automatización", "productividad", "legal", "negocios", "creatividad", "datos", "ia"],
  connectorCategories: ["dev-tools", "data", "communication", "productivity", "ai", "cloud", "design", "business", "finance", "marketing", "security", "analytics"],
  pluginCategories: ["development", "productivity", "design", "data", "marketing", "business", "communication", "security", "ai", "education"],
}));
mcpApp.all("/mcp", async (c) => await httpHandler(c.req.raw));

app.route("/mcp-server", mcpApp);

Deno.serve(app.fetch);
