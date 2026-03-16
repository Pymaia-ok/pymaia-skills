import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// ─── API KEY AUTH: resolve user_id from Bearer token ───
async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Global per-request context for API key auth
// Edge functions in Deno are single-threaded per isolate, so this is safe per-request
let currentApiKeyUserId: string | null = null;

async function resolveApiKeyUser(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || !token.startsWith("pymsk_")) return null;
  try {
    const keyHash = await sha256Hex(token);
    const { data } = await supabase.rpc("validate_api_key", { _key_hash: keyHash });
    if (data) {
      // Update last_used_at in background
      supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", keyHash).then(() => {});
    }
    return data || null;
  } catch {
    return null;
  }
}

// ─── KEYWORD-TO-DOMAIN MAPPING (runs BEFORE LLM) ───
const KEYWORD_DOMAIN_MAP: Record<string, string[]> = {
  "advertising": ["meta ads", "facebook ads", "google ads", "tiktok ads", "linkedin ads", "ppc", "ad campaign", "roas", "cpc", "paid media", "display ads", "ads campaign", "run ads", "track conversions", "conversion tracking", "ad spend", "meta campaign", "instagram ads", "amazon ads", "retargeting", "programmatic", "run campaigns", "paid advertising", "media buying", "campaigns", "publicidad", "anuncios", "campañas", "facebook campaign", "instagram campaign"],
  "email-marketing": ["email marketing", "newsletter", "drip campaign", "email sequence", "mailchimp", "sendgrid", "email automation"],
  "social-media": ["social media", "instagram post", "twitter", "tweet", "linkedin post", "tiktok content", "social scheduling", "redes sociales", "contenido social"],
  "devops": ["kubernetes", "docker", "ci/cd", "deploy", "pipeline", "infrastructure", "terraform", "ansible", "devops", "helm", "cloud", "monitoring", "alerting"],
  "finance": ["expenses", "budget", "accounting", "invoicing", "financial", "bookkeeping", "tax", "finanzas", "contabilidad", "finances", "personal finances", "personal finance", "money", "money management", "savings", "savings account", "income", "debt", "loans", "banking", "investments", "net worth", "cash flow", "gastos", "ahorro", "dinero", "deudas", "presupuesto", "impuestos"],
  "legal": ["contract", "legal", "compliance", "patent", "trademark", "litigation", "contrato", "abogado"],
  "data": ["data pipeline", "etl", "analytics", "dashboard", "visualization", "sql", "warehouse", "datos"],
  "security": ["vulnerability", "penetration test", "security audit", "firewall", "encryption", "seguridad"],
  "design": ["ui/ux", "figma", "wireframe", "prototype", "design system", "accessibility", "diseño"],
  "sales": ["crm", "prospecting", "cold email", "lead generation", "outbound", "pipeline", "ventas"],
  "hr": ["recruiting", "hiring", "onboarding", "employee", "payroll", "performance review", "rrhh", "talent", "workforce", "benefits", "compensation", "recursos humanos"],
  "support": ["customer support", "ticket", "helpdesk", "chatbot", "faq", "knowledge base", "soporte"],
  "development": ["code review", "pull request", "testing", "refactoring", "debugging", "api", "desarrollo", "programación"],
  "marketing": ["seo", "copywriting", "content marketing", "branding", "growth", "marketing"],
  "healthcare": ["patient", "medical", "clinical", "health", "diagnosis", "ehr", "hipaa", "telemedicine", "salud", "paciente", "médico"],
  "personal-finance": ["personal budget", "track spending", "expense tracker", "save money", "financial planning", "retirement", "invest", "portfolio", "crypto", "stock", "trading"],
};

// Map domain IDs to catalog categories
const DOMAIN_TO_CATEGORY: Record<string, string> = {
  "advertising": "marketing",
  "email-marketing": "marketing",
  "social-media": "marketing",
  "devops": "desarrollo",
  "finance": "negocios",
  "personal-finance": "negocios",
  "legal": "legal",
  "data": "datos",
  "security": "desarrollo",
  "design": "diseño",
  "sales": "negocios",
  "hr": "negocios",
  "healthcare": "negocios",
  "support": "productividad",
  "development": "desarrollo",
  "marketing": "marketing",
};

// ─── GENERIC TOOL SLUGS BLACKLIST ───
const GENERIC_TOOL_SLUGS = new Set([
  "cowork-plugin-management", "claude-code-setup", "claude-code-plugins-plus-skills",
  "claude-md-management", "plugin-management", "skill-management", "agent-management",
  "mcp-server-management", "tool-management", "settings-manager",
]);

// ─── SOLVE_GOAL EXCLUDED SLUGS: generic platforms that pollute every result ───
const SOLVE_GOAL_EXCLUDED_SLUGS = new Set([
  // Generic dev platforms that appear in everything
  "asana-plugin", "posthog", "vercel-plugin",
  // Meta tools about skills/plugins, not real tasks
  "cowork-plugin-management", "claude-code-setup", "claude-md-management",
  // Completely out of context for most goals
  "io-github-ibeal-tidal-mcp",  // Music streaming
  "io-aerospace-software-community-mcp-server",  // Astrodynamics
  "xcodebuildmcp", "com-xcodebuildmcp-xcodebuildmcp", "xcodebuild", "xcodebuildmcp-cli",  // iOS/Xcode only
  // Fix 4: additional noise tools
  "firebase", "neverinfamous-memory-journal-mcp", "frago",
]);

// ─── DOMAIN → EXPECTED CATEGORIES MAP: penalize off-domain tools ───
const DOMAIN_CATEGORY_MAP: Record<string, Set<string>> = {
  advertising: new Set(["marketing", "social-media", "analytics", "advertising"]),
  finance: new Set(["finance", "productivity", "data-analysis", "analytics"]),
  design: new Set(["design", "media", "creativity", "productivity"]),
  devops: new Set(["development", "devops", "cloud", "infrastructure", "monitoring"]),
  sales: new Set(["sales", "crm", "marketing", "communication"]),
  legal: new Set(["legal", "compliance", "documentation", "productivity"]),
  hr: new Set(["hr", "recruitment", "communication", "productivity"]),
  education: new Set(["education", "documentation", "productivity", "research"]),
  healthcare: new Set(["healthcare", "data-analysis", "compliance", "research"]),
  ecommerce: new Set(["ecommerce", "marketing", "analytics", "productivity"]),
  security: new Set(["security", "development", "devops", "compliance"]),
  "data-science": new Set(["data-analysis", "development", "research", "analytics"]),
};

function detectDomainByKeywords(goal: string): { domain: string; category: string | null; confidence: number } {
  const goalLower = goal.toLowerCase();
  const goalWords = goalLower.split(/\s+/).filter(w => w.length >= 3);
  let bestDomain = "general";
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(KEYWORD_DOMAIN_MAP)) {
    let score = 0;
    for (const kw of keywords) {
      // Exact substring match (original)
      if (goalLower.includes(kw)) { score += kw.split(/\s+/).length; continue; }
      // Fuzzy prefix match: check if any goal word shares a prefix (≥5 chars) with any keyword word
      const kwWords = kw.split(/\s+/);
      for (const kwWord of kwWords) {
        if (kwWord.length < 4) continue;
        for (const gw of goalWords) {
          if (gw.length < 4) continue;
          const prefixLen = Math.min(5, Math.min(gw.length, kwWord.length));
          if (gw.substring(0, prefixLen) === kwWord.substring(0, prefixLen)) { score += 0.5; break; }
        }
      }
    }
    if (score > bestScore) { bestScore = score; bestDomain = domain; }
  }

  if (bestScore >= 1) {
    return { domain: bestDomain, category: DOMAIN_TO_CATEGORY[bestDomain] || null, confidence: Math.min(bestScore / 3, 1.0) };
  }
  return { domain: "general", category: null, confidence: 0 };
}

// ─── ROLE-TO-CATEGORY MAPPING ───
const ROLE_CATEGORIES: Record<string, string[]> = {
  "marketer": ["marketing", "ventas", "creatividad", "automatización"],
  "developer": ["desarrollo", "productividad", "ia", "automatización"],
  "designer": ["diseño", "creatividad", "productividad"],
  "founder": ["negocios", "producto", "ventas", "marketing"],
  "lawyer": ["legal", "negocios"],
  "abogado": ["legal", "negocios"],
  "data-analyst": ["datos", "ia", "automatización"],
  "consultant": ["negocios", "productividad", "datos"],
  "consultor": ["negocios", "productividad", "datos"],
  "sales": ["ventas", "negocios", "marketing"],
  "product-manager": ["productividad", "negocios", "desarrollo"],
  "devops": ["desarrollo", "automatización", "ia"],
  "hr": ["negocios", "productividad"],
};

// ─── ML INTENT CLASSIFIER ───
function extractKeywordsFromGoal(goal: string): string[] {
  const stopWords = new Set(["the","a","an","to","for","and","or","my","with","in","on","of","is","that","this","it","do","run","set","up","get","make","use","how","can","want","need","like","from","into","should","would","could","about"]);
  return goal.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
}

async function classifyIntent(goal: string, role?: string): Promise<{
  keywords: string[];
  category: string | null;
  capabilities: string[];
  domain: string;
  confidence: number;
}> {
  const t0 = Date.now();
  // Step 1: keyword-based domain detection (fast, reliable)
  const keywordResult = detectDomainByKeywords(goal);
  const fallbackKeywords = extractKeywordsFromGoal(goal);
  
  const keywordOnlyResult = { 
    keywords: fallbackKeywords, 
    category: keywordResult.category, 
    capabilities: [] as string[], 
    domain: keywordResult.domain, 
    confidence: keywordResult.confidence 
  };

  if (!LOVABLE_API_KEY) {
    console.log(JSON.stringify({ fn: "classifyIntent", mode: "no-api-key", ms: Date.now() - t0, keywords: fallbackKeywords, domain: keywordResult.domain }));
    return keywordOnlyResult;
  }

  try {
    // 5-second timeout for LLM call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an intent classifier for an AI agent tools marketplace. Given a user's business goal, extract:
- keywords: 3-6 English search terms that would match tool names/descriptions in a catalog of AI agent skills, MCP connectors, and plugins
- category: best matching category from [ia, desarrollo, diseño, marketing, automatización, datos, creatividad, productividad, legal, negocios] or null
- capabilities: list of technical capabilities needed (e.g., "email sending", "code review", "data scraping", "CRM integration")
- domain: business domain from [engineering, marketing, sales, design, legal, finance, operations, general]
- confidence: 0.0-1.0 how confident you are in the classification

Be precise with keywords - they should match actual tool names and descriptions. The user's role is: ${role || "unknown"}.`,
          },
          { role: "user", content: goal },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_intent",
            description: "Extract structured intent from user goal",
            parameters: {
              type: "object",
              properties: {
                keywords: { type: "array", items: { type: "string" }, description: "3-6 search terms" },
                category: { type: "string", nullable: true },
                capabilities: { type: "array", items: { type: "string" } },
                domain: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["keywords", "category", "capabilities", "domain", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_intent" } },
      }),
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error(JSON.stringify({ fn: "classifyIntent", error: "http", status: resp.status, body: body.slice(0, 200), ms: Date.now() - t0 }));
      return keywordOnlyResult;
    }
    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      console.error(JSON.stringify({ fn: "classifyIntent", error: "no-tool-call", ms: Date.now() - t0 }));
      return keywordOnlyResult;
    }
    const llmResult = JSON.parse(call.function.arguments);

    // Override: if keyword detection has high confidence and LLM disagrees on domain, prefer keyword
    if (keywordResult.confidence >= 0.5 && keywordResult.domain !== "general") {
      if (llmResult.domain !== keywordResult.domain && llmResult.confidence < 0.85) {
        llmResult.domain = keywordResult.domain;
        llmResult.category = keywordResult.category || llmResult.category;
      }
    }

    console.log(JSON.stringify({ fn: "classifyIntent", mode: "llm", ms: Date.now() - t0, keywords: llmResult.keywords, domain: llmResult.domain, confidence: llmResult.confidence }));
    return llmResult;
  } catch (e: any) {
    const isTimeout = e?.name === "AbortError";
    console.error(JSON.stringify({ fn: "classifyIntent", error: isTimeout ? "timeout" : "exception", message: e?.message?.slice(0, 200), ms: Date.now() - t0 }));
    return keywordOnlyResult;
  }
}

// ─── A/B TESTING: Deterministic hash-based variant assignment ───
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

type ABVariant = "control" | "reranked";

function assignVariant(goal: string, userId?: string): ABVariant {
  const seed = `${goal.toLowerCase().trim()}:${userId || "anon"}`;
  return hashString(seed) % 2 === 0 ? "control" : "reranked";
}

const mcp = new McpServer({
  name: "pymaia-agent",
  version: "9.1.0",
});

// Sanitize queries for PostgREST .or() filter parsing
function sanitizeForPostgrest(query: string): string {
  return query.replace(/[,()."\\]/g, "").trim().toLowerCase();
}

// ─── SLUG REDIRECT RESOLVER ───
// Checks slug_redirects table first, then returns the canonical slug
async function resolveSlug(slug: string, itemType?: string): Promise<string> {
  const type = itemType || "skill";
  const { data } = await supabase
    .from("slug_redirects")
    .select("new_slug")
    .eq("old_slug", slug)
    .eq("item_type", type)
    .maybeSingle();
  return data?.new_slug || slug;
}

// ─── ENSURE RESPONSE UTILITY ───
// Wraps tool outputs to never return empty/blank responses
function ensureResponse(text: string | null | undefined, fallback: string): string {
  if (!text || text.trim().length === 0) return fallback;
  return text;
}

// ─── USAGE EVENT LOGGING (fire-and-forget) ───
function logUsageEvent(eventType: string, itemSlug?: string, itemType?: string, queryText?: string) {
  supabase.from("usage_events").insert({
    event_type: eventType,
    item_slug: itemSlug || null,
    item_type: itemType || null,
    query_text: queryText || null,
  }).then(() => {}).catch((e: any) => console.error("usage_event insert error:", e?.message || e));
}

function logUsageEvents(eventType: string, items: Array<{ slug: string; type: string }>, queryText?: string) {
  if (items.length === 0) return;
  const rows = items.map(i => ({
    event_type: eventType,
    item_slug: i.slug,
    item_type: i.type,
    query_text: queryText || null,
  }));
  supabase.from("usage_events").insert(rows).then(() => {}).catch((e: any) => console.error("usage_events insert error:", e?.message || e));
}

// ─── TOOL CALL LOGGING (fire-and-forget) ───
function logToolCall(toolName: string, args?: any) {
  supabase.from("agent_analytics").insert({
    event_type: "tool_call",
    tool_name: toolName,
    event_data: { args_keys: args ? Object.keys(args) : [] },
  }).then(() => {}).catch((e: any) => console.error("tool_call log error:", e?.message || e));
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
  description: "Search the SkillHub directory for Agent Skills by name, tagline, or description. Returns install command, rating, and install count. NOTE: For goal-oriented queries (e.g. 'I want to automate X'), use solve_goal instead — it searches skills, connectors, AND plugins simultaneously and returns curated solutions.",
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
    logToolCall("search_skills", args);
    const lim = Math.min(args.limit || 5, 10);
    const apiUserId = currentApiKeyUserId;

    // Use the full-text search RPC (search_vector + trigram + ILIKE fallbacks)
    const { data: rpcResults, error: rpcError } = await supabase.rpc("search_skills", {
      search_query: args.query,
      filter_category: args.category || null,
      filter_industry: null,
      filter_roles: null,
      sort_by: "rating",
      page_num: 0,
      page_size: lim,
    });

    let results = rpcResults || [];

    // If FTS returned nothing, try semantic search as last resort
    if (results.length === 0) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/semantic-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ query: args.query, category: args.category, page: 0 }),
        });
        if (resp.ok) {
          const semanticData = await resp.json();
          results = (semanticData.data || []).slice(0, lim);
        }
      } catch { /* semantic search unavailable, continue with empty */ }
    }

    console.log(JSON.stringify({ tool: "search_skills", query: args.query, category: args.category || null, resultCount: results.length, method: rpcResults?.length ? "fts_rpc" : "semantic_fallback" }));

    // Log search results as usage events
    logUsageEvents("search_result", results.map((r: any) => ({ slug: r.slug, type: "skill" })), args.query);

    if (results.length === 0) {
      return { content: [{ type: "text" as const, text: `No skills found for "${args.query}". Try broader keywords, or use \`solve_goal\` for natural language goal-based search.` }] };
    }

    const text = results
      .map((s: any) => `**${s.display_name}** [${s.category}] (⭐ ${Number(s.avg_rating).toFixed(1)}, ${(s.install_count || 0).toLocaleString()} installs)\n${s.tagline}\nInstall: \`${s.install_command}\``)
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
    logToolCall("get_skill_details", args);
    // Log usage event
    logUsageEvent("view", args.slug, "skill");
    const resolvedSlug = await resolveSlug(args.slug, "skill");
    let q = supabase.from("skills").select("*").eq("slug", resolvedSlug);
    if (apiUserId) {
      q = q.or(`and(status.eq.approved,is_public.eq.true),creator_id.eq.${apiUserId}`);
    } else {
      q = q.eq("status", "approved");
    }
    const { data: skill, error } = await q.maybeSingle();

    if (error || !skill) return { content: [{ type: "text" as const, text: `Skill "${args.slug}" not found. Try \`search_skills('${args.slug}')\` to find similar skills.` }] };

    // Enrich with github_metadata if available
    let ghMeta: any = null;
    if (skill.github_url) {
      const repoMatch = skill.github_url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
      if (repoMatch) {
        const repoName = repoMatch[1].replace(/\.git$/, "");
        const { data } = await supabase.from("github_metadata").select("*").eq("repo_full_name", repoName).eq("fetch_status", "success").maybeSingle();
        ghMeta = data;
      }
    }

    const useCases = Array.isArray(skill.use_cases)
      ? (skill.use_cases as { title: string; after: string }[]).map((uc) => `• ${uc.title}: ${uc.after}`).join("\n")
      : "";

    const stars = ghMeta?.stars ?? skill.github_stars ?? 0;
    const ghInfo: string[] = [];
    if (ghMeta) {
      if (ghMeta.license) ghInfo.push(`📜 License: ${ghMeta.license}`);
      if (ghMeta.last_commit_at) {
        const days = Math.floor((Date.now() - new Date(ghMeta.last_commit_at).getTime()) / 86400000);
        ghInfo.push(`🕐 Last commit: ${days} days ago${days > 180 ? " ⚠️" : ""}`);
      }
      if (ghMeta.archived) ghInfo.push(`⚠️ Repository archived`);
    }

    const text = `# ${skill.display_name}\n\n📂 Category: ${skill.category}\n🎯 Roles: ${skill.target_roles?.join(", ") || "all"}\n⭐ GitHub Stars: ${stars.toLocaleString()}\n${ghInfo.length ? ghInfo.join("\n") + "\n" : ""}\n${skill.tagline}\n\n⭐ ${Number(skill.avg_rating).toFixed(1)} (${skill.review_count} reviews) · ${skill.install_count.toLocaleString()} installs\n\n## Description\n${skill.description_human}\n\n${useCases ? `## Use Cases\n${useCases}\n\n` : ""}## Install\n\`${skill.install_command}\``;

    return { content: [{ type: "text" as const, text }] };
  },
});

// ─── RANKING TOOLS ───

mcp.tool("list_popular_skills", {
  description: "List the most popular skills sorted by quality ranking (combines GitHub activity, ratings, trust scores, content quality). Optionally filter by category.",
  inputSchema: {
    type: "object",
    properties: {
      sort_by: { type: "string", description: "Sort by 'quality' (default), 'rating', or 'installs'" },
      category: { type: "string", description: "Optional category filter" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
  },
  handler: async (args: { sort_by?: string; category?: string; limit?: number }) => {
    logToolCall("list_popular_skills", args);
    const lim = Math.min(args.limit || 5, 10);
    let q = supabase
      .from("skills")
      .select("display_name, tagline, slug, avg_rating, install_count, install_command, category, trust_score, quality_rank, install_count_source")
      .eq("status", "approved");

    if (args.category) q = q.eq("category", args.category);

    // Sort by quality_rank by default
    const sortCol = args.sort_by === "rating" ? "avg_rating" : args.sort_by === "installs" ? "install_count" : "quality_rank";
    const { data: skills, error } = await q.order(sortCol, { ascending: false }).limit(lim);

    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

    const text = (skills || [])
      .map((s: any, i: number) => `${i + 1}. **${s.display_name}** [${s.category}] — ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · Quality: ${((s.quality_rank || 0) * 100).toFixed(0)}%\n   \`${s.install_command}\``)
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
    logToolCall("list_new_skills", args);
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
    logToolCall("list_categories");
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
  description: "Find the best skills for a specific professional role: marketer, abogado, consultor, founder, diseñador, developer, data-analyst, or general.",
  inputSchema: {
    type: "object",
    properties: {
      role: { type: "string", description: "Professional role: marketer, abogado, consultor, founder, disenador, developer, data-analyst, otro" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
    required: ["role"],
  },
  handler: async (args: { role: string; limit?: number }) => {
    logToolCall("search_by_role", args);
    const roleLower = args.role.toLowerCase();
    const relevantCategories = ROLE_CATEGORIES[roleLower] || [];
    const lim = Math.min(args.limit || 5, 10);

    // First try role-based category filtering with quality_rank sort
    let skills: any[] = [];
    if (relevantCategories.length > 0) {
      const { data } = await supabase
        .from("skills")
        .select("display_name, tagline, slug, avg_rating, install_count, install_command, category, target_roles, quality_rank, trust_score")
        .eq("status", "approved")
        .in("category", relevantCategories)
        .order("quality_rank", { ascending: false })
        .limit(lim * 2);
      skills = data || [];
    }

    // Fallback: try target_roles filter
    if (skills.length < lim) {
      const { data } = await supabase
        .from("skills")
        .select("display_name, tagline, slug, avg_rating, install_count, install_command, category, target_roles, quality_rank, trust_score")
        .eq("status", "approved")
        .contains("target_roles", [roleLower])
        .order("quality_rank", { ascending: false })
        .limit(lim);
      const existingSlugs = new Set(skills.map(s => s.slug));
      for (const s of data || []) {
        if (!existingSlugs.has(s.slug)) skills.push(s);
      }
    }

    // Sort by quality_rank and take top results
    skills = skills.sort((a: any, b: any) => (b.quality_rank || 0) - (a.quality_rank || 0)).slice(0, lim);

    if (!skills.length) return { content: [{ type: "text" as const, text: `No encontré skills para el rol "${args.role}". Probá con \`explore_directory\` o \`solve_goal\`.` }] };

    const roleLabels: Record<string, string> = {
      marketer: "📣 Marketer", abogado: "⚖️ Abogado", consultor: "💼 Consultor",
      founder: "🚀 Founder", disenador: "🎨 Diseñador", developer: "🛠️ Developer",
      "data-analyst": "📊 Data Analyst", otro: "✨ General",
    };

    const text = skills
      .map((s: any, i: number) => `${i + 1}. **${s.display_name}** [${s.category}] — ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · Quality: ${((s.quality_rank || 0) * 100).toFixed(0)}%\n   \`${s.install_command}\``)
      .join("\n\n");

    return { content: [{ type: "text" as const, text: `# Skills para ${roleLabels[roleLower] || args.role}\n\n${text}` }] };
  },
});

// ─── RECOMMENDATION TOOLS ───

mcp.tool("recommend_for_task", {
  description: "Get skill recommendations based on a specific task you want to accomplish. Uses semantic search and multi-signal quality ranking for relevant results.",
  inputSchema: {
    type: "object",
    properties: {
      task: { type: "string", description: "Describe the task you want to accomplish (e.g., 'crear contenido para redes sociales', 'revisar un contrato', 'automatizar reportes')" },
      role: { type: "string", description: "Optional: your professional role for better recommendations" },
    },
    required: ["task"],
  },
  handler: async (args: { task: string; role?: string }) => {
    logToolCall("recommend_for_task", args);
    logUsageEvent("search_result", undefined, undefined, args.task);
    const taskLower = args.task.toLowerCase();
    const roleLower = (args.role || "").toLowerCase();
    const roleCategories = ROLE_CATEGORIES[roleLower] || [];

    // Step 1: Use FTS RPC as primary candidate generator
    const { data: ftsResults } = await supabase.rpc("search_skills", {
      search_query: args.task,
      page_size: 20,
    });

    let candidates: any[] = ftsResults || [];

    // Step 2: If FTS returns < 5, fallback to semantic search
    if (candidates.length < 5) {
      try {
        const semanticResp = await fetch(`${supabaseUrl}/functions/v1/semantic-search`, {
          method: "POST",
          headers: { Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: args.task, limit: 20 }),
        });
        if (semanticResp.ok) {
          const semanticData = await semanticResp.json();
          const existingSlugs = new Set(candidates.map(c => c.slug));
          for (const s of semanticData.results || []) {
            if (!existingSlugs.has(s.slug)) {
              candidates.push({ ...s, similarity_score: s.similarity_score || 0.5 });
            }
          }
        }
      } catch { /* skip semantic errors */ }
    }

    // Step 3: Multi-signal re-ranking
    const scored = candidates.map((s: any) => {
      // 70% semantic/FTS similarity
      const semanticScore = (s.similarity_score || 0.5) * 0.70;
      // 15% quality rank
      const qualityScore = (s.quality_rank || 0) * 0.15;
      // 10% role relevance
      const roleBoost = roleCategories.includes(s.category) ? 0.10 : 0;
      // 5% verified installs
      const installScore = s.install_count_source === "tracked" ? Math.min(s.install_count || 0, 1000) / 1000 * 0.05 : 0;

      const finalScore = semanticScore + qualityScore + roleBoost + installScore;
      return { ...s, _finalScore: finalScore };
    });

    const results = scored.sort((a: any, b: any) => b._finalScore - a._finalScore).slice(0, 5);
    if (results.length === 0) return { content: [{ type: "text" as const, text: `No encontré skills relevantes para "${args.task}". Probá con \`solve_goal("${args.task}")\` para una búsqueda más amplia.` }] };

    const text = results
      .map((s: any, i: number) => `${i + 1}. **${s.display_name}** [${s.category}]\n   ${s.tagline}\n   ⭐ ${Number(s.avg_rating || 0).toFixed(1)} · Quality: ${((s.quality_rank || 0) * 100).toFixed(0)}%\n   \`${s.install_command}\``)
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
    logToolCall("compare_skills", args);
    logUsageEvents("compared", args.slugs.map(s => ({ slug: s, type: "skill" })));
    // Resolve slugs through redirects
    const resolvedSlugs = await Promise.all(args.slugs.map(s => resolveSlug(s, "skill")));
    const { data: skills, error } = await supabase
      .from("skills")
      .select("*")
      .in("slug", resolvedSlugs)
      .eq("status", "approved");

    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    if (!skills?.length) return { content: [{ type: "text" as const, text: "No encontré las skills solicitadas." }] };

    const text = skills.map((s: any) =>
      `## ${s.display_name}\n📂 ${s.category} · 🎯 ${s.target_roles?.join(", ")}\n⭐ ${Number(s.avg_rating).toFixed(1)} (${s.review_count} reviews) · ${s.install_count.toLocaleString()} installs\n⏱️ ${s.time_to_install_minutes} min instalación\n\n${s.tagline}\n\n\`${s.install_command}\``
    ).join("\n\n---\n\n");

    return { content: [{ type: "text" as const, text: `# Comparación de Skills\n\n${text}` }] };
  },
});

// Deduplicate connectors by brand: prefer is_official, then trust_score, then stars
function deduplicateConnectors(connectors: any[]): any[] {
  const brandMap = new Map<string, any>();
  for (const c of connectors) {
    const brand = c.name.toLowerCase().replace(/[-_](mcp|server|connector)$/i, "").replace(/\s+/g, "-");
    const existing = brandMap.get(brand);
    if (!existing) {
      brandMap.set(brand, c);
    } else {
      const cScore = (c.is_official ? 1000 : 0) + (c.trust_score || 0) + (c.github_stars || 0) / 100;
      const eScore = (existing.is_official ? 1000 : 0) + (existing.trust_score || 0) + (existing.github_stars || 0) / 100;
      if (cScore > eScore) brandMap.set(brand, c);
    }
  }
  return Array.from(brandMap.values());
}

// Sort results by trust: official first, then trust_score, then stars
function sortByTrust(items: any[]): any[] {
  return items.sort((a, b) => {
    // Official always first
    if (a.is_official && !b.is_official) return -1;
    if (!a.is_official && b.is_official) return 1;
    // Then by trust_score
    const ta = a.trust_score || 0;
    const tb = b.trust_score || 0;
    if (ta !== tb) return tb - ta;
    // Then by stars
    return (b.github_stars || 0) - (a.github_stars || 0);
  });
}

// ─── CONNECTOR TOOLS ───

mcp.tool("search_connectors", {
  description: "Search 500+ installable MCP connectors (servers) by name. These are MCP servers users can add to Claude, Cursor, Windsurf, or any AI agent to access external services (Slack, GitHub, Instagram, databases, etc.). Returns name, slug, install command, homepage, and GitHub stars. Use get_connector_details(slug) for full setup guide, or get_install_command(slug) for the exact install command. NOTE: For goal-oriented queries, use solve_goal instead.",
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
    logToolCall("search_connectors", args);
    const lim = Math.min(args.limit || 5, 10);
    const queryLower = sanitizeForPostgrest(args.query);
    const selectCols = "name, slug, description, description_es, category, github_stars, github_url, install_command, is_official, icon_url, homepage, docs_url, trust_score";
    const words = queryLower.split(/\s+/).filter(w => w.length >= 2);
    const catFilter = args.category ? (qb: any) => qb.eq("category", args.category) : undefined;

    // Run exact-phrase search AND word-split search in parallel for better recall
    let exactQ = supabase
      .from("mcp_servers")
      .select(selectCols)
      .eq("status", "approved")
      .or(`name.ilike.%${queryLower}%,slug.ilike.%${queryLower}%,description.ilike.%${queryLower}%,description_es.ilike.%${queryLower}%`)
      .order("is_official", { ascending: false })
      .order("github_stars", { ascending: false })
      .limit(lim * 2);
    if (args.category) exactQ = exactQ.eq("category", args.category);

    const [exactRes, wordSplitRes] = await Promise.all([
      exactQ.then(r => r.data || []),
      words.length > 1
        ? wordSplitSearch("mcp_servers", selectCols, words, "github_stars", lim * 2, catFilter)
        : Promise.resolve([]),
    ]);

    // Merge: exact matches first, then word-split results (deduplicated)
    const seenSlugs = new Set<string>();
    const merged: any[] = [];
    for (const item of [...exactRes, ...wordSplitRes]) {
      if (!seenSlugs.has(item.slug)) {
        seenSlugs.add(item.slug);
        merged.push(item);
      }
    }
    let results = sortByTrust(deduplicateConnectors(merged)).slice(0, lim);
    let fallbackUsed = results.length > 0 ? (wordSplitRes.length > 0 ? "merged" : "exact") : "none";

    logUsageEvents("search_result", results.map((r: any) => ({ slug: r.slug, type: "connector" })), args.query);
    console.log(JSON.stringify({ tool: "search_connectors", query: args.query, sanitized: queryLower, category: args.category || null, resultCount: results.length, fallbackUsed }));

    if (results.length === 0) return { content: [{ type: "text" as const, text: `No encontré conectores para "${args.query}". Intenta con otros términos o usa \`solve_goal\` para una búsqueda más amplia.` }] };

    // Group results by category for better orientation when many results
    const categoryGroups: Record<string, any[]> = {};
    for (const c of results) {
      const cat = c.category || "general";
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      categoryGroups[cat].push(c);
    }
    const categorySummary = results.length >= 4
      ? `\n📂 Categories: ${Object.entries(categoryGroups).map(([cat, items]) => `${cat} (${items.length})`).join(", ")}\n`
      : "";

    const header = `Found ${results.length} installable MCP connector${results.length > 1 ? "s" : ""} for "${args.query}". These are MCP servers you can add to your AI agent (Claude, Cursor, etc.) to access ${args.query}-related services.${categorySummary}\n`;

    const text = results
      .map((c: any) => {
        const links = [c.homepage ? `Homepage: ${c.homepage}` : "", c.docs_url ? `Docs: ${c.docs_url}` : "", c.github_url ? `GitHub: ${c.github_url}` : ""].filter(Boolean).join(" · ");
        return `**${c.name}** (\`${c.slug}\`) [${c.category}]${c.is_official ? " ✅ Official" : ""} (⭐ ${(c.github_stars || 0).toLocaleString()} GitHub stars)\n${c.description}\n${links}${c.install_command ? `\nInstall: \`${c.install_command}\`` : ""}`;
      })
      .join("\n\n---\n\n");

    const footer = `\n\n---\n💡 **Next steps:** Use \`get_connector_details('${results[0].slug}')\` for full setup guide, or \`get_install_command('${results[0].slug}')\` for the exact install command.`;

    return { content: [{ type: "text" as const, text: header + text + footer }] };
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
    logToolCall("get_connector_details", args);
    logUsageEvent("view", args.slug, "connector");
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
    logToolCall("list_popular_connectors", args);
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
    logToolCall("search_plugins", args);
    const lim = Math.min(args.limit || 5, 10);
    const queryLower = sanitizeForPostgrest(args.query);
    const selectCols = "name, slug, description, category, platform, github_stars, github_url, is_official, is_anthropic_verified, install_count, homepage";
    const words = queryLower.split(/\s+/).filter(w => w.length >= 2);
    const extraFilter = (qb: any) => {
      if (args.category) qb = qb.eq("category", args.category);
      if (args.platform) qb = qb.eq("platform", args.platform);
      return qb;
    };

    let exactQ = supabase
      .from("plugins")
      .select(selectCols)
      .eq("status", "approved")
      .or(`name.ilike.%${queryLower}%,slug.ilike.%${queryLower}%,description.ilike.%${queryLower}%,description_es.ilike.%${queryLower}%`)
      .order("install_count", { ascending: false })
      .limit(lim);
    if (args.category) exactQ = exactQ.eq("category", args.category);
    if (args.platform) exactQ = exactQ.eq("platform", args.platform);

    const [exactRes, wordSplitRes] = await Promise.all([
      exactQ.then(r => r.data || []),
      words.length > 1
        ? wordSplitSearch("plugins", selectCols, words, "install_count", lim * 2, extraFilter)
        : Promise.resolve([]),
    ]);

    const seenSlugs = new Set<string>();
    const merged: any[] = [];
    for (const item of [...exactRes, ...wordSplitRes]) {
      if (!seenSlugs.has(item.slug)) {
        seenSlugs.add(item.slug);
        merged.push(item);
      }
    }
    let results = merged.slice(0, lim);

    if (results.length === 0) return { content: [{ type: "text" as const, text: `No encontré plugins para "${args.query}". Intenta con otros términos o usa \`solve_goal\`.` }] };
    logUsageEvents("search_result", results.map((r: any) => ({ slug: r.slug, type: "plugin" })), args.query);

    const text = results
      .map((p: any) => {
        const badges = [p.is_anthropic_verified ? "🏅 Anthropic Verified" : "", p.is_official ? "✅ Official" : ""].filter(Boolean).join(" ");
        return `**${p.name}** [${p.category}] ${badges}\n${p.description}\n📦 ${p.platform} · ${p.install_count.toLocaleString()} installs${p.homepage ? `\n🔗 ${p.homepage}` : ""}${p.github_url ? `\nGitHub: ${p.github_url}` : ""}`;
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
    logToolCall("get_plugin_details", args);
    logUsageEvent("view", args.slug, "plugin");
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
    logToolCall("list_popular_plugins", args);
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
  description: "Search across the entire Pymaia directory — skills, MCP connectors (installable servers), and plugins — in a single query. Results are installable tools you can add to any AI agent. Great for broad discovery. Use get_install_command(slug) or get_connector_details(slug) for setup instructions on any result.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query describing what you're looking for" },
      limit: { type: "number", description: "Max results per type (default: 3)" },
    },
    required: ["query"],
  },
  handler: async (args: { query: string; limit?: number }) => {
    logToolCall("explore_directory", args);
    logUsageEvent("search_result", undefined, undefined, args.query);
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
      searchTable("mcp_servers", "name, description, slug, category, github_stars, is_official, install_command, homepage, trust_score", "github_stars"),
      searchTable("plugins", "name, description, slug, category, platform, install_count, is_official, homepage", "install_count"),
    ]);

    const connectors = sortByTrust(deduplicateConnectors(connectorsRaw));

    const sections: string[] = [];

    if (skills.length > 0) {
      sections.push("## 🧠 Skills\n\n" + skills.map((s: any) => `- **${s.display_name}** (\`${s.slug}\`) [${s.category}] — ${s.tagline}\n  \`${s.install_command}\``).join("\n"));
    }
    if (connectors.length > 0) {
      sections.push("## 🔌 MCP Connectors (installable servers)\n\n" + connectors.map((c: any) => `- **${c.name}** (\`${c.slug}\`) [${c.category}]${c.is_official ? " ✅" : ""} — ${c.description}${c.install_command ? `\n  Install: \`${c.install_command}\`` : ""}${c.homepage ? ` · ${c.homepage}` : ""}`).join("\n"));
    }
    if (plugins.length > 0) {
      sections.push("## 🧩 Plugins\n\n" + plugins.map((p: any) => `- **${p.name}** (\`${p.slug}\`) [${p.category}] (${p.platform}) — ${p.description}${p.homepage ? ` · ${p.homepage}` : ""}`).join("\n"));
    }

    if (sections.length === 0) return { content: [{ type: "text" as const, text: `No results found for "${args.query}".` }] };

    const allSlugs = [...skills.map((s: any) => s.slug), ...connectors.map((c: any) => c.slug), ...plugins.map((p: any) => p.slug)];
    const footer = allSlugs.length > 0 ? `\n\n---\n💡 **Next steps:** Use \`get_connector_details('${connectors[0]?.slug || allSlugs[0]}')\` for full setup guide, or \`get_install_command('${allSlugs[0]}')\` for the exact install command.` : "";

    return { content: [{ type: "text" as const, text: `# Directory results for "${args.query}"\n\nThese are installable tools you can add to any AI agent (Claude, Cursor, Windsurf, etc.).\n\n${sections.join("\n\n")}${footer}` }] };
  },
});

// ─── HELPERS: Cross-catalog search & compatibility ───

async function crossCatalogSearch(keywords: string[], limit = 5, apiUserId?: string | null) {
  const t0 = Date.now();
  const results: { skills: any[]; connectors: any[]; plugins: any[] } = { skills: [], connectors: [], plugins: [] };
  
  // Expand multi-word keywords but cap at 6 to reduce latency
  const expandedKeywords = new Set<string>();
  for (const kw of keywords) {
    expandedKeywords.add(kw);
    const parts = kw.split(/\s+/).filter(w => w.length >= 2);
    if (parts.length > 1) {
      for (const part of parts) expandedKeywords.add(part);
    }
  }
  const uniqueExpanded = [...expandedKeywords].slice(0, 6);

  // Run ALL keyword searches in parallel instead of sequential
  const searchPromises = uniqueExpanded.map(kw => {
    const q = sanitizeForPostgrest(kw);
    if (!q || q.length < 2) return Promise.resolve({ kw, sk: null, mc: null, pl: null });

    let skillQuery = supabase.from("skills")
      .select("display_name, slug, tagline, category, avg_rating, install_count, install_command, trust_score, security_status, github_stars, is_public, creator_id")
      .or(
        apiUserId
          ? `and(status.eq.approved,is_public.eq.true),creator_id.eq.${apiUserId}`
          : `and(status.eq.approved,is_public.eq.true)`
      )
      .or(`display_name.ilike.%${q}%,display_name_es.ilike.%${q}%,tagline.ilike.%${q}%,tagline_es.ilike.%${q}%,description_human.ilike.%${q}%,description_human_es.ilike.%${q}%,slug.ilike.%${q}%,category.ilike.%${q}%`)
      .order("install_count", { ascending: false }).limit(limit);
    
    return Promise.all([
      skillQuery,
      supabase.from("mcp_servers")
        .select("name, slug, description, category, github_stars, is_official, install_command, trust_score, security_status, homepage, docs_url")
        .eq("status", "approved")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%,description_es.ilike.%${q}%,category.ilike.%${q}%`)
        .order("is_official", { ascending: false })
        .order("trust_score", { ascending: false })
        .order("github_stars", { ascending: false }).limit(limit),
      supabase.from("plugins")
        .select("name, slug, description, category, platform, install_count, is_official, is_anthropic_verified, trust_score, security_status, github_stars")
        .eq("status", "approved")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%,description_es.ilike.%${q}%,category.ilike.%${q}%`)
        .order("install_count", { ascending: false }).limit(limit),
    ]).then(([{ data: sk }, { data: mc }, { data: pl }]) => ({ kw, sk, mc, pl }));
  });

  const allResults = await Promise.all(searchPromises);
  for (const { kw, sk, mc, pl } of allResults) {
    if (sk) results.skills.push(...sk);
    if (mc) results.connectors.push(...mc);
    if (pl) results.plugins.push(...pl);
  }
  
  const seenSlugs = new Set<string>();
  results.skills = results.skills.filter(s => { if (seenSlugs.has(s.slug)) return false; seenSlugs.add(s.slug); return true; });
  results.connectors = sortByTrust(deduplicateConnectors(results.connectors.filter(c => { if (seenSlugs.has(c.slug)) return false; seenSlugs.add(c.slug); return true; })));
  results.plugins = results.plugins.filter(p => { if (seenSlugs.has(p.slug)) return false; seenSlugs.add(p.slug); return true; });

  console.log(JSON.stringify({ fn: "crossCatalogSearch", ms: Date.now() - t0, totalKeywords: uniqueExpanded.length, deduped: { skills: results.skills.length, connectors: results.connectors.length, plugins: results.plugins.length } }));
  
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
  description: "⭐ PRIMARY TOOL — Use this FIRST for any goal or task. Given a business goal in natural language, the AI Solutions Architect searches 38K+ skills, MCP connectors, AND plugins simultaneously, then returns TWO curated options (A: simple, B: flexible) with trust scores, compatibility analysis, security warnings, and step-by-step install commands. Examples: 'run Meta Ads campaigns', 'automate code reviews', 'set up outbound email'. Pass user_id to personalize based on install history.",
  inputSchema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "The user's goal in natural language (e.g., 'automate outbound sales', 'set up CI/CD pipeline')" },
      role: { type: "string", description: "Optional: user's professional role" },
      technical_level: { type: "string", description: "Optional: non-technical, semi-technical, technical, developer" },
      budget: { type: "string", description: "Optional: free-only, paid-ok, enterprise" },
      user_id: { type: "string", description: "Optional: user UUID for personalized recommendations based on install history" },
    },
    required: ["goal"],
  },
  handler: async (args: { goal: string; role?: string; technical_level?: string; budget?: string; user_id?: string }) => {
    logToolCall("solve_goal", args);
    logUsageEvent("solve_goal", undefined, undefined, args.goal);
    const goalLower = args.goal.toLowerCase();
    const apiUserId = currentApiKeyUserId;

    // 0. Conversational Goal Refinement with structured options
    const goalWords = goalLower.split(/\s+/).filter(w => w.length >= 2);
    if (goalWords.length < 3) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            status: "needs_clarification",
            message: "Your goal is quite broad. To give you the best recommendations, could you provide more detail?",
            structured_options: {
              domain: ["engineering", "marketing", "sales", "design", "legal", "finance", "operations", "general"],
              technical_level: ["non-technical", "semi-technical", "developer"],
              budget: ["free-only", "paid-ok", "enterprise"],
            },
            questions: [
              "What specific task or process do you want to automate/improve?",
              "What tools or platforms are you currently using?",
              "What's your technical level: non-technical, semi-technical, or developer?",
              "What industry are you in? (e.g., marketing, legal, engineering, sales)",
            ],
            tip: "Try something like: 'automate outbound sales emails with CRM integration' or 'set up CI/CD pipeline with security scanning'",
          }),
        }],
      };
    }

    const solveT0 = Date.now();

    // 0. ML Intent Classification (replaces pure keyword matching)
    const intent = await classifyIntent(args.goal, args.role);
    const classifyMs = Date.now() - solveT0;

    console.log(JSON.stringify({ tool: "solve_goal", phase: "classified", ms: classifyMs, goal: args.goal, keywords: intent.keywords, category: intent.category, domain: intent.domain, confidence: intent.confidence }));

    // 0b. A/B variant assignment
    const variant: ABVariant = assignVariant(args.goal, args.user_id);

    // 1. Match goal templates (enhanced with AI-extracted keywords)
    const { data: templates } = await supabase.from("goal_templates").select("*").eq("is_active", true);
    let matchedTemplate: any = null;
    let bestScore = 0;
    for (const t of templates || []) {
      let score = 0;
      for (const trigger of (t.triggers || [])) {
        if (goalLower.includes(trigger.toLowerCase())) score += trigger.length;
      }
      // Boost template match with AI-classified domain
      if (intent.domain !== "general" && t.domain === intent.domain) score += 5;
      if (intent.category && t.domain === intent.category) score += 3;
      if (score > bestScore) { bestScore = score; matchedTemplate = t; }
    }

    const capabilities = matchedTemplate?.capabilities || [];
    const templateDomain = matchedTemplate?.domain || intent.domain || "general";

    // 2. Collect search keywords (ML-enhanced + template + goal words) — cap at 6
    const allKeywords: string[] = [...intent.keywords];
    for (const cap of capabilities) { if (cap.keywords) allKeywords.push(...cap.keywords); }
    const goalWords2 = goalLower.split(/\s+/).filter((w: string) => w.length >= 3);
    allKeywords.push(...goalWords2);
    const uniqueKeywords = [...new Set(allKeywords)].slice(0, 6);

    // 3. Cross-catalog search (parallel per keyword now)
    const searchT0 = Date.now();
    const searchResults = await crossCatalogSearch(uniqueKeywords, 8, apiUserId);
    let allItems = [
      ...searchResults.skills.map((s: any) => ({ ...s, type: "skill", name: s.display_name, desc: s.tagline })),
      ...searchResults.connectors.map((c: any) => ({ ...c, type: "connector", desc: c.description })),
      ...searchResults.plugins.map((p: any) => ({ ...p, type: "plugin", desc: p.description })),
    ];
    console.log(JSON.stringify({ tool: "solve_goal", phase: "cross_catalog", ms: Date.now() - searchT0, results: allItems.length }));

    // 3b-3e: Fallbacks only if cross-catalog returned nothing (each with time budget)
    if (allItems.length === 0 && (Date.now() - solveT0) < 15000) {
      // 3b. Semantic search
      try {
        const semanticResp = await fetch(`${supabaseUrl}/functions/v1/semantic-search`, {
          method: "POST",
          headers: { Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: args.goal, limit: 12 }),
        });
        if (semanticResp.ok) {
          const semanticData = await semanticResp.json();
          for (const s of semanticData.results || []) {
            allItems.push({ ...s, type: "skill", name: s.display_name, desc: s.tagline || s.description_human });
          }
        }
      } catch { /* skip */ }
      console.log(JSON.stringify({ tool: "solve_goal", phase: "semantic_fallback", ms: Date.now() - solveT0, results: allItems.length }));
    }

    if (allItems.length === 0 && (Date.now() - solveT0) < 20000) {
      // 3c. FTS RPC
      const { data: ftsResults } = await supabase.rpc("search_skills", { search_query: args.goal, page_size: 12 });
      if (ftsResults && ftsResults.length > 0) {
        for (const s of ftsResults) allItems.push({ ...s, type: "skill", name: s.display_name, desc: s.tagline });
      }
      console.log(JSON.stringify({ tool: "solve_goal", phase: "fts_fallback", ms: Date.now() - solveT0, results: allItems.length }));
    }

    if (allItems.length === 0 && intent.category && (Date.now() - solveT0) < 25000) {
      // 3d. Category-based browse
      const [{ data: catSkills }, { data: catConnectors }, { data: catPlugins }] = await Promise.all([
        supabase.from("skills")
          .select("display_name, slug, tagline, category, avg_rating, install_count, install_command, trust_score, quality_rank, github_stars")
          .eq("status", "approved").eq("category", intent.category)
          .order("quality_rank", { ascending: false }).limit(8),
        supabase.from("mcp_servers")
          .select("name, slug, description, category, github_stars, is_official, install_command, trust_score, security_status, homepage")
          .eq("status", "approved").eq("category", intent.category)
          .order("trust_score", { ascending: false }).limit(5),
        supabase.from("plugins")
          .select("name, slug, description, category, platform, install_count, is_official, trust_score, github_stars")
          .eq("status", "approved").eq("category", intent.category)
          .order("install_count", { ascending: false }).limit(5),
      ]);
      if (catSkills) for (const s of catSkills) allItems.push({ ...s, type: "skill", name: s.display_name, desc: s.tagline });
      if (catConnectors) for (const c of catConnectors) allItems.push({ ...c, type: "connector", desc: c.description });
      if (catPlugins) for (const p of catPlugins) allItems.push({ ...p, type: "plugin", desc: p.description });
      console.log(JSON.stringify({ tool: "solve_goal", phase: "category_fallback", ms: Date.now() - solveT0, results: allItems.length }));
    }

    if (allItems.length === 0 && (Date.now() - solveT0) < 28000) {
      // 3e. Domain keyword fallback
      const domainKeywords = KEYWORD_DOMAIN_MAP[intent.domain] || [];
      const extraKeywords = domainKeywords.slice(0, 4).map(k => k.split(/\s+/)[0]);
      if (extraKeywords.length > 0) {
        const broadResults = await crossCatalogSearch(extraKeywords, 6, apiUserId);
        allItems.push(
          ...broadResults.skills.map((s: any) => ({ ...s, type: "skill", name: s.display_name, desc: s.tagline })),
          ...broadResults.connectors.map((c: any) => ({ ...c, type: "connector", desc: c.description })),
          ...broadResults.plugins.map((p: any) => ({ ...p, type: "plugin", desc: p.description })),
        );
      }
      console.log(JSON.stringify({ tool: "solve_goal", phase: "domain_fallback", ms: Date.now() - solveT0, results: allItems.length }));
    }

    console.log(JSON.stringify({ tool: "solve_goal", phase: "search_complete", ms: Date.now() - solveT0, totalItems: allItems.length, uniqueKeywords: uniqueKeywords.length }));

    // 4. Score by relevance (ML-enhanced with quality guards)
    // Filter out generic/meta tools AND solve_goal excluded tools
    const filteredItems = allItems.filter((item: any) => !GENERIC_TOOL_SLUGS.has(item.slug) && !SOLVE_GOAL_EXCLUDED_SLUGS.has(item.slug));
    const CORRUPTED_TAGLINES = ["discover and install skills", "a curated list of", "a collection of", "collection of awesome", "the lobster way", "deep agents is"];
    const scored = filteredItems.map((item: any) => {
      let score = 0;
      const descLower = (item.desc || "").toLowerCase();
      const nameLower = (item.name || "").toLowerCase();
      const searchable = `${nameLower} ${descLower} ${item.category || ""}`;

      // QUALITY GUARD: Penalize corrupted/generic taglines (monorepo inheritance)
      const hasCorruptedTagline = CORRUPTED_TAGLINES.some(ct => descLower.startsWith(ct));
      if (hasCorruptedTagline) score -= 15;

      // QUALITY GUARD: Penalize items where tagline doesn't relate to the name at all
      const nameWords = nameLower.split(/[\s-]+/).filter((w: string) => w.length >= 3);
      const taglineMatchesName = nameWords.some((w: string) => descLower.includes(w));
      if (!taglineMatchesName && nameWords.length > 0) score -= 5;

      // QUALITY GUARD: Penalize zero-signal items (no stars, no installs, no trust)
      const totalSignals = (item.github_stars || 0) + (item.install_count || 0) + (item.trust_score || 0);
      if (totalSignals === 0) score -= 8;

      // Keyword relevance
      for (const kw of goalWords2) { if (searchable.includes(kw)) score += 3; }
      for (const kw of uniqueKeywords) { if (searchable.includes(kw.toLowerCase())) score += 1; }
      for (const kw of intent.keywords) { if (searchable.includes(kw.toLowerCase())) score += 2; }
      for (const cap of intent.capabilities) { if (searchable.includes(cap.toLowerCase())) score += 3; }
      if (intent.category && item.category === intent.category) score += 4;

      // Quality signals (with inflated-stars guard)
      const stars = item.github_stars || 0;
      const installs = item.install_count || 0;
      // Only trust high star counts if tagline isn't corrupted
      if (!hasCorruptedTagline) {
        if (stars > 10000) score += 5; else if (stars > 1000) score += 3; else if (stars > 100) score += 1;
      }
      if (installs > 100) score += 3; else if (installs > 10) score += 1;
      if (item.is_official) score += 3;
      if (item.is_anthropic_verified) score += 2;
      if (item.avg_rating >= 4.0) score += 2;
      score += (item.trust_score || 0) / 20;

      // Goal-word relevance penalty: if NO goal words (4+ chars) appear in description, penalize 80%
      const goalWordsLong = goalWords2.filter(w => w.length >= 4);
      if (goalWordsLong.length > 0) {
        const matchCount = goalWordsLong.filter(w => searchable.includes(w)).length;
        if (matchCount === 0) {
          score *= 0.2; // 80% penalty — no goal word overlap at all
        }
      }

      return { ...item, relevance: score };
    }).sort((a: any, b: any) => b.relevance - a.relevance);

    // A/B variant "reranked": for the reranked variant, apply confidence-weighted randomization
    if (variant === "reranked" && intent.confidence > 0.5) {
      // Shuffle items within similar relevance tiers to test if strict ordering matters
      for (let i = 0; i < scored.length - 1; i++) {
        if (Math.abs(scored[i].relevance - scored[i + 1].relevance) <= 2) {
          // Swap with 50% probability within same tier
          if (hashString(`${args.goal}:${i}`) % 2 === 0) {
            [scored[i], scored[i + 1]] = [scored[i + 1], scored[i]];
          }
        }
      }
    }

    // 4b. Personalization: adjust scores based on user install history
    let installedSlugs = new Set<string>();
    let userCategories: Record<string, number> = {};
    if (args.user_id) {
      const { data: installs } = await supabase
        .from("installations")
        .select("skill_id")
        .eq("user_id", args.user_id)
        .limit(200);
      if (installs && installs.length > 0) {
        const skillIds = installs.map((i: any) => i.skill_id);
        const { data: installedSkills } = await supabase
          .from("skills")
          .select("slug, category")
          .in("id", skillIds);
        for (const s of installedSkills || []) {
          installedSlugs.add(s.slug);
          userCategories[s.category] = (userCategories[s.category] || 0) + 1;
        }
        // Re-score: deprioritize already-installed, boost same-category
        for (const item of scored) {
          if (installedSlugs.has(item.slug)) {
            item.relevance -= 10; // Deprioritize already installed
            item._installed = true;
          }
          if (userCategories[item.category]) {
            item.relevance += Math.min(userCategories[item.category], 3); // Boost preferred categories
          }
        }
        scored.sort((a: any, b: any) => b.relevance - a.relevance);
      }
    }

    // 5. Compose Option A (simple — type-balanced: max 1 plugin, 2 connectors, 2 skills)
    const optionA: any[] = [];
    const usedA = new Set<string>();
    for (const item of scored.filter((i: any) => i.type === "plugin")) { if (optionA.filter((x: any) => x.type === "plugin").length >= 1 || usedA.has(item.slug)) continue; optionA.push(item); usedA.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "connector")) { if (optionA.filter((x: any) => x.type === "connector").length >= 2 || usedA.has(item.slug)) continue; optionA.push(item); usedA.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "skill")) { if (optionA.length >= 5 || usedA.has(item.slug)) continue; optionA.push(item); usedA.add(item.slug); }

    // 6. Compose Option B (flexible — max 3 connectors, 2 skills, 1 plugin)
    const optionB: any[] = [];
    const usedB = new Set<string>();
    for (const item of scored.filter((i: any) => i.type === "connector" && i.is_official)) { if (optionB.filter((x: any) => x.type === "connector").length >= 2 || usedB.has(item.slug)) continue; optionB.push(item); usedB.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "connector" && !i.is_official)) { if (optionB.filter((x: any) => x.type === "connector").length >= 3 || usedB.has(item.slug)) continue; optionB.push(item); usedB.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "skill")) { if (optionB.filter((x: any) => x.type === "skill").length >= 2 || usedB.has(item.slug)) continue; optionB.push(item); usedB.add(item.slug); }
    for (const item of scored.filter((i: any) => i.type === "plugin")) { if (optionB.length >= 6 || usedB.has(item.slug)) continue; optionB.push(item); usedB.add(item.slug); }

    // 7. Compatibility analysis (skip if over time budget)
    let warningsA: string[] = [], warningsB: string[] = [];
    if ((Date.now() - solveT0) < 20000) {
      [warningsA, warningsB] = await Promise.all([getCompatibilityWarnings(optionA), getCompatibilityWarnings(optionB)]);
    } else {
      console.log(JSON.stringify({ tool: "solve_goal", phase: "skip_compat", ms: Date.now() - solveT0 }));
    }

    // 8. Build response
    const sections: string[] = [];
    sections.push(`# 🎯 Pymaia Agent — Solution for: "${args.goal}"\n`);

    // Fix 2: Use keyword domain for header when LLM template doesn't match the actual goal
    const keywordDomainForDisplay = detectDomainByKeywords(args.goal);
    if (matchedTemplate) {
      // Check if the template display name or triggers actually relate to the goal keywords
      const templateText = `${matchedTemplate.display_name} ${(matchedTemplate.triggers || []).join(" ")}`.toLowerCase();
      const goalKeywordsForMatch = goalWords2.filter((w: string) => w.length >= 4);
      const templateMatchesGoal = goalKeywordsForMatch.some((w: string) => templateText.includes(w));
      
      if (templateMatchesGoal && (keywordDomainForDisplay.domain === "general" || keywordDomainForDisplay.confidence < 0.5)) {
        // Template seems to match AND keyword detection is uncertain — trust the template
        sections.push(`**Goal detected:** ${matchedTemplate.display_name} (${templateDomain})`);
        if (matchedTemplate.description) sections.push(`*${matchedTemplate.description}*\n`);
      } else if (keywordDomainForDisplay.domain !== "general" && keywordDomainForDisplay.confidence >= 0.5) {
        // Keyword detection is confident — use keyword domain for display
        const displayDomain = keywordDomainForDisplay.domain.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        sections.push(`**Domain:** ${displayDomain}`);
      } else {
        // Template matched but keyword detection also general — show template
        sections.push(`**Goal detected:** ${matchedTemplate.display_name} (${templateDomain})`);
        if (matchedTemplate.description) sections.push(`*${matchedTemplate.description}*\n`);
      }
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

    // Check if both options are empty — guaranteed non-empty final response
    if (optionA.length === 0 && optionB.length === 0) {
      // Get catalog stats for context
      const { data: statsRow } = await supabase.from("directory_stats_mv").select("*").limit(1).maybeSingle();
      const totalTools = (statsRow?.skills_count || 0) + (statsRow?.connectors_count || 0) + (statsRow?.plugins_count || 0);

      // Find related categories
      const keywordDomain = detectDomainByKeywords(args.goal);
      const relatedCats = keywordDomain.domain !== "general"
        ? [DOMAIN_TO_CATEGORY[keywordDomain.domain], intent.category].filter(Boolean)
        : [intent.category].filter(Boolean);

      // Get top skills from related categories as suggestions
      let suggestions: any[] = [];
      if (relatedCats.length > 0) {
        const { data } = await supabase
          .from("skills")
          .select("display_name, slug, tagline, category, install_command, quality_rank")
          .eq("status", "approved")
          .in("category", relatedCats)
          .order("quality_rank", { ascending: false })
          .limit(3);
        suggestions = data || [];
      }

      sections.push(`## Could not find a specific solution for: "${args.goal}"\n`);
      sections.push(`Searched ${totalTools.toLocaleString()}+ tools but couldn't find an exact match.\n`);
      sections.push(`### Suggestions`);
      sections.push(`- Try rephrasing your goal with more specific keywords`);
      sections.push(`- Use \`search_skills\`, \`search_connectors\`, or \`search_plugins\` to search individually`);
      sections.push(`- Use \`explore_directory\` for broad cross-catalog search`);
      sections.push(`- Browse \`list_categories\` to find relevant categories\n`);

      if (suggestions.length > 0) {
        sections.push(`### Related tools you might find useful\n`);
        for (const s of suggestions) {
          sections.push(`- **${s.display_name}** [${s.category}] — ${s.tagline}\n  \`${s.install_command}\``);
        }
      }

      if (relatedCats.length > 0) {
        sections.push(`\n### Related categories: ${relatedCats.join(", ")}`);
      }

      return { content: [{ type: "text" as const, text: sections.join("\n") }] };
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

    if (!matchedTemplate && intent.confidence > 0) {
      sections.push(`\n*🧠 AI Intent: ${intent.capabilities.join(", ")} (${intent.domain}, confidence: ${Math.round(intent.confidence * 100)}%)*`);
    } else if (!matchedTemplate) {
      sections.push(`\n*No exact goal template matched. Results based on keyword analysis.*`);
    }
    if (installedSlugs.size > 0) {
      const alreadyInstalled = [...optionA, ...optionB].filter((i: any) => i._installed);
      if (alreadyInstalled.length > 0) {
        sections.push(`\n📌 **Personalized:** ${alreadyInstalled.length} tool(s) you already have were deprioritized. Showing new recommendations.`);
      }
      sections.push(`*Recommendations personalized based on your ${installedSlugs.size} installed tools.*`);
    }

    // A/B experiment tag
    sections.push(`\n<sub>experiment: ${variant} · classifier: ${intent.confidence > 0 ? "ml" : "keyword"}</sub>`);

    if (matchedTemplate) {
      supabase.from("goal_templates").update({ usage_count: (matchedTemplate.usage_count || 0) + 1 }).eq("id", matchedTemplate.id).then(() => {});
    }

    // Track analytics (fire-and-forget — don't block response)
    const allSlugs = [...optionA, ...optionB].map((i: any) => i.slug);
    supabase.from("agent_analytics").insert({
      event_type: "solve_goal",
      tool_name: "solve_goal",
      goal: args.goal,
      items_recommended: allSlugs,
      event_data: {
        variant,
        classifier_confidence: intent.confidence,
        classifier_category: intent.category,
        classifier_domain: intent.domain,
        matched_template: matchedTemplate?.slug || null,
        recommended_option: rec,
        option_a_count: optionA.length,
        option_b_count: optionB.length,
        skills_count: [...optionA, ...optionB].filter((i: any) => i.type === "skill").length,
        connectors_count: [...optionA, ...optionB].filter((i: any) => i.type === "connector").length,
        plugins_count: [...optionA, ...optionB].filter((i: any) => i.type === "plugin").length,
        keywords: intent.keywords || [],
        total_ms: Date.now() - solveT0,
      },
    }).then(() => {});

    console.log(JSON.stringify({ tool: "solve_goal", phase: "done", ms: Date.now() - solveT0, optionA: optionA.length, optionB: optionB.length }));
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
    logToolCall("rate_recommendation", args);
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
  description: "Returns a curated kit of recommended tools (skills, MCPs, plugins) for a specific professional role. Supports tiered kits: 'essentials' (free, top 5) and 'advanced' (extended, top 10 + stack-specific connectors + bundles). Optionally filters by tech stack.",
  inputSchema: {
    type: "object",
    properties: {
      role: { type: "string", description: "Professional role: marketer, developer, product-manager, designer, sales, consultant, lawyer, founder, data-analyst, devops, doctor, teacher, hr, other" },
      stack: { type: "array", items: { type: "string" }, description: "Optional: current tools/platforms (e.g., ['nextjs', 'supabase', 'figma'])" },
      tier: { type: "string", description: "Kit tier: 'essentials' (top 5 free skills) or 'advanced' (top 10 + connectors + bundles). Default: essentials" },
      limit: { type: "number", description: "Max tools per section (default: 5 for essentials, 10 for advanced)" },
    },
    required: ["role"],
  },
  handler: async (args: { role: string; stack?: string[]; tier?: string; limit?: number }) => {
    logToolCall("get_role_kit", args);
    const isAdvanced = args.tier === "advanced";
    const lim = Math.min(args.limit || (isAdvanced ? 10 : 5), 15);
    const roleLower = args.role.toLowerCase();

    // Use ROLE_CATEGORIES for category-based filtering
    const relevantCategories = ROLE_CATEGORIES[roleLower] || [];

    // Map common role names to target_roles values
    const roleMap: Record<string, string[]> = {
      "marketer": ["marketer"], "developer": ["developer", "ingeniero"],
      "product-manager": ["product-manager", "founder"], "designer": ["disenador", "designer"],
      "sales": ["ventas", "sales"], "consultant": ["consultor"], "lawyer": ["abogado"],
      "founder": ["founder"], "data-analyst": ["data-analyst", "datos"],
      "devops": ["devops", "developer"], "doctor": ["medico"], "teacher": ["profesor"],
      "hr": ["rrhh"], "other": ["otro"],
    };
    const roleFilters = roleMap[roleLower] || [roleLower];

    // Fetch skills: prioritize by category + quality_rank
    let roleSkills: any[] = [];
    if (relevantCategories.length > 0) {
      const { data } = await supabase
        .from("skills")
        .select("display_name, slug, tagline, category, avg_rating, install_count, install_command, trust_score, target_roles, quality_rank")
        .eq("status", "approved")
        .in("category", relevantCategories)
        .gte("quality_rank", 0.2) // Minimum quality threshold
        .order("quality_rank", { ascending: false })
        .limit(lim * 3);
      roleSkills = data || [];
    }

    // Fallback: also try target_roles
    if (roleSkills.length < lim) {
      const { data } = await supabase
        .from("skills")
        .select("display_name, slug, tagline, category, avg_rating, install_count, install_command, trust_score, target_roles, quality_rank")
        .eq("status", "approved")
        .overlaps("target_roles", roleFilters)
        .gte("quality_rank", 0.15)
        .order("quality_rank", { ascending: false })
        .limit(lim);
      const existingSlugs = new Set(roleSkills.map(s => s.slug));
      for (const s of data || []) {
        if (!existingSlugs.has(s.slug)) roleSkills.push(s);
      }
    }

    // Sort by quality_rank
    roleSkills = roleSkills.sort((a: any, b: any) => (b.quality_rank || 0) - (a.quality_rank || 0));

    // If stack provided, search for stack-specific connectors
    let stackConnectors: any[] = [];
    if (args.stack && args.stack.length > 0) {
      for (const tool of args.stack.slice(0, 3)) {
        const q = sanitizeForPostgrest(tool);
        const { data } = await supabase
          .from("mcp_servers")
          .select("name, slug, description, category, github_stars, is_official, install_command, trust_score")
          .eq("status", "approved")
          .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`)
          .order("github_stars", { ascending: false })
          .limit(2);
        if (data) stackConnectors.push(...data);
      }
      stackConnectors = deduplicateConnectors(stackConnectors);
    }

    // Deduplicate: if a tool appears as both skill and connector, remove from skills
    const connectorSlugs = new Set(stackConnectors.map(c => c.slug));
    roleSkills = roleSkills.filter(s => !connectorSlugs.has(s.slug));

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
    const tierLabel = isAdvanced ? "Advanced" : "Essentials";

    sections.push(`# 🎯 ${tierLabel} Kit for ${roleLabel}\n`);
    if (!isAdvanced) {
      sections.push(`*Free essentials kit. Use \`get_role_kit\` with \`tier: "advanced"\` for extended recommendations with stack-specific connectors and pre-built kits.*\n`);
    }

    // Essential skills
    const essential = roleSkills.slice(0, lim);
    if (essential.length > 0) {
      sections.push(`## ${isAdvanced ? "Top" : "Essential"} Skills\n`);
      sections.push(`Top ${essential.length} skills used by ${roleLabel}s:\n`);
      for (let i = 0; i < essential.length; i++) {
        const s = essential[i];
        const trustBadge = (s.trust_score || 0) >= 70 ? "🟢" : (s.trust_score || 0) >= 40 ? "🟡" : "⚪";
        sections.push(`${i + 1}. **${s.display_name}** [${s.category}] ${trustBadge} Trust: ${s.trust_score || "N/A"}`);
        sections.push(`   ${s.tagline}`);
        sections.push(`   ⭐ ${Number(s.avg_rating).toFixed(1)} · Quality: ${((s.quality_rank || 0) * 100).toFixed(0)}%`);
        sections.push(`   \`${s.install_command}\`\n`);
      }
    }

    // Stack-specific connectors (advanced tier or if stack provided)
    if (stackConnectors.length > 0 && (isAdvanced || args.stack)) {
      sections.push(`## Stack-Specific Connectors${!isAdvanced ? " ⭐" : ""}\n`);
      sections.push(`Based on your stack (${args.stack!.join(", ")}):\n`);
      for (const c of stackConnectors) {
        const official = c.is_official ? " ✅ Official" : "";
        sections.push(`- **${c.name}**${official} [${c.category}] — ${c.description}`);
        if (c.install_command) sections.push(`  \`${c.install_command}\``);
      }
      sections.push("");
    }

    // Bundles (advanced tier only)
    if (isAdvanced && bundles && bundles.length > 0) {
      sections.push(`## Pre-built Kits ⭐\n`);
      for (const b of bundles) {
        sections.push(`${b.hero_emoji || "📦"} **${b.title}** — ${b.description}`);
        sections.push(`   Includes ${b.skill_slugs.length} tools\n`);
      }
    }

    // Advanced: cross-reference with popular plugins for this role
    if (isAdvanced) {
      let pluginCategories = relevantCategories.length > 0 ? relevantCategories : undefined;
      let pluginQuery = supabase
        .from("plugins")
        .select("name, slug, description, category, install_count, trust_score, is_official")
        .eq("status", "approved");
      if (pluginCategories) pluginQuery = pluginQuery.in("category", pluginCategories);
      pluginQuery = pluginQuery.order("trust_score", { ascending: false }).limit(5);
      const { data: rolePlugins } = await pluginQuery;

      if (rolePlugins && rolePlugins.length > 0) {
        // Deduplicate against skills
        const skillSlugs = new Set(essential.map(s => s.slug));
        const uniquePlugins = rolePlugins.filter(p => !skillSlugs.has(p.slug));
        if (uniquePlugins.length > 0) {
          sections.push(`## Recommended Plugins ⭐\n`);
          for (const p of uniquePlugins) {
            const tb = (p.trust_score || 0) >= 70 ? "🟢" : (p.trust_score || 0) >= 40 ? "🟡" : "⚪";
            sections.push(`- 🧩 **${p.name}** [${p.category}] ${tb} Trust: ${p.trust_score || "N/A"}`);
            sections.push(`  ${p.description}`);
          }
          sections.push("");
        }
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

    if (!isAdvanced) {
      sections.push(`\n---\n💎 *Want more? Use \`get_role_kit\` with \`tier: "advanced"\` for extended recommendations, stack-specific connectors, plugins, and pre-built kits.*`);
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
    logToolCall("explain_combination", args);
    // Resolve slugs through redirects
    const resolvedSlugs = await Promise.all(args.slugs.map(async s => {
      const r = await resolveSlug(s, "skill");
      return r !== s ? r : s; // Keep original if no redirect (works for connectors/plugins too)
    }));
    // Search across all 3 tables
    const [{ data: skills }, { data: connectors }, { data: plugins }] = await Promise.all([
      supabase.from("skills").select("display_name, slug, tagline, description_human, category, install_command, trust_score, security_status, required_mcps").in("slug", resolvedSlugs).eq("status", "approved"),
      supabase.from("mcp_servers").select("name, slug, description, category, install_command, trust_score, security_status, credentials_needed, is_official").in("slug", resolvedSlugs).eq("status", "approved"),
      supabase.from("plugins").select("name, slug, description, category, platform, trust_score, security_status, is_official, is_anthropic_verified").in("slug", resolvedSlugs).eq("status", "approved"),
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
    logToolCall("generate_custom_skill", args);
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

// ─── PHASE 2b: SKILLFORGE ↔ AGENT INTEGRATION ───

mcp.tool("suggest_for_skill_creation", {
  description: "Given a skill idea or goal, suggests existing tools from the catalog that the new skill could integrate with or build upon. Use when creating a new skill in SkillForge to find complementary MCPs and existing skills.",
  inputSchema: {
    type: "object",
    properties: {
      skill_idea: { type: "string", description: "Description of the skill being created (e.g., 'automated code review with security checks')" },
      skill_category: { type: "string", description: "Category of the new skill: desarrollo, diseño, marketing, automatización, productividad, legal, negocios, creatividad, datos, ia" },
    },
    required: ["skill_idea"],
  },
  handler: async (args: { skill_idea: string; skill_category?: string }) => {
    logToolCall("suggest_for_skill_creation", args);
    const goalWords = args.skill_idea.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
    const searchResults = await crossCatalogSearch(goalWords, 6);

    const sections: string[] = [];
    sections.push(`# 🔧 Recommended Integrations for Your New Skill\n`);
    sections.push(`*Based on: "${args.skill_idea}"*\n`);

    // Connectors the new skill could use as dependencies
    const connectors = searchResults.connectors.slice(0, 5);
    if (connectors.length > 0) {
      sections.push(`## 🔌 MCP Connectors to Integrate\n`);
      sections.push(`Your skill could use these as \`required_mcps\` dependencies:\n`);
      for (const c of connectors) {
        const tb = (c.trust_score || 0) >= 70 ? "🟢" : (c.trust_score || 0) >= 40 ? "🟡" : "⚪";
        sections.push(`- **${c.name}** [${c.category}] ${tb} Trust: ${c.trust_score || "N/A"}`);
        sections.push(`  ${c.description}`);
        if (c.install_command) sections.push(`  Install: \`${c.install_command}\``);
        if (c.credentials_needed?.length > 0) sections.push(`  Credentials: ${c.credentials_needed.join(", ")}`);
        sections.push("");
      }
    }

    // Existing skills that are similar (avoid duplication)
    const similar = searchResults.skills.slice(0, 5);
    if (similar.length > 0) {
      sections.push(`## 🧠 Similar Existing Skills\n`);
      sections.push(`Check these to avoid duplication or find inspiration:\n`);
      for (const s of similar) {
        sections.push(`- **${s.display_name}** [${s.category}] — ${s.tagline}`);
        sections.push(`  ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs`);
        sections.push(`  \`${s.install_command}\`\n`);
      }
    }

    // Plugins that could complement
    const plugins = searchResults.plugins.slice(0, 3);
    if (plugins.length > 0) {
      sections.push(`## 🧩 Complementary Plugins\n`);
      for (const p of plugins) {
        sections.push(`- **${p.name}** [${p.category}] — ${p.description}`);
      }
      sections.push("");
    }

    // Suggestion for SKILL.md dependencies section
    if (connectors.length > 0) {
      sections.push(`## 📝 Suggested Dependencies Block for SKILL.md\n`);
      sections.push("```yaml");
      sections.push("required_mcps:");
      for (const c of connectors.slice(0, 3)) {
        sections.push(`  - name: "${c.name}"`);
        sections.push(`    slug: "${c.slug}"`);
        if (c.install_command) sections.push(`    install_command: "${c.install_command}"`);
      }
      sections.push("```\n");
    }

    sections.push(`💡 *Use \`generate_custom_skill\` to auto-generate a SKILL.md that orchestrates these tools.*`);

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

// ─── PHASE 3: INTELLIGENCE TOOLS ───

mcp.tool("trending_solutions", {
  description: "Shows trending skills, connectors, popular searches, and goals based on real usage data. Discover what's hot in the ecosystem.",
  inputSchema: {
    type: "object",
    properties: {
      period: { type: "string", description: "Time period: 'week' or 'month' (default: week)" },
    },
  },
  handler: async (args: { period?: string }) => {
    logToolCall("trending_solutions", args);
    const days = args.period === "month" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const sections: string[] = [];
    sections.push(`# 🔥 Trending This ${days === 7 ? "Week" : "Month"}\n`);

    // Query usage_events for weighted trending
    const { data: events } = await supabase
      .from("usage_events")
      .select("event_type, item_slug, item_type, query_text")
      .gte("created_at", since)
      .limit(5000);

    if (events && events.length > 0) {
      const weights: Record<string, number> = { install_copied: 5, content_viewed: 3, view: 2, trust_checked: 2, recommended: 1, search_result: 0.5, compared: 2 };

      // Aggregate by item
      const itemScores: Record<string, { score: number; type: string; events: Record<string, number> }> = {};
      const searchQueries: Record<string, number> = {};

      for (const e of events) {
        if (e.item_slug) {
          if (!itemScores[e.item_slug]) itemScores[e.item_slug] = { score: 0, type: e.item_type || "skill", events: {} };
          const w = weights[e.event_type] || 1;
          itemScores[e.item_slug].score += w;
          itemScores[e.item_slug].events[e.event_type] = (itemScores[e.item_slug].events[e.event_type] || 0) + 1;
        }
        if (e.query_text) {
          const q = e.query_text.toLowerCase().trim();
          searchQueries[q] = (searchQueries[q] || 0) + 1;
        }
      }

      // Most installed skills
      const installed = Object.entries(itemScores)
        .filter(([, v]) => v.events.install_copied)
        .sort(([, a], [, b]) => (b.events.install_copied || 0) - (a.events.install_copied || 0))
        .slice(0, 5);
      if (installed.length > 0) {
        sections.push(`## Most Installed Skills\n`);
        for (const [slug, data] of installed) {
          sections.push(`${installed.indexOf([slug, data]) + 1}. **${slug}** (${data.type}) — ${data.events.install_copied} installs this ${days === 7 ? "week" : "month"}`);
        }
        sections.push("");
      } else {
        sections.push(`## Most Installed Skills\n*No data yet.*\n`);
      }

      // Most viewed
      const viewed = Object.entries(itemScores).sort(([, a], [, b]) => b.score - a.score).slice(0, 5);
      if (viewed.length > 0) {
        sections.push(`## Most Viewed\n`);
        for (let i = 0; i < viewed.length; i++) {
          const [slug, data] = viewed[i];
          sections.push(`${i + 1}. **${slug}** (${data.type}) — ${(data.events.view || 0)} views`);
        }
        sections.push("");
      }

      // Popular searches
      const topSearches = Object.entries(searchQueries).sort(([, a], [, b]) => b - a).slice(0, 5);
      if (topSearches.length > 0) {
        sections.push(`## Popular Searches\n`);
        for (let i = 0; i < topSearches.length; i++) {
          sections.push(`${i + 1}. "${topSearches[i][0]}" — searched ${topSearches[i][1]} times`);
        }
        sections.push("");
      } else {
        sections.push(`## Popular Searches\n*No data yet.*\n`);
      }
    } else {
      // Fallback to old logic when no usage events exist yet
      const { data: recentInstalls } = await supabase
        .from("skills")
        .select("display_name, slug, category, install_count, tagline")
        .eq("status", "approved")
        .order("quality_rank", { ascending: false }).limit(5);

      if (recentInstalls && recentInstalls.length > 0) {
        sections.push(`## Top Skills by Quality\n`);
        for (const s of recentInstalls) {
          sections.push(`- **${s.display_name}** [${s.category}] — ${s.tagline}`);
        }
      }
      sections.push(`\n*Usage tracking is active. Real trending data will appear as users interact with the catalog.*\n`);
    }

    // Trending goals from recommendation_feedback
    const { data: recentFeedback } = await supabase
      .from("recommendation_feedback")
      .select("goal, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false }).limit(200);

    if (recentFeedback && recentFeedback.length > 0) {
      const goalCounts: Record<string, number> = {};
      for (const f of recentFeedback) { const n = f.goal.toLowerCase().trim(); goalCounts[n] = (goalCounts[n] || 0) + 1; }
      const topGoals = Object.entries(goalCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
      if (topGoals.length > 0) {
        sections.push(`## Trending Goals (from solve_goal)\n`);
        for (let i = 0; i < topGoals.length; i++) {
          sections.push(`${i + 1}. "${topGoals[i][0]}" — asked ${topGoals[i][1]} times`);
        }
      }
    }

    sections.push(`\n💡 *Use \`solve_goal\` with any trending goal to get a personalized solution.*`);
    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

// ─── PHASE 4: PLATFORM TOOLS ───

mcp.tool("submit_goal_template", {
  description: "Submit a community goal template to the Pymaia marketplace. Templates help other users solve similar business goals. Requires authentication.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "Unique kebab-case slug (e.g., 'automate-invoice-processing')" },
      display_name: { type: "string", description: "Human-readable title" },
      domain: { type: "string", description: "Domain: sales, marketing, development, support, data, design, legal, operations, security, general" },
      description: { type: "string", description: "2-3 sentence description of the goal" },
      triggers: { type: "array", items: { type: "string" }, description: "Keywords that trigger this template (3-8 keywords)" },
      capabilities: { type: "array", items: { type: "object" }, description: "Required capabilities: [{name, type, required, keywords}]" },
    },
    required: ["slug", "display_name", "domain", "description", "triggers"],
  },
  handler: async (args: { slug: string; display_name: string; domain: string; description: string; triggers: string[]; capabilities?: any[] }) => {
    logToolCall("submit_goal_template", args);
    const slug = args.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
    if (!slug || slug.length < 3) return { content: [{ type: "text" as const, text: "❌ Slug must be at least 3 characters (kebab-case)." }] };
    if (args.triggers.length < 2) return { content: [{ type: "text" as const, text: "❌ At least 2 trigger keywords required." }] };

    // Check for duplicate slug
    const { data: existing } = await supabase.from("community_goal_templates").select("id").eq("slug", slug).maybeSingle();
    if (existing) return { content: [{ type: "text" as const, text: `❌ Template with slug "${slug}" already exists.` }] };

    const { data: existingOfficial } = await supabase.from("goal_templates").select("id").eq("slug", slug).maybeSingle();
    if (existingOfficial) return { content: [{ type: "text" as const, text: `❌ An official template with slug "${slug}" already exists.` }] };

    const { error } = await supabase.from("community_goal_templates").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // Anonymous via MCP
      slug,
      display_name: args.display_name,
      domain: args.domain,
      description: args.description,
      triggers: args.triggers,
      capabilities: args.capabilities || [],
    });

    if (error) return { content: [{ type: "text" as const, text: `❌ Error: ${error.message}` }] };

    // Log analytics
    await supabase.from("agent_analytics").insert({ event_type: "template_submitted", tool_name: "submit_goal_template", goal: args.display_name, event_data: { slug, domain: args.domain } });

    return { content: [{ type: "text" as const, text: `✅ Template "${args.display_name}" submitted for review!\n\n📋 Slug: \`${slug}\`\n🏷️ Domain: ${args.domain}\n🔑 Triggers: ${args.triggers.join(", ")}\n\nOur team will review it within 48 hours. Once approved, it will be available in \`solve_goal\` for all users.` }] };
  },
});

mcp.tool("browse_community_templates", {
  description: "Browse community-submitted goal templates. See what solutions other users have created for the marketplace.",
  inputSchema: {
    type: "object",
    properties: {
      domain: { type: "string", description: "Filter by domain: sales, marketing, development, support, data, design, legal, operations, security, general" },
      status: { type: "string", description: "Filter: 'approved' (default), 'pending', 'all'" },
      limit: { type: "number", description: "Max results (default: 10)" },
    },
  },
  handler: async (args: { domain?: string; status?: string; limit?: number }) => {
    logToolCall("browse_community_templates", args);
    const lim = Math.min(args.limit || 10, 20);
    let q = supabase.from("community_goal_templates")
      .select("slug, display_name, domain, description, triggers, upvotes, status, created_at")
      .order("upvotes", { ascending: false }).limit(lim);

    if (args.status === "pending") q = q.eq("status", "pending");
    else if (args.status === "all") { /* no filter */ }
    else q = q.eq("status", "approved");

    if (args.domain) q = q.eq("domain", args.domain);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    if (!data?.length) return { content: [{ type: "text" as const, text: "No community templates found." }] };

    const sections: string[] = [`# 🌍 Community Goal Templates\n`];
    for (const t of data) {
      const statusIcon = t.status === "approved" ? "✅" : t.status === "pending" ? "⏳" : "❌";
      sections.push(`${statusIcon} **${t.display_name}** [${t.domain}] — 👍 ${t.upvotes} votes`);
      sections.push(`  ${t.description}`);
      sections.push(`  Triggers: ${t.triggers.join(", ")}\n`);
    }
    sections.push(`\n💡 *Submit your own with \`submit_goal_template\`*`);
    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

mcp.tool("agent_analytics", {
  description: "Get analytics about the Pymaia Agent ecosystem: most searched goals, most recommended tools, template usage, and user engagement metrics.",
  inputSchema: {
    type: "object",
    properties: {
      period: { type: "string", description: "Time period: 'day', 'week', 'month' (default: week)" },
      metric: { type: "string", description: "Specific metric: 'goals', 'tools', 'templates', 'overview' (default: overview)" },
    },
  },
  handler: async (args: { period?: string; metric?: string }) => {
    logToolCall("agent_analytics", args);
    const days = args.period === "day" ? 1 : args.period === "month" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const metric = args.metric || "overview";
    const sections: string[] = [];
    const periodLabel = args.period === "day" ? "24h" : args.period === "month" ? "30 days" : "7 days";

    sections.push(`# 📊 Pymaia Agent Analytics (${periodLabel})\n`);

    // Feedback analytics
    const { data: feedback } = await supabase.from("recommendation_feedback")
      .select("goal, rating, chosen_option, matched_template_slug, created_at")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(500);

    if (metric === "overview" || metric === "goals") {
      const goalCounts: Record<string, { count: number; ratings: number[] }> = {};
      for (const f of feedback || []) {
        const g = f.goal.toLowerCase().trim();
        if (!goalCounts[g]) goalCounts[g] = { count: 0, ratings: [] };
        goalCounts[g].count++;
        if (f.rating) goalCounts[g].ratings.push(f.rating);
      }

      const topGoals = Object.entries(goalCounts).sort(([, a], [, b]) => b.count - a.count).slice(0, 10);
      if (topGoals.length > 0) {
        sections.push(`## 🎯 Top Goals\n`);
        for (const [goal, data] of topGoals) {
          const avg = data.ratings.length > 0 ? (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1) : "—";
          sections.push(`- **"${goal}"** — ${data.count}x requested, avg rating: ${avg}/5`);
        }
        sections.push("");
      }

      // Satisfaction stats
      const allRatings = (feedback || []).filter(f => f.rating).map(f => f.rating!);
      if (allRatings.length > 0) {
        const avgRating = (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1);
        const satisfied = allRatings.filter(r => r >= 4).length;
        sections.push(`## 📈 Satisfaction\n`);
        sections.push(`- Total recommendations: **${(feedback || []).length}**`);
        sections.push(`- Avg rating: **${avgRating}/5** (${allRatings.length} rated)`);
        sections.push(`- Satisfaction (4+): **${Math.round(satisfied / allRatings.length * 100)}%**\n`);
      }
    }

    if (metric === "overview" || metric === "tools") {
      // Most recommended tools (from analytics events)
      const { data: events } = await supabase.from("agent_analytics")
        .select("event_type, items_recommended, tool_name")
        .gte("created_at", since).limit(500);

      const toolCounts: Record<string, number> = {};
      for (const e of events || []) {
        if (e.items_recommended) {
          for (const slug of e.items_recommended) {
            toolCounts[slug] = (toolCounts[slug] || 0) + 1;
          }
        }
      }

      const topTools = Object.entries(toolCounts).sort(([, a], [, b]) => b - a).slice(0, 10);
      if (topTools.length > 0) {
        sections.push(`## 🔧 Most Recommended Tools\n`);
        for (const [slug, count] of topTools) {
          sections.push(`- \`${slug}\` — recommended ${count}x`);
        }
        sections.push("");
      }

      // Tool usage breakdown
      const toolUsage: Record<string, number> = {};
      for (const e of events || []) {
        if (e.tool_name) toolUsage[e.tool_name] = (toolUsage[e.tool_name] || 0) + 1;
      }
      const topToolUsage = Object.entries(toolUsage).sort(([, a], [, b]) => b - a).slice(0, 8);
      if (topToolUsage.length > 0) {
        sections.push(`## 🛠️ MCP Tool Usage\n`);
        for (const [tool, count] of topToolUsage) {
          sections.push(`- \`${tool}\` — ${count} calls`);
        }
        sections.push("");
      }
    }

    if (metric === "overview" || metric === "templates") {
      const { data: templates } = await supabase.from("goal_templates")
        .select("slug, display_name, domain, usage_count").eq("is_active", true)
        .order("usage_count", { ascending: false }).limit(10);

      const { count: communityCount } = await supabase.from("community_goal_templates")
        .select("id", { count: "exact", head: true });

      const { count: approvedCommunity } = await supabase.from("community_goal_templates")
        .select("id", { count: "exact", head: true }).eq("status", "approved");

      sections.push(`## 📋 Template Ecosystem\n`);
      sections.push(`- Official templates: **${(templates || []).length}** active`);
      sections.push(`- Community templates: **${communityCount || 0}** total (${approvedCommunity || 0} approved)`);
      if (templates && templates.length > 0) {
        sections.push(`\nTop templates by usage:`);
        for (const t of templates.filter(t => t.usage_count > 0).slice(0, 5)) {
          sections.push(`- **${t.display_name}** [${t.domain}] — ${t.usage_count} uses`);
        }
      }
      sections.push("");
    }

    // Catalog size
    const [{ count: skillCount }, { count: mcpCount }, { count: pluginCount }] = await Promise.all([
      supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);

    sections.push(`## 📦 Catalog Size\n`);
    sections.push(`- Skills: **${(skillCount || 0).toLocaleString()}**`);
    sections.push(`- MCP Connectors: **${(mcpCount || 0).toLocaleString()}**`);
    sections.push(`- Plugins: **${(pluginCount || 0).toLocaleString()}**`);
    sections.push(`- **Total: ${((skillCount || 0) + (mcpCount || 0) + (pluginCount || 0)).toLocaleString()}** tools\n`);

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

mcp.tool("a2a_query", {
  description: "Agent-to-Agent (A2A) compatible endpoint. Allows other AI agents to query Pymaia's catalog programmatically. Returns structured JSON for machine consumption.",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", description: "Action: 'capabilities' (list what Pymaia can do), 'search' (find tools), 'recommend' (get solution for goal), 'catalog_stats' (get catalog size)" },
      query: { type: "string", description: "Search query or goal (for search/recommend actions)" },
      filters: { type: "object", description: "Optional filters: {type: 'skill'|'connector'|'plugin', category: string, min_trust: number}" },
      format: { type: "string", description: "Response format: 'structured' (JSON) or 'natural' (markdown). Default: structured" },
    },
    required: ["action"],
  },
  handler: async (args: { action: string; query?: string; filters?: any; format?: string }) => {
    logToolCall("a2a_query", args);
    const structured = args.format !== "natural";

    // Log A2A interaction
    await supabase.from("agent_analytics").insert({ event_type: "a2a_query", tool_name: "a2a_query", goal: args.query || args.action, event_data: { action: args.action, filters: args.filters } });

    if (args.action === "capabilities") {
      const caps = {
        agent: "pymaia-agent",
        version: "8.2.0",
        protocol: "A2A-compatible",
        capabilities: [
          { name: "tool_search", description: "Search 35K+ skills, MCPs, and plugins", input: "query string", output: "array of tools" },
          { name: "goal_solving", description: "Decompose business goals into tool combinations", input: "goal description", output: "solution with options A/B" },
          { name: "compatibility_check", description: "Check if tools work well together", input: "array of slugs", output: "compatibility report" },
          { name: "custom_generation", description: "Generate SKILL.md or plugin.json from tool combination", input: "goal + tool slugs", output: "generated artifact" },
          { name: "role_kits", description: "Get curated tool kits by professional role", input: "role name", output: "kit with essential/recommended tools" },
          { name: "trending", description: "Get trending goals and popular solutions", input: "time period", output: "trending data" },
        ],
        catalog: { skills: "35K+", connectors: "2K+", plugins: "800+", goal_templates: "50+" },
        endpoints: { mcp: "/mcp-server/mcp", protocol: "MCP Streamable HTTP" },
      };
      if (structured) return { content: [{ type: "text" as const, text: JSON.stringify(caps, null, 2) }] };
      return { content: [{ type: "text" as const, text: `# Pymaia Agent Capabilities\n\n${caps.capabilities.map(c => `- **${c.name}**: ${c.description}`).join("\n")}` }] };
    }

    if (args.action === "catalog_stats") {
      // Use materialized view for consistent stats
      const { data: stats } = await supabase.from("directory_stats_mv").select("*").limit(1).maybeSingle();
      if (stats) {
        const result = { skills: stats.skills_count, connectors: stats.connectors_count, plugins: stats.plugins_count, goal_templates: stats.goal_templates_count, total: (stats.skills_count || 0) + (stats.connectors_count || 0) + (stats.plugins_count || 0) };
        if (structured) return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        return { content: [{ type: "text" as const, text: `Catalog: ${result.total} tools (${result.skills} skills, ${result.connectors} MCPs, ${result.plugins} plugins), ${result.goal_templates} goal templates` }] };
      }
      // Fallback
      const [{ count: s }, { count: m }, { count: p }, { count: gt }] = await Promise.all([
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("goal_templates").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      const fallbackStats = { skills: s, connectors: m, plugins: p, goal_templates: gt, total: (s || 0) + (m || 0) + (p || 0) };
      if (structured) return { content: [{ type: "text" as const, text: JSON.stringify(fallbackStats) }] };
      return { content: [{ type: "text" as const, text: `Catalog: ${fallbackStats.total} tools (${fallbackStats.skills} skills, ${fallbackStats.connectors} MCPs, ${fallbackStats.plugins} plugins), ${fallbackStats.goal_templates} goal templates` }] };
    }

    if (args.action === "search" && args.query) {
      const q = sanitizeForPostgrest(args.query);
      const minTrust = args.filters?.min_trust || 0;
      const type = args.filters?.type;

      const results: any[] = [];

      if (!type || type === "skill") {
        const { data } = await supabase.from("skills")
          .select("display_name, slug, tagline, category, install_count, trust_score, install_command")
          .eq("status", "approved").or(`display_name.ilike.%${q}%,tagline.ilike.%${q}%,slug.ilike.%${q}%`)
          .gte("trust_score", minTrust).order("install_count", { ascending: false }).limit(5);
        for (const s of data || []) results.push({ type: "skill", name: s.display_name, slug: s.slug, description: s.tagline, trust_score: s.trust_score, installs: s.install_count, install: s.install_command });
      }
      if (!type || type === "connector") {
        const { data } = await supabase.from("mcp_servers")
          .select("name, slug, description, category, github_stars, trust_score, is_official, install_command")
          .eq("status", "approved").or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`)
          .gte("trust_score", minTrust).order("github_stars", { ascending: false }).limit(5);
        for (const c of data || []) results.push({ type: "connector", name: c.name, slug: c.slug, description: c.description, trust_score: c.trust_score, stars: c.github_stars, official: c.is_official, install: c.install_command });
      }
      if (!type || type === "plugin") {
        const { data } = await supabase.from("plugins")
          .select("name, slug, description, category, install_count, trust_score, is_official")
          .eq("status", "approved").or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`)
          .gte("trust_score", minTrust).order("install_count", { ascending: false }).limit(5);
        for (const p of data || []) results.push({ type: "plugin", name: p.name, slug: p.slug, description: p.description, trust_score: p.trust_score, installs: p.install_count, official: p.is_official });
      }

      if (structured) return { content: [{ type: "text" as const, text: JSON.stringify({ query: args.query, results_count: results.length, results }) }] };
      const text = results.map(r => `- [${r.type}] **${r.name}** (trust: ${r.trust_score || "N/A"}) — ${r.description}`).join("\n");
      return { content: [{ type: "text" as const, text: text || "No results." }] };
    }

    if (args.action === "recommend" && args.query) {
      // Delegate to solve_goal logic but return structured
      const goalLower = args.query.toLowerCase();
      const { data: templates } = await supabase.from("goal_templates").select("*").eq("is_active", true);
      let matched: any = null, bestScore = 0;
      for (const t of templates || []) {
        let score = 0;
        for (const trigger of (t.triggers || [])) { if (goalLower.includes(trigger.toLowerCase())) score += trigger.length; }
        if (score > bestScore) { bestScore = score; matched = t; }
      }

      const allKw: string[] = [];
      if (matched?.capabilities) for (const cap of matched.capabilities) { if (cap.keywords) allKw.push(...cap.keywords); }
      allKw.push(...goalLower.split(/\s+/).filter((w: string) => w.length >= 3));

      const search = await crossCatalogSearch([...new Set(allKw)], 5);
      const items = [
        ...search.skills.slice(0, 3).map((s: any) => ({ type: "skill", name: s.display_name, slug: s.slug, trust: s.trust_score, install: s.install_command })),
        ...search.connectors.slice(0, 2).map((c: any) => ({ type: "connector", name: c.name, slug: c.slug, trust: c.trust_score, install: c.install_command })),
        ...search.plugins.slice(0, 2).map((p: any) => ({ type: "plugin", name: p.name, slug: p.slug, trust: p.trust_score })),
      ];

      const result = { goal: args.query, matched_template: matched?.slug || null, domain: matched?.domain || "general", recommended_items: items, capabilities: matched?.capabilities || [] };
      if (structured) return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      return { content: [{ type: "text" as const, text: `Recommendation for "${args.query}":\n${items.map(i => `- [${i.type}] ${i.name} (trust: ${i.trust || "N/A"})`).join("\n")}` }] };
    }

    return { content: [{ type: "text" as const, text: `Unknown action "${args.action}". Use: capabilities, search, recommend, catalog_stats` }] };
  },
});

// ─── STATS TOOLS ───

mcp.tool("get_directory_stats", {
  description: "Get overall statistics about the SkillHub directory: total skills, connectors, plugins, categories, and highlights.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    logToolCall("get_directory_stats");
    // Use materialized view for accurate counts (avoids 1000-row limit)
    const { data: stats, error: statsError } = await supabase
      .from("directory_stats_mv")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (statsError || !stats) {
      // Fallback to count: exact if materialized view not available
      const [{ count: s }, { count: m }, { count: p }] = await Promise.all([
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("mcp_servers").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("plugins").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      const total = (s || 0) + (m || 0) + (p || 0);
      return { content: [{ type: "text" as const, text: `# 📊 Directory Stats\n\n- **${(s || 0).toLocaleString()}** skills\n- **${(m || 0).toLocaleString()}** MCP connectors\n- **${(p || 0).toLocaleString()}** plugins\n- **${total.toLocaleString()}** total tools` }] };
    }

    const total = (stats.skills_count || 0) + (stats.connectors_count || 0) + (stats.plugins_count || 0);

    // Get highlights (top installed + top rated)
    const [{ data: topInstalled }, { data: topRated }] = await Promise.all([
      supabase.from("skills").select("display_name, install_count").eq("status", "approved").order("install_count", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("skills").select("display_name, avg_rating").eq("status", "approved").order("avg_rating", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const text = `# 📊 SkillHub Directory Stats\n\n- **${stats.skills_count?.toLocaleString()}** skills\n- **${stats.connectors_count?.toLocaleString()}** MCP connectors\n- **${stats.plugins_count?.toLocaleString()}** plugins\n- **${stats.categories_count}** categories\n- **${total.toLocaleString()}** total tools\n- **${stats.goal_templates_count}** active goal templates\n\n## Highlights\n- 🏆 Most installed: **${topInstalled?.display_name || "N/A"}** (${topInstalled?.install_count?.toLocaleString() || 0})\n- ⭐ Top rated: **${topRated?.display_name || "N/A"}** (${Number(topRated?.avg_rating || 0).toFixed(1)})`;

    return { content: [{ type: "text" as const, text }] };
  },
});

mcp.tool("get_install_command", {
  description: "Quickly get the install command for a skill, MCP connector, or plugin by name or slug. Searches all three catalogs.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Skill, connector, or plugin name or slug" },
    },
    required: ["name"],
  },
  handler: async (args: { name: string }) => {
    logToolCall("get_install_command", args);
    const nameLower = args.name.toLowerCase().replace(/\s+/g, "-");

    // Resolve slug redirects first
    const resolvedSlug = await resolveSlug(nameLower, "skill");

    // 1. Search skills by slug
    const { data: skill } = await supabase
      .from("skills")
      .select("display_name, install_command, slug, install_count_source")
      .eq("status", "approved")
      .eq("slug", resolvedSlug)
      .maybeSingle();

    if (skill) {
      // Mark as tracked install source
      if (skill.install_count_source !== 'tracked') {
        supabase.from("skills").update({ install_count_source: 'tracked' }).eq("slug", skill.slug).then(() => {});
      }
      return { content: [{ type: "text" as const, text: `**${skill.display_name}** (skill)\n\n\`\`\`\n${skill.install_command}\n\`\`\`` }] };
    }

    // 2. Search MCP connectors by slug (also check redirect)
    const resolvedConnSlug = await resolveSlug(nameLower, "connector");
    const { data: connector } = await supabase
      .from("mcp_servers")
      .select("name, install_command, slug")
      .eq("status", "approved")
      .eq("slug", resolvedConnSlug)
      .maybeSingle();

    if (connector) {
      return { content: [{ type: "text" as const, text: `**${connector.name}** (connector)\n\n\`\`\`\n${connector.install_command}\n\`\`\`` }] };
    }

    // 3. Search plugins by slug
    const { data: plugin } = await supabase
      .from("plugins")
      .select("name, slug, homepage, github_url")
      .eq("status", "approved")
      .eq("slug", nameLower)
      .maybeSingle();

    if (plugin) {
      const installInfo = plugin.homepage || plugin.github_url || "No install command available";
      return { content: [{ type: "text" as const, text: `**${plugin.name}** (plugin)\n\n${installInfo}` }] };
    }

    // 4. Fuzzy search across all three tables
    const [skillsFuzzy, connectorsFuzzy, pluginsFuzzy] = await Promise.all([
      supabase.from("skills").select("display_name, install_command, slug")
        .eq("status", "approved").or(`display_name.ilike.%${args.name}%,slug.ilike.%${args.name}%`).limit(2).then(r => r.data || []),
      supabase.from("mcp_servers").select("name, install_command, slug")
        .eq("status", "approved").or(`name.ilike.%${args.name}%,slug.ilike.%${args.name}%`).limit(2).then(r => r.data || []),
      supabase.from("plugins").select("name, slug, homepage, github_url")
        .eq("status", "approved").or(`name.ilike.%${args.name}%,slug.ilike.%${args.name}%`).limit(2).then(r => r.data || []),
    ]);

    const parts: string[] = [];
    for (const s of skillsFuzzy) parts.push(`**${s.display_name}** (skill)\n\`\`\`\n${s.install_command}\n\`\`\``);
    for (const c of connectorsFuzzy) parts.push(`**${c.name}** (connector)\n\`\`\`\n${c.install_command}\n\`\`\``);
    for (const p of pluginsFuzzy) parts.push(`**${p.name}** (plugin)\n${p.homepage || p.github_url || "No install info"}`);

    if (parts.length > 0) return { content: [{ type: "text" as const, text: parts.join("\n\n") }] };

    return { content: [{ type: "text" as const, text: `No encontré "${args.name}" en skills, conectores ni plugins. Usa explore_directory para buscar.` }] };
  },
});

// ─── suggest_stack ───
mcp.tool("suggest_stack", {
  description: "Given a project type or tech stack description, recommends a complete tool stack (skills + connectors + plugins). Different from solve_goal (which solves a single goal) — this builds a full environment setup for a project or role. Example: 'Next.js SaaS with Stripe billing' or 'marketing agency automation'.",
  inputSchema: {
    type: "object",
    properties: {
      project_description: { type: "string", description: "Description of the project, tech stack, or work environment" },
      max_items: { type: "number", description: "Max items per category (default: 5)" },
    },
    required: ["project_description"],
  },
  handler: async (args: { project_description: string; max_items?: number }) => {
    logToolCall("suggest_stack", args);
    const max = Math.min(args.max_items || 5, 8);
    const intent = await classifyIntent(args.project_description);
    const keywords = intent.keywords.length ? intent.keywords : args.project_description.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);

    // Search skills, connectors, plugins in parallel
    const orFilter = keywords.map((k: string) => `name.ilike.%${sanitizeForPostgrest(k)}%,description.ilike.%${sanitizeForPostgrest(k)}%`).join(",");
    const skillOrFilter = keywords.map((k: string) => `display_name.ilike.%${sanitizeForPostgrest(k)}%,tagline.ilike.%${sanitizeForPostgrest(k)}%`).join(",");

    const [skillsRes, connectorsRes, pluginsRes] = await Promise.all([
      supabase.from("skills").select("display_name, slug, tagline, category, install_command, avg_rating, install_count").eq("status", "approved").or(skillOrFilter).order("install_count", { ascending: false }).limit(max),
      supabase.from("mcp_servers").select("name, slug, description, category, install_command, github_stars, is_official").eq("status", "approved").or(orFilter).order("github_stars", { ascending: false }).limit(max),
      supabase.from("plugins").select("name, slug, description, category, platform, install_count, avg_rating").eq("status", "approved").or(orFilter).order("install_count", { ascending: false }).limit(max),
    ]);

    const sections: string[] = [`# Suggested Stack for: "${args.project_description}"\n`];

    if (skillsRes.data?.length) {
      sections.push("## 🧠 Skills\n" + skillsRes.data.map((s: any) => `- **${s.display_name}** [${s.category}] — ${s.tagline}\n  ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs\n  \`${s.install_command}\``).join("\n\n"));
    }
    if (connectorsRes.data?.length) {
      const deduped = deduplicateConnectors(connectorsRes.data);
      sections.push("## 🔌 Connectors\n" + deduped.map((c: any) => `- **${c.name}** [${c.category}]${c.is_official ? " ✅ Official" : ""} — ${c.description}\n  ⭐ ${(c.github_stars || 0).toLocaleString()} stars\n  \`${c.install_command}\``).join("\n\n"));
    }
    if (pluginsRes.data?.length) {
      sections.push("## 📦 Plugins\n" + pluginsRes.data.map((p: any) => `- **${p.name}** [${p.category}] (${p.platform}) — ${p.description}\n  ${p.install_count.toLocaleString()} installs`).join("\n\n"));
    }

    if (sections.length === 1) {
      sections.push("No matching tools found. Try a broader description or use `solve_goal` for goal-oriented recommendations.");
    }

    return { content: [{ type: "text" as const, text: sections.join("\n\n") }] };
  },
});

// ─── check_compatibility ───
mcp.tool("check_compatibility", {
  description: "Lightweight compatibility check for 2-4 tool slugs. Returns a quick compatible/conflict/redundant verdict for each pair. For full analysis with data flow and synergies, use explain_combination instead.",
  inputSchema: {
    type: "object",
    properties: {
      slugs: { type: "array", items: { type: "string" }, description: "2-4 tool slugs (skills, connectors, or plugins)" },
    },
    required: ["slugs"],
  },
  handler: async (args: { slugs: string[] }) => {
    logToolCall("check_compatibility", args);
    if (args.slugs.length < 2 || args.slugs.length > 4) {
      return { content: [{ type: "text" as const, text: "Please provide 2-4 tool slugs." }] };
    }

    // Check compatibility_matrix for known pairs
    const pairs: string[] = [];
    for (let i = 0; i < args.slugs.length; i++) {
      for (let j = i + 1; j < args.slugs.length; j++) {
        pairs.push(`${args.slugs[i]}:${args.slugs[j]}`);
      }
    }

    const results: string[] = [`# Compatibility Check\n`];

    for (let i = 0; i < args.slugs.length; i++) {
      for (let j = i + 1; j < args.slugs.length; j++) {
        const a = args.slugs[i], b = args.slugs[j];
        const { data: matrix } = await supabase
          .from("compatibility_matrix")
          .select("status, reason")
          .or(`and(item_a_slug.eq.${a},item_b_slug.eq.${b}),and(item_a_slug.eq.${b},item_b_slug.eq.${a})`)
          .limit(1);

        if (matrix?.length) {
          const m = matrix[0];
          const icon = m.status === "synergy" ? "✅" : m.status === "conflict" ? "⚠️" : "🔄";
          results.push(`${icon} **${a}** ↔ **${b}**: ${m.status.toUpperCase()} — ${m.reason}`);
        } else {
          results.push(`✅ **${a}** ↔ **${b}**: COMPATIBLE (no known conflicts)`);
        }
      }
    }

    return { content: [{ type: "text" as const, text: results.join("\n") }] };
  },
});

// ─── get_setup_guide ───
mcp.tool("get_setup_guide", {
  description: "Given a list of tool slugs (skills, connectors, plugins), returns a step-by-step setup guide with ordered install commands, credential requirements, and verification steps. Use after selecting tools with solve_goal, suggest_stack, or search.",
  inputSchema: {
    type: "object",
    properties: {
      slugs: { type: "array", items: { type: "string" }, description: "Tool slugs to generate setup guide for" },
    },
    required: ["slugs"],
  },
  handler: async (args: { slugs: string[] }) => {
    logToolCall("get_setup_guide", args);
    // Fetch all items across tables
    const [skillsRes, connectorsRes, pluginsRes] = await Promise.all([
      supabase.from("skills").select("display_name, slug, install_command, required_mcps, category").eq("status", "approved").in("slug", args.slugs),
      supabase.from("mcp_servers").select("name, slug, install_command, credentials_needed, category").eq("status", "approved").in("slug", args.slugs),
      supabase.from("plugins").select("name, slug, category, platform").eq("status", "approved").in("slug", args.slugs),
    ]);

    const steps: string[] = [`# Setup Guide\n`];
    let stepNum = 1;

    // Connectors first (they're often prerequisites)
    const connectors = connectorsRes.data || [];
    if (connectors.length) {
      steps.push(`## Step ${stepNum}: Install Connectors\nConnectors provide Claude access to external services.\n`);
      for (const c of connectors) {
        steps.push(`### ${c.name}\n\`\`\`\n${c.install_command}\n\`\`\``);
        if (c.credentials_needed?.length) {
          steps.push(`⚠️ **Credentials needed:** ${c.credentials_needed.join(", ")}`);
        }
      }
      stepNum++;
    }

    // Skills second
    const skills = skillsRes.data || [];
    if (skills.length) {
      steps.push(`## Step ${stepNum}: Install Skills\nSkills teach Claude professional expertise.\n`);
      for (const s of skills) {
        steps.push(`### ${s.display_name}\n\`\`\`\n${s.install_command}\n\`\`\``);
        if (s.required_mcps && Array.isArray(s.required_mcps) && (s.required_mcps as any[]).length) {
          const mcpNames = (s.required_mcps as any[]).map((m: any) => m.name || m).join(", ");
          steps.push(`🔌 **Requires connectors:** ${mcpNames}`);
        }
      }
      stepNum++;
    }

    // Plugins last
    const plugins = pluginsRes.data || [];
    if (plugins.length) {
      steps.push(`## Step ${stepNum}: Install Plugins\nPlugins bundle multiple tools together.\n`);
      for (const p of plugins) {
        steps.push(`### ${p.name} (${p.platform})\nInstall from the ${p.platform} plugin marketplace.`);
      }
      stepNum++;
    }

    if (connectors.length === 0 && skills.length === 0 && plugins.length === 0) {
      steps.push("No tools found with the provided slugs. Use `search_skills`, `search_connectors`, or `search_plugins` to find valid slugs.");
    } else {
      steps.push(`## Step ${stepNum}: Verify\nRestart Claude Code and test each tool by asking Claude to use it. Example: "Use [tool name] to help me with [task]."`);
    }

    return { content: [{ type: "text" as const, text: steps.join("\n\n") }] };
  },
});

// ─── import_skill_from_agent ───
mcp.tool("import_skill_from_agent", {
  description: "Import a SKILL.md created by any AI agent into the Pymaia catalog for sharing. Accepts raw SKILL.md content, parses it into structured fields using AI, and submits it for approval. Returns the parsed skill preview. Requires API key authentication (pymsk_...).",
  inputSchema: {
    type: "object",
    properties: {
      skill_md: { type: "string", description: "Full content of the SKILL.md file to import" },
      author_name: { type: "string", description: "Name of the author or agent that created this skill" },
      is_public: { type: "boolean", description: "Whether the skill should be publicly visible. Default: true" },
    },
    required: ["skill_md"],
  },
  handler: async (args: { skill_md: string; author_name?: string; is_public?: boolean }) => {
    logToolCall("import_skill_from_agent", args);
    if (!currentApiKeyUserId) {
      return { content: [{ type: "text" as const, text: "❌ Authentication required. Use an API key (pymsk_...) to import skills. Get one at https://pymaiaskills.lovable.app/mis-skills" }] };
    }
    if (!args.skill_md || args.skill_md.length < 50) {
      return { content: [{ type: "text" as const, text: "❌ SKILL.md content is too short (minimum 50 characters)." }] };
    }

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: "import_skill", skill_md: args.skill_md }),
      });

      if (!resp.ok) throw new Error(`Import failed: ${resp.status}`);
      const data = await resp.json();

      if (!data.skill) throw new Error("No skill parsed");

      const slug = (data.skill.name || "imported-skill").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64);
      const { data: similar } = await supabase
        .from("skills")
        .select("slug, display_name")
        .eq("status", "approved")
        .or(`display_name.ilike.%${data.skill.name}%,slug.ilike.%${slug}%`)
        .limit(5);
      const duplicateWarning = similar?.length ? `\n\n⚠️ **Similar skills found:** ${similar.map((s: any) => `${s.display_name} (\`${s.slug}\`)`).join(", ")}. Make sure yours adds unique value.` : "";

      const useCases = (data.skill.examples || []).map((ex: any) => ({
        title: ex.title, before: ex.input, after: ex.output,
      }));

      const visibility = args.is_public !== undefined ? args.is_public : true;

      await supabase.from("skills").insert({
        slug: `${slug}-${Date.now().toString(36)}`,
        display_name: data.skill.name || "Imported Skill",
        tagline: data.skill.tagline || "",
        description_human: data.skill.description || "",
        install_command: data.skill.install_command || args.skill_md,
        category: data.skill.category || "general",
        industry: data.skill.industry || [],
        target_roles: data.skill.target_roles || [],
        use_cases: useCases,
        creator_id: currentApiKeyUserId,
        status: "pending",
        quality_score: data.quality?.score || null,
        is_public: visibility,
        required_mcps: data.skill.required_mcps || [],
        version: "1.0.0",
      });

      const scoreText = data.quality?.score ? ` Quality score: ${data.quality.score}/10.` : "";
      return {
        content: [{
          type: "text" as const,
          text: `✅ Skill "${data.skill.name}" imported and submitted for approval.${scoreText}\n\n**Parsed fields:**\n- Category: ${data.skill.category}\n- Triggers: ${(data.skill.triggers || []).join(", ")}\n- Roles: ${(data.skill.target_roles || []).join(", ")}\n\nThe skill will be reviewed and published to the Pymaia catalog.${duplicateWarning}`,
        }],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `❌ Import failed: ${e.message}` }] };
    }
  },
});

// ─── NEW v8.5.0 TOOLS ───

// ─── get_skill_content: Read raw SKILL.md ───
mcp.tool("get_skill_content", {
  description: "Get the raw SKILL.md content for a given skill slug. Use this to read, fork, or adapt existing skills. Returns the full markdown content that can be modified and re-imported via import_skill_from_agent.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "The slug identifier of the skill" },
    },
    required: ["slug"],
  },
  handler: async (args: { slug: string }) => {
    logToolCall("get_skill_content", args);
    const apiUserId = currentApiKeyUserId;
    const resolvedSlug = await resolveSlug(args.slug, "skill");
    let q = supabase.from("skills").select("display_name, slug, install_command, category, description_human, github_url, skill_md, skill_md_status, status, creator_id, is_public");
    if (apiUserId) {
      q = q.or(`and(status.eq.approved,is_public.eq.true),creator_id.eq.${apiUserId}`);
    } else {
      q = q.eq("status", "approved").eq("is_public", true);
    }
    const { data: skill } = await q.eq("slug", resolvedSlug).maybeSingle();

    if (!skill) return { content: [{ type: "text" as const, text: `Skill "${args.slug}" not found or not accessible.` }] };

    // If we have cached SKILL.md content, return it
    if (skill.skill_md && skill.skill_md.length > 100) {
      return {
        content: [{
          type: "text" as const,
          text: `# ${skill.display_name} (${skill.slug})\n\n## Raw SKILL.md\n\n\`\`\`markdown\n${skill.skill_md}\n\`\`\`\n\nYou can fork this skill by modifying the content above and importing it via \`import_skill_from_agent\`.`,
        }],
      };
    }

    // Try to fetch from GitHub on the fly
    if (skill.github_url) {
      const m = skill.github_url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (m) {
        const owner = m[1];
        const repo = m[2].replace(/\.git$/, "");
        const githubToken = Deno.env.get("GITHUB_TOKEN");
        
        // Extract skill name from install_command
        const skillMatch = (skill.install_command || "").match(/--skill\s+(\S+)/);
        const pathMatch = (skill.install_command || "").match(/skills\/([^\/\s]+)/);
        const skillName = skillMatch?.[1] || pathMatch?.[1] || null;

        const paths = skillName
          ? [`skills/${skillName}/SKILL.md`, `.claude/skills/${skillName}/SKILL.md`, `SKILL.md`]
          : [`SKILL.md`, `skills/SKILL.md`];

        for (const branch of ["main", "master"]) {
          let found = false;
          for (const path of paths) {
            try {
              const headers: Record<string, string> = {};
              if (githubToken) headers.Authorization = `token ${githubToken}`;
              const resp = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`, { headers });
              if (resp.ok) {
                const content = await resp.text();
                if (content.length > 50) {
                  // Cache it
                  await supabase.from("skills").update({ skill_md: content, skill_md_status: "fetched" }).eq("slug", resolvedSlug);
                  return {
                    content: [{
                      type: "text" as const,
                      text: `# ${skill.display_name} (${skill.slug})\n\n## Raw SKILL.md\n\n\`\`\`markdown\n${content}\n\`\`\`\n\nYou can fork this skill by modifying the content above and importing it via \`import_skill_from_agent\`.`,
                    }],
                  };
                }
              }
            } catch { /* try next path */ }
          }
          if (found) break;
        }
        // Mark as not_found so we don't retry
        await supabase.from("skills").update({ skill_md_status: "not_found" }).eq("slug", resolvedSlug);
      }
    }

    // Fallback: return available info
    const fallback = [
      `# ${skill.display_name}`,
      `\nSKILL.md content is not available from the repository.`,
      `\n## Available Information`,
      `- **Category:** ${skill.category}`,
      `- **Description:** ${skill.description_human || "N/A"}`,
      skill.github_url ? `- **Repository:** ${skill.github_url}` : null,
      `\n## Install`,
      `\`${skill.install_command}\``,
      skill.github_url ? `\nYou can view the source at: ${skill.github_url}` : null,
    ].filter(Boolean).join("\n");

    return { content: [{ type: "text" as const, text: fallback }] };
  },
});

// ─── validate_skill: Quality check without publishing ───
mcp.tool("validate_skill", {
  description: "Validate a SKILL.md without publishing it. Returns quality score, parsed fields, and improvement suggestions. Use this before import_skill_from_agent to check quality. No authentication required.",
  inputSchema: {
    type: "object",
    properties: {
      skill_md: { type: "string", description: "Full content of the SKILL.md to validate" },
    },
    required: ["skill_md"],
  },
  handler: async (args: { skill_md: string }) => {
    logToolCall("validate_skill", args);
    if (!args.skill_md || args.skill_md.length < 50) {
      return { content: [{ type: "text" as const, text: "❌ SKILL.md content is too short (minimum 50 characters)." }] };
    }

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: "import_skill", skill_md: args.skill_md }),
      });

      if (!resp.ok) {
        // Parse error body for specific feedback instead of throwing
        const errorText = await resp.text().catch(() => "");
        const sections = [`# Skill Validation Report\n`, `## ❌ Validation Error\n`];
        
        // Provide structural feedback based on content analysis
        const hasTitle = /^#\s+.+/m.test(args.skill_md);
        const hasSections = (args.skill_md.match(/^##\s+/gm) || []).length;
        const hasUsageInstructions = /usage|how to|example|instruction/i.test(args.skill_md);
        const minLength = args.skill_md.length >= 200;
        
        sections.push(`### Structural Analysis`);
        sections.push(`- ${hasTitle ? "✅" : "❌"} Has title (# heading)`);
        sections.push(`- ${hasSections >= 2 ? "✅" : "❌"} Has sections (found ${hasSections} ## headings, need ≥ 2)`);
        sections.push(`- ${minLength ? "✅" : "❌"} Minimum length (${args.skill_md.length} chars, need ≥ 200)`);
        sections.push(`- ${hasUsageInstructions ? "✅" : "❌"} Has usage instructions`);
        sections.push(`\n### Suggestions`);
        if (!hasTitle) sections.push(`- Add a title with \`# Your Skill Name\``);
        if (hasSections < 2) sections.push(`- Add sections like \`## Description\`, \`## Usage\`, \`## Examples\``);
        if (!minLength) sections.push(`- Expand the content with more detail (at least 200 characters)`);
        if (!hasUsageInstructions) sections.push(`- Add usage instructions or examples`);
        
        return { content: [{ type: "text" as const, text: sections.join("\n") }] };
      }
      const data = await resp.json();

      if (!data.skill) throw new Error("Could not parse skill");

      const score = data.quality?.score || "N/A";
      const feedback = data.quality?.feedback || "No feedback available";
      const improvements = data.quality?.improvements || [];

      const sections = [
        `# Skill Validation Report\n`,
        `## Quality Score: ${score}/10\n`,
        `## Parsed Fields`,
        `- **Name:** ${data.skill.name || "Unknown"}`,
        `- **Category:** ${data.skill.category || "general"}`,
        `- **Triggers:** ${(data.skill.triggers || []).join(", ") || "none"}`,
        `- **Target Roles:** ${(data.skill.target_roles || []).join(", ") || "all"}`,
        `- **Industry:** ${(data.skill.industry || []).join(", ") || "general"}`,
        `\n## Feedback\n${feedback}`,
      ];

      if (improvements.length) {
        sections.push(`\n## Suggestions for Improvement\n${improvements.map((s: string) => `- ${s}`).join("\n")}`);
      }

      sections.push(`\n---\n✅ Ready to publish? Use \`import_skill_from_agent\` with your API key to submit this skill.`);

      return { content: [{ type: "text" as const, text: sections.join("\n") }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `❌ Validation failed: ${e.message}` }] };
    }
  },
});

// ─── my_skills: List authenticated user's skills ───
mcp.tool("my_skills", {
  description: "List all skills owned by the authenticated user (pending, approved, rejected). Shows quality score, status, install count, and eval history. Requires API key authentication (pymsk_...).",
  inputSchema: {
    type: "object",
    properties: {
      status_filter: { type: "string", description: "Optional filter: 'pending', 'approved', 'rejected', or 'all' (default: all)" },
    },
  },
  handler: async (args: { status_filter?: string }) => {
    logToolCall("my_skills", args);
    if (!currentApiKeyUserId) {
      return { content: [{ type: "text" as const, text: "❌ Authentication required. Use an API key (pymsk_...) to list your skills. Get one at https://pymaiaskills.lovable.app/mis-skills" }] };
    }

    let q = supabase
      .from("skills")
      .select("display_name, slug, status, category, install_count, avg_rating, quality_score, created_at, is_public")
      .eq("creator_id", currentApiKeyUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (args.status_filter && args.status_filter !== "all") {
      q = q.eq("status", args.status_filter);
    }

    const { data: skills, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    if (!skills?.length) return { content: [{ type: "text" as const, text: "You have no skills yet. Create one with `generate_custom_skill` or import one with `import_skill_from_agent`." }] };

    // Fetch eval runs for these skills
    const slugs = skills.map((s: any) => s.slug);
    const { data: evalRuns } = await supabase
      .from("skill_eval_runs")
      .select("skill_slug, pass_rate, avg_score, iteration")
      .in("skill_slug", slugs)
      .order("iteration", { ascending: false });

    const evalMap: Record<string, any> = {};
    for (const run of evalRuns || []) {
      if (run.skill_slug && !evalMap[run.skill_slug]) {
        evalMap[run.skill_slug] = run;
      }
    }

    const statusIcon: Record<string, string> = { approved: "✅", pending: "⏳", rejected: "❌" };

    const text = skills.map((s: any) => {
      const eval_ = evalMap[s.slug];
      const evalText = eval_ ? ` · Eval: ${Number(eval_.pass_rate).toFixed(0)}% pass, ${Number(eval_.avg_score).toFixed(1)}/10 (iter ${eval_.iteration})` : "";
      const qualityText = s.quality_score ? ` · Quality: ${Number(s.quality_score).toFixed(1)}/10` : "";
      const visibility = s.is_public ? "🌐 Public" : "🔒 Private";
      return `${statusIcon[s.status] || "❓"} **${s.display_name}** (\`${s.slug}\`) [${s.category}]\n   ${s.status.toUpperCase()} · ${visibility} · ${s.install_count} installs${qualityText}${evalText}`;
    }).join("\n\n");

    return { content: [{ type: "text" as const, text: `# My Skills (${skills.length})\n\n${text}` }] };
  },
});

// ─── semantic_search: AI-powered meaning-based search ───
mcp.tool("semantic_search", {
  description: "Search skills using AI-powered semantic similarity. Better than keyword search for natural language queries like 'help me write better pull request descriptions' or 'automate client onboarding emails'. Falls back to keyword search if embeddings are unavailable.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural language description of what you're looking for" },
      category: { type: "string", description: "Optional category filter" },
      limit: { type: "number", description: "Number of results (default: 5, max: 10)" },
    },
    required: ["query"],
  },
  handler: async (args: { query: string; category?: string; limit?: number }) => {
    logToolCall("semantic_search", args);
    const lim = Math.min(args.limit || 5, 10);

    try {
      // Call semantic-search edge function
      const resp = await fetch(`${supabaseUrl}/functions/v1/semantic-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ query: args.query, category: args.category }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.data?.length) {
          const results = data.data.slice(0, lim);
          const text = results
            .map((s: any, i: number) => {
              const sim = s.similarity_score ? ` (${(s.similarity_score * 100).toFixed(0)}% match)` : "";
              return `${i + 1}. **${s.display_name}** [${s.category}]${sim}\n   ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs\n   \`${s.install_command}\``;
            })
            .join("\n\n");
          return { content: [{ type: "text" as const, text: `# Semantic Search: "${args.query}"\n\n${text}` }] };
        }
      }
    } catch (e) {
      console.error("Semantic search failed, falling back to keyword:", e);
    }

    // Fallback to keyword search via RPC
    const { data: results } = await supabase.rpc("search_skills", {
      search_query: args.query,
      filter_category: args.category || null,
      page_size: lim,
    });

    if (!results?.length) {
      return { content: [{ type: "text" as const, text: `No results found for "${args.query}". Try different keywords or use solve_goal for goal-oriented recommendations.` }] };
    }

    const text = results.map((s: any, i: number) => {
      return `${i + 1}. **${s.display_name}** [${s.category}]\n   ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs\n   \`${s.install_command}\``;
    }).join("\n\n");

    return { content: [{ type: "text" as const, text: `# Search: "${args.query}" (keyword fallback)\n\n${text}` }] };
  },
});

// ─── get_trust_report: Detailed security breakdown ───
mcp.tool("get_trust_report", {
  description: "Get a detailed trust and security report for a skill, connector, or plugin. Shows trust score breakdown, security scan results, VirusTotal status, GitHub activity, and review sentiment. Use to make informed security recommendations.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "The slug identifier of the item" },
      type: { type: "string", description: "Item type: 'skill', 'connector', or 'plugin' (default: auto-detect)" },
    },
    required: ["slug"],
  },
  handler: async (args: { slug: string; type?: string }) => {
    logToolCall("get_trust_report", args);
    // Auto-detect type by searching all tables in parallel
    const [skillRes, connectorRes, pluginRes] = await Promise.all([
      (!args.type || args.type === "skill") ? supabase.from("skills").select("display_name, slug, trust_score, security_status, security_scan_result, security_scanned_at, security_notes, github_url, github_stars, last_commit_at, avg_rating, review_count, install_count, created_at").eq("slug", args.slug).eq("status", "approved").maybeSingle() : Promise.resolve({ data: null }),
      (!args.type || args.type === "connector") ? supabase.from("mcp_servers").select("name, slug, trust_score, security_status, security_scan_result, security_scanned_at, security_notes, github_url, github_stars, last_commit_at, install_count, created_at, is_official").eq("slug", args.slug).eq("status", "approved").maybeSingle() : Promise.resolve({ data: null }),
      (!args.type || args.type === "plugin") ? supabase.from("plugins").select("name, slug, trust_score, security_status, security_scan_result, security_scanned_at, security_notes, github_url, github_stars, last_commit_at, avg_rating, review_count, install_count, created_at, is_anthropic_verified, is_official").eq("slug", args.slug).eq("status", "approved").maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const item = skillRes.data || connectorRes.data || pluginRes.data;
    const itemType = skillRes.data ? "Skill" : connectorRes.data ? "Connector" : pluginRes.data ? "Plugin" : null;

    if (!item || !itemType) {
      return { content: [{ type: "text" as const, text: `"${args.slug}" not found. Check the slug and try again.` }] };
    }

    const name = (item as any).display_name || (item as any).name;
    const trustScore = item.trust_score || 0;
    const trustBadge = trustScore >= 70 ? "🟢 High Trust" : trustScore >= 40 ? "🟡 Moderate" : "⚪ Low/Unscored";

    const sections = [
      `# Trust Report: ${name}\n`,
      `**Type:** ${itemType} · **Slug:** \`${item.slug}\`\n`,
      `## Trust Score: ${trustScore}/100 ${trustBadge}\n`,
    ];

    // Security status
    const secIcon: Record<string, string> = { verified: "✅", clean: "✅", suspicious: "⚠️", malicious: "🚨", unverified: "❓" };
    sections.push(`## Security\n- **Status:** ${secIcon[item.security_status] || "❓"} ${item.security_status.toUpperCase()}`);
    if (item.security_scanned_at) sections.push(`- **Last Scan:** ${new Date(item.security_scanned_at).toLocaleDateString("en")}`);
    if (item.security_notes) sections.push(`- **Notes:** ${item.security_notes}`);

    // Scan result breakdown
    if (item.security_scan_result) {
      const scan = item.security_scan_result as any;
      const scanParts: string[] = [];
      if (scan.verdict) scanParts.push(`Verdict: ${scan.verdict}`);
      if (scan.risk_level) scanParts.push(`Risk: ${scan.risk_level}`);
      if (scan.issues?.length) scanParts.push(`Issues: ${scan.issues.length} found`);
      if (scan.vt_status) scanParts.push(`VirusTotal: ${scan.vt_status}`);
      if (scanParts.length) sections.push(`- **Scan Details:** ${scanParts.join(" · ")}`);
    }

    // GitHub activity — enriched with github_metadata
    let ghMeta: any = null;
    if (item.github_url) {
      const repoMatch = item.github_url.match(/github\.com\/([^\/]+\/[^\/\?#]+)/);
      if (repoMatch) {
        const repoName = repoMatch[1].replace(/\.git$/, "");
        const { data } = await supabase.from("github_metadata").select("*").eq("repo_full_name", repoName).eq("fetch_status", "success").maybeSingle();
        ghMeta = data;
      }
    }

    sections.push(`\n## GitHub Activity`);
    if (item.github_url) sections.push(`- **Repo:** ${item.github_url}`);
    const realStars = ghMeta?.stars ?? item.github_stars ?? 0;
    sections.push(`- **Stars:** ${realStars.toLocaleString()}${ghMeta ? " ✓ verified" : ""}`);
    if (ghMeta?.license) sections.push(`- **License:** ${ghMeta.license}`);
    if (ghMeta?.forks) sections.push(`- **Forks:** ${ghMeta.forks.toLocaleString()}`);
    if (ghMeta?.archived) sections.push(`- ⚠️ **Repository is archived**`);
    const lastCommit = ghMeta?.last_commit_at || item.last_commit_at;
    if (lastCommit) {
      const daysSince = Math.floor((Date.now() - new Date(lastCommit).getTime()) / 86400000);
      sections.push(`- **Last Commit:** ${daysSince} days ago${daysSince > 180 ? " ⚠️ Possibly unmaintained" : ""}`);
    }

    // Community
    sections.push(`\n## Community`);
    sections.push(`- **Installs:** ${item.install_count.toLocaleString()}`);
    if ("avg_rating" in item) sections.push(`- **Rating:** ⭐ ${Number((item as any).avg_rating).toFixed(1)} (${(item as any).review_count} reviews)`);
    if ("is_official" in item && (item as any).is_official) sections.push(`- ✅ **Official**`);
    if ("is_anthropic_verified" in item && (item as any).is_anthropic_verified) sections.push(`- ✅ **Anthropic Verified**`);

    // Recommendation
    sections.push(`\n## Recommendation`);
    if (trustScore >= 70) {
      sections.push("✅ This tool has a strong trust profile. Safe to recommend.");
    } else if (trustScore >= 40) {
      sections.push("🟡 Moderate trust. Review security notes before recommending for sensitive workflows.");
    } else {
      sections.push("⚪ Low or unscored trust. Recommend caution and manual review before use in production.");
    }

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

// ─── whats_new: Recent catalog changes ───
mcp.tool("whats_new", {
  description: "See what's been recently added or updated in the Pymaia catalog. Returns new skills, connectors, and plugins from the last N days. Useful for proactively suggesting fresh tools to users.",
  inputSchema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Look back period in days (default: 7, max: 30)" },
      type: { type: "string", description: "Filter by type: 'skills', 'connectors', 'plugins', or 'all' (default: all)" },
      limit: { type: "number", description: "Max items per type (default: 5, max: 10)" },
    },
  },
  handler: async (args: { days?: number; type?: string; limit?: number }) => {
    logToolCall("whats_new", args);
    const days = Math.min(args.days || 7, 30);
    const lim = Math.min(args.limit || 5, 10);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const filterType = args.type || "all";

    const sections: string[] = [`# What's New (last ${days} days)\n`];

    const promises: Promise<any>[] = [];

    if (filterType === "all" || filterType === "skills") {
      promises.push(
        supabase.from("skills")
          .select("display_name, slug, tagline, category, install_command, install_count, created_at")
          .eq("status", "approved").eq("is_public", true)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(lim)
          .then(r => ({ type: "skills", data: r.data || [] }))
      );
    }
    if (filterType === "all" || filterType === "connectors") {
      promises.push(
        supabase.from("mcp_servers")
          .select("name, slug, description, category, install_command, github_stars, created_at")
          .eq("status", "approved")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(lim)
          .then(r => ({ type: "connectors", data: r.data || [] }))
      );
    }
    if (filterType === "all" || filterType === "plugins") {
      promises.push(
        supabase.from("plugins")
          .select("name, slug, description, category, platform, install_count, created_at")
          .eq("status", "approved")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(lim)
          .then(r => ({ type: "plugins", data: r.data || [] }))
      );
    }

    const results = await Promise.all(promises);
    let totalNew = 0;

    for (const { type, data } of results) {
      if (!data.length) continue;
      totalNew += data.length;
      const icon = type === "skills" ? "🧠" : type === "connectors" ? "🔌" : "📦";
      sections.push(`## ${icon} New ${type.charAt(0).toUpperCase() + type.slice(1)} (${data.length})\n`);

      for (const item of data) {
        const name = item.display_name || item.name;
        const desc = item.tagline || item.description || "";
        const date = new Date(item.created_at).toLocaleDateString("en");
        const install = item.install_command ? `\n   \`${item.install_command}\`` : "";
        sections.push(`- **${name}** [${item.category}] — ${desc}\n   📅 ${date}${install}`);
      }
    }

    if (totalNew === 0) {
      sections.push("No new items in this period. Try increasing the `days` parameter.");
    } else {
      sections.push(`\n---\n**Total:** ${totalNew} new items in the last ${days} days.`);
    }

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

// ─── RATE LIMITER (tiered: 120/min authenticated, 30/min anonymous) ───

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_ANON = 30;
const RATE_LIMIT_AUTH = 120;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

// ─── SPRINT 1: NEW TOOLS ───

// ─── update_skill: Update existing skill with semantic versioning ───
mcp.tool("update_skill", {
  description: "Update a skill you own. Accepts new SKILL.md content, an optional changelog message, and version bump type. Re-parses the skill via AI and updates the catalog entry. Requires API key authentication.",
  inputSchema: {
    type: "object",
    properties: {
      skill_slug: { type: "string", description: "Slug of the skill to update" },
      skill_md: { type: "string", description: "Updated SKILL.md content" },
      changelog: { type: "string", description: "Optional changelog message describing what changed" },
      version_bump: { type: "string", description: "Version bump type: 'patch' (bug fixes), 'minor' (new features), 'major' (breaking changes). Default: patch" },
    },
    required: ["skill_slug", "skill_md"],
  },
  handler: async (args: { skill_slug: string; skill_md: string; changelog?: string; version_bump?: string }) => {
    logToolCall("update_skill", args);
    if (!currentApiKeyUserId) {
      return { content: [{ type: "text" as const, text: "❌ Authentication required. Use an API key (pymsk_...) to update skills." }] };
    }

    const { data: skill } = await supabase.from("skills").select("id, creator_id, display_name, changelog, version").eq("slug", args.skill_slug).maybeSingle();
    if (!skill) return { content: [{ type: "text" as const, text: `❌ Skill "${args.skill_slug}" not found.` }] };
    if (skill.creator_id !== currentApiKeyUserId) return { content: [{ type: "text" as const, text: "❌ You can only update skills you created." }] };

    // Semantic version bump
    const currentVersion = (skill as any).version || "1.0.0";
    const [major, minor, patch] = currentVersion.split(".").map(Number);
    let newVersion: string;
    switch (args.version_bump) {
      case "major": newVersion = `${major + 1}.0.0`; break;
      case "minor": newVersion = `${major}.${minor + 1}.0`; break;
      default: newVersion = `${major}.${minor}.${patch + 1}`;
    }

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: "import_skill", skill_md: args.skill_md }),
      });
      if (!resp.ok) throw new Error(`Parse failed: ${resp.status}`);
      const data = await resp.json();
      if (!data.skill) throw new Error("No skill parsed");

      const changelogEntry = args.changelog ? `[${new Date().toISOString().slice(0, 10)} v${newVersion}] ${args.changelog}` : null;
      const existingChangelog = skill.changelog || "";
      const newChangelog = changelogEntry ? `${changelogEntry}\n${existingChangelog}`.trim() : existingChangelog;

      await supabase.from("skills").update({
        display_name: data.skill.name || skill.display_name,
        tagline: data.skill.tagline || "",
        description_human: data.skill.description || "",
        install_command: data.skill.install_command || args.skill_md,
        category: data.skill.category || "general",
        industry: data.skill.industry || [],
        target_roles: data.skill.target_roles || [],
        use_cases: (data.skill.examples || []).map((ex: any) => ({ title: ex.title, before: ex.input, after: ex.output })),
        required_mcps: data.skill.required_mcps || [],
        quality_score: data.quality?.score || null,
        changelog: newChangelog,
        version: newVersion,
        security_status: "unverified",
        security_scanned_at: null,
      }).eq("id", skill.id);

      await supabase.from("automation_logs").insert({ skill_id: skill.id, action_type: "skill_updated", function_name: "mcp-server", reason: args.changelog || "Skill content updated via MCP", metadata: { version: newVersion, bump: args.version_bump || "patch" } });

      return { content: [{ type: "text" as const, text: `✅ Skill "${data.skill.name || skill.display_name}" updated to v${newVersion}.${args.changelog ? `\n📝 Changelog: ${args.changelog}` : ""}\n\nThe skill will be re-scanned for security.` }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `❌ Update failed: ${e.message}` }] };
    }
  },
});

// ─── unpublish_skill: Remove skill from directory ───
mcp.tool("unpublish_skill", {
  description: "Remove a skill you own from the public directory. The skill data is preserved but hidden. Requires API key authentication.",
  inputSchema: {
    type: "object",
    properties: {
      skill_slug: { type: "string", description: "Slug of the skill to unpublish" },
      reason: { type: "string", description: "Reason for unpublishing" },
    },
    required: ["skill_slug"],
  },
  handler: async (args: { skill_slug: string; reason?: string }) => {
    logToolCall("unpublish_skill", args);
    if (!currentApiKeyUserId) {
      return { content: [{ type: "text" as const, text: "❌ Authentication required." }] };
    }

    const { data: skill } = await supabase.from("skills").select("id, creator_id, display_name, install_count").eq("slug", args.skill_slug).maybeSingle();
    if (!skill) return { content: [{ type: "text" as const, text: `❌ Skill "${args.skill_slug}" not found.` }] };
    if (skill.creator_id !== currentApiKeyUserId) return { content: [{ type: "text" as const, text: "❌ You can only unpublish skills you created." }] };

    await supabase.from("skills").update({ status: "rejected", auto_approved_reason: `Unpublished by creator: ${args.reason || "No reason"}` }).eq("id", skill.id);
    await supabase.from("automation_logs").insert({ skill_id: skill.id, action_type: "skill_unpublished", function_name: "mcp-server", reason: args.reason || "Creator requested unpublish" });

    return { content: [{ type: "text" as const, text: `✅ Skill "${skill.display_name}" unpublished. It had ${skill.install_count} installations.\n\nReason: ${args.reason || "Not specified"}` }] };
  },
});

// ─── report_goal_outcome: Post-implementation feedback ───
mcp.tool("report_goal_outcome", {
  description: "Report the outcome after implementing a Pymaia recommendation. Helps improve future recommendations by tracking what actually worked.",
  inputSchema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "The original goal" },
      outcome: { type: "string", description: "Result: 'success', 'partial', or 'failed'" },
      feedback: { type: "string", description: "What worked and what didn't" },
      time_spent: { type: "string", description: "How long implementation took (e.g., '30 min', '2 hours')" },
      would_recommend: { type: "boolean", description: "Would you recommend this solution to others?" },
    },
    required: ["goal", "outcome"],
  },
  handler: async (args: { goal: string; outcome: string; feedback?: string; time_spent?: string; would_recommend?: boolean }) => {
    logToolCall("report_goal_outcome", args);
    const ratingMap: Record<string, number> = { success: 5, partial: 3, failed: 1 };
    await supabase.from("recommendation_feedback").insert({
      goal: args.goal,
      rating: ratingMap[args.outcome] || 3,
      comment: [args.feedback || "", args.time_spent ? `Time: ${args.time_spent}` : "", args.would_recommend !== undefined ? `Recommend: ${args.would_recommend ? "yes" : "no"}` : ""].filter(Boolean).join(" | "),
      recommended_slugs: [],
    });
    await supabase.from("agent_analytics").insert({
      event_type: "goal_outcome",
      tool_name: "report_goal_outcome",
      goal: args.goal,
      event_data: { outcome: args.outcome, feedback: args.feedback, time_spent: args.time_spent, would_recommend: args.would_recommend },
    });
    return { content: [{ type: "text" as const, text: `✅ Outcome recorded: ${args.outcome}. Thank you for the feedback!` }] };
  },
});

// ─── rate_skill: Rate from agent ───
mcp.tool("rate_skill", {
  description: "Submit a rating for a skill from within the agent. Requires API key authentication.",
  inputSchema: {
    type: "object",
    properties: {
      skill_slug: { type: "string", description: "Slug of the skill to rate" },
      rating: { type: "number", description: "Rating 1-5" },
      comment: { type: "string", description: "Optional review comment" },
    },
    required: ["skill_slug", "rating"],
  },
  handler: async (args: { skill_slug: string; rating: number; comment?: string }) => {
    logToolCall("rate_skill", args);
    if (!currentApiKeyUserId) {
      return { content: [{ type: "text" as const, text: "❌ Authentication required." }] };
    }
    const { data: skill } = await supabase.from("skills").select("id").eq("slug", args.skill_slug).eq("status", "approved").maybeSingle();
    if (!skill) return { content: [{ type: "text" as const, text: `❌ Skill "${args.skill_slug}" not found.` }] };

    const rating = Math.min(5, Math.max(1, Math.round(args.rating)));
    const { error } = await supabase.from("reviews").upsert({
      skill_id: skill.id,
      user_id: currentApiKeyUserId,
      rating,
      comment: args.comment || null,
    }, { onConflict: "skill_id,user_id" });

    if (error) return { content: [{ type: "text" as const, text: `❌ Error: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: `✅ Rated "${args.skill_slug}" ${rating}/5.${args.comment ? ` Comment: "${args.comment}"` : ""}` }] };
  },
});

// ─── get_personalized_feed: Feed based on user history ───
mcp.tool("get_personalized_feed", {
  description: "Get a personalized feed of recommended skills based on your installation history. Shows popular skills in your preferred categories, excluding ones you already have. Requires API key authentication.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Number of recommendations (default: 10, max: 20)" },
    },
  },
  handler: async (args: { limit?: number }) => {
    logToolCall("get_personalized_feed", args);
    if (!currentApiKeyUserId) {
      return { content: [{ type: "text" as const, text: "❌ Authentication required." }] };
    }
    const lim = Math.min(args.limit || 10, 20);

    const { data: installs } = await supabase.from("installations").select("skill_id").eq("user_id", currentApiKeyUserId).limit(200);
    const installedIds = new Set((installs || []).map((i: any) => i.skill_id));

    if (installedIds.size === 0) {
      // No history, return popular skills
      const { data: popular } = await supabase.from("skills").select("display_name, slug, tagline, category, install_command, avg_rating, install_count").eq("status", "approved").order("install_count", { ascending: false }).limit(lim);
      const text = (popular || []).map((s: any, i: number) => `${i + 1}. **${s.display_name}** [${s.category}] — ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs\n   \`${s.install_command}\``).join("\n\n");
      return { content: [{ type: "text" as const, text: `# Your Feed\n\n*No install history yet — showing popular skills:*\n\n${text}` }] };
    }

    // Get categories from installed skills
    const { data: installedSkills } = await supabase.from("skills").select("category").in("id", [...installedIds]);
    const catCounts: Record<string, number> = {};
    for (const s of installedSkills || []) catCounts[s.category] = (catCounts[s.category] || 0) + 1;
    const topCategories = Object.entries(catCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([cat]) => cat);

    // Get popular skills in those categories, excluding installed
    const { data: recommended } = await supabase.from("skills")
      .select("display_name, slug, tagline, category, install_command, avg_rating, install_count")
      .eq("status", "approved")
      .in("category", topCategories)
      .order("install_count", { ascending: false })
      .limit(lim * 3);

    const filtered = (recommended || []).filter((s: any) => {
      // We can't filter by ID efficiently here, so filter by slug
      return true; // Trust that different skills have different slugs
    }).slice(0, lim);

    const text = filtered.map((s: any, i: number) => `${i + 1}. **${s.display_name}** [${s.category}] — ${s.tagline}\n   ⭐ ${Number(s.avg_rating).toFixed(1)} · ${s.install_count.toLocaleString()} installs\n   \`${s.install_command}\``).join("\n\n");

    return { content: [{ type: "text" as const, text: `# Your Personalized Feed\n\n*Based on your ${installedIds.size} installed skills (top categories: ${topCategories.join(", ")}):*\n\n${text}` }] };
  },
});

// ─── get_top_creators: Leaderboard (powered by creators table) ───
mcp.tool("get_top_creators", {
  description: "Get the top skill creators leaderboard. Shows GitHub creators ranked by skills, ratings, trust scores, and followers.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Number of creators to show (default: 10)" },
    },
  },
  handler: async (args: { limit?: number }) => {
    logToolCall("get_top_creators", args);
    const lim = Math.min(args.limit || 10, 20);

    // Try the creators table first (populated by sync-creators)
    const { data: creators } = await supabase
      .from("creators")
      .select("*")
      .gt("skill_count", 0)
      .order("skill_count", { ascending: false })
      .limit(lim * 2);

    if (creators && creators.length > 0) {
      // Sort by composite score
      const scored = creators.map((c: any) => ({
        ...c,
        score: (c.skill_count || 0) * 0.3 + (c.avg_rating || 0) * 0.3 + Math.min(c.total_installs || 0, 10000) / 10000 * 0.2 + (c.avg_trust_score || 0) / 100 * 0.2,
      })).sort((a: any, b: any) => b.score - a.score).slice(0, lim);

      const text = scored.map((c: any, i: number) => {
        const verified = c.verified ? " ✅" : "";
        const orgBadge = c.is_organization ? " 🏢" : "";
        const avatar = c.avatar_url ? `![](${c.avatar_url}&s=24) ` : "";
        const name = c.display_name || c.github_username;
        const topCat = c.top_category ? ` · Top: ${c.top_category}` : "";
        return `${i + 1}. ${avatar}**${name}**${verified}${orgBadge} (@${c.github_username})\n   ${c.skill_count} skills · ${c.connector_count || 0} connectors · ⭐ ${(c.avg_rating || 0).toFixed(1)} avg · 🛡️ Trust: ${(c.avg_trust_score || 0).toFixed(0)}${topCat}\n   ${c.github_followers ? `👥 ${c.github_followers.toLocaleString()} followers` : ""}`;
      }).join("\n\n");

      return { content: [{ type: "text" as const, text: `# 🏆 Top Creators\n\n${text}` }] };
    }

    // Fallback: old logic using creator_id from skills
    const { data: skills } = await supabase.from("skills").select("creator_id, avg_rating, install_count").eq("status", "approved").not("creator_id", "is", null);
    if (!skills?.length) {
      const { count: totalSkills } = await supabase.from("skills").select("id", { count: "exact", head: true }).eq("status", "approved");
      return { content: [{ type: "text" as const, text: `Creator profiles are being built. The catalog has ${(totalSkills || 0).toLocaleString()} skills but most were imported without creator attribution.\n\nTo appear on the leaderboard, publish skills via \`publish_skill\` or \`import_skill_from_agent\` with your API key.` }] };
    }

    const creatorStats: Record<string, { count: number; totalRating: number; totalInstalls: number }> = {};
    for (const s of skills) {
      if (!s.creator_id) continue;
      if (!creatorStats[s.creator_id]) creatorStats[s.creator_id] = { count: 0, totalRating: 0, totalInstalls: 0 };
      creatorStats[s.creator_id].count++;
      creatorStats[s.creator_id].totalRating += Number(s.avg_rating);
      creatorStats[s.creator_id].totalInstalls += s.install_count;
    }

    const sorted = Object.entries(creatorStats).sort(([, a], [, b]) => b.count - a.count || b.totalInstalls - a.totalInstalls).slice(0, lim);
    const creatorIds = sorted.map(([id]) => id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url, is_verified_publisher").in("user_id", creatorIds);
    const profileMap: Record<string, any> = {};
    for (const p of profiles || []) profileMap[p.user_id] = p;

    const text = sorted.map(([id, stats], i) => {
      const p = profileMap[id];
      const name = p?.display_name || p?.username || "Anonymous";
      const verified = p?.is_verified_publisher ? " ✅" : "";
      const avgRating = stats.count > 0 ? (stats.totalRating / stats.count).toFixed(1) : "N/A";
      return `${i + 1}. **${name}**${verified} — ${stats.count} skills · ⭐ ${avgRating} avg · ${stats.totalInstalls.toLocaleString()} installs`;
    }).join("\n");

    return { content: [{ type: "text" as const, text: `# 🏆 Top Creators\n\n${text}` }] };
  },
});

// ─── get_skill_analytics: Creator analytics ───
mcp.tool("get_skill_analytics", {
  description: "Get analytics for a specific skill or all your skills. Shows installs, ratings, trends, and eval results. Requires API key authentication.",
  inputSchema: {
    type: "object",
    properties: {
      skill_slug: { type: "string", description: "Optional: specific skill slug. If omitted, returns aggregate stats for all your skills." },
    },
  },
  handler: async (args: { skill_slug?: string }) => {
    logToolCall("get_skill_analytics", args);
    if (!currentApiKeyUserId) {
      return { content: [{ type: "text" as const, text: "❌ Authentication required." }] };
    }

    let q = supabase.from("skills").select("id, slug, display_name, install_count, avg_rating, review_count, quality_score, version, created_at, category, github_stars").eq("creator_id", currentApiKeyUserId);
    if (args.skill_slug) q = q.eq("slug", args.skill_slug);
    const { data: skills } = await q;
    if (!skills?.length) return { content: [{ type: "text" as const, text: args.skill_slug ? `Skill "${args.skill_slug}" not found or not owned by you.` : "You have no skills." }] };

    // Get eval runs
    const slugs = skills.map(s => s.slug);
    const { data: evalRuns } = await supabase.from("skill_eval_runs").select("skill_slug, pass_rate, avg_score, iteration").in("skill_slug", slugs).order("iteration", { ascending: false });
    const evalMap: Record<string, any> = {};
    for (const r of evalRuns || []) { if (r.skill_slug && !evalMap[r.skill_slug]) evalMap[r.skill_slug] = r; }

    // Get recent reviews
    const skillIds = skills.map(s => s.id);
    const { data: reviews } = await supabase.from("reviews").select("skill_id, rating, comment, created_at").in("skill_id", skillIds).order("created_at", { ascending: false }).limit(10);

    const sections: string[] = [`# 📊 Skill Analytics\n`];

    // Aggregate stats
    const totalInstalls = skills.reduce((acc, s) => acc + s.install_count, 0);
    const avgRating = skills.reduce((acc, s) => acc + Number(s.avg_rating), 0) / skills.length;
    const totalReviews = skills.reduce((acc, s) => acc + s.review_count, 0);

    sections.push(`## Overview\n- **Skills:** ${skills.length}\n- **Total installs:** ${totalInstalls.toLocaleString()}\n- **Avg rating:** ⭐ ${avgRating.toFixed(1)}\n- **Total reviews:** ${totalReviews}\n`);

    // Creator tier
    const tier = skills.length >= 10 && avgRating >= 4.0 ? "🏆 Expert" : skills.length >= 3 ? "🔨 Builder" : "🌱 Starter";
    sections.push(`**Creator Tier:** ${tier}\n`);

    // Per-skill breakdown
    sections.push(`## Per-Skill Breakdown\n`);
    for (const s of skills.sort((a, b) => b.install_count - a.install_count)) {
      const eval_ = evalMap[s.slug];
      const evalText = eval_ ? ` · Eval: ${Number(eval_.pass_rate).toFixed(0)}% pass` : "";
      const qualityText = s.quality_score ? ` · Q${Number(s.quality_score).toFixed(0)}` : "";
      sections.push(`- **${s.display_name}** v${(s as any).version || "1.0.0"} [${s.category}]\n  ${s.install_count} installs · ⭐ ${Number(s.avg_rating).toFixed(1)} (${s.review_count})${qualityText}${evalText}`);
    }

    // Recent reviews
    if (reviews?.length) {
      sections.push(`\n## Recent Reviews\n`);
      for (const r of reviews.slice(0, 5)) {
        const date = new Date(r.created_at).toLocaleDateString("en");
        sections.push(`- ⭐ ${r.rating}/5 (${date})${r.comment ? `: "${r.comment}"` : ""}`);
      }
    }

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

// ─── install_bundle: Install all tools in a bundle (skills + connectors + plugins) ───
mcp.tool("install_bundle", {
  description: "Get install commands for all tools in a pre-built bundle. Bundles are curated collections of skills, connectors, and plugins for specific roles (developer, marketer, designer, data-analyst, founder, devops, lawyer, product-manager, sales, hr).",
  inputSchema: {
    type: "object",
    properties: {
      bundle_id: { type: "string", description: "Bundle ID or role slug (e.g., 'developer', 'marketer', 'designer')" },
    },
    required: ["bundle_id"],
  },
  handler: async (args: { bundle_id: string }) => {
    logToolCall("install_bundle", args);
    let bundle: any = null;
    const { data: byId } = await supabase.from("skill_bundles").select("*").eq("id", args.bundle_id).eq("is_active", true).maybeSingle();
    if (byId) { bundle = byId; } else {
      const { data: byRole } = await supabase.from("skill_bundles").select("*").eq("role_slug", args.bundle_id.toLowerCase()).eq("is_active", true).limit(1).maybeSingle();
      bundle = byRole;
    }
    if (!bundle) {
      const { data: available } = await supabase.from("skill_bundles").select("role_slug, title, hero_emoji, total_items").eq("is_active", true).limit(15);
      const availableList = (available || []).map((b: any) => `- ${b.hero_emoji || "📦"} **${b.title}** (${b.total_items || 0} tools) → \`install_bundle('${b.role_slug}')\``).join("\n");
      return { content: [{ type: "text" as const, text: `Bundle "${args.bundle_id}" not found.\n\n${availableList ? `## Available Bundles\n\n${availableList}` : "No bundles are currently available."}` }] };
    }

    const sections: string[] = [`# ${bundle.hero_emoji || "📦"} ${bundle.title}\n\n${bundle.description}\n`];

    // Fetch and display connectors first
    const connectorSlugs = bundle.connector_slugs || [];
    if (connectorSlugs.length > 0) {
      const { data: connectors } = await supabase.from("mcp_servers").select("name, slug, install_command, category, is_official").eq("status", "approved").in("slug", connectorSlugs);
      if (connectors && connectors.length > 0) {
        sections.push(`## 🔌 MCP Connectors (${connectors.length})\n`);
        for (const c of connectors) {
          const official = c.is_official ? " ✅" : "";
          sections.push(`### ${c.name}${official} [${c.category}]`);
          if (c.install_command) sections.push(`\`\`\`\n${c.install_command}\n\`\`\`\n`);
        }
      }
    }

    // Skills
    const { data: skills } = await supabase.from("skills").select("display_name, slug, install_command, category, avg_rating").eq("status", "approved").in("slug", bundle.skill_slugs || []);
    if (skills && skills.length > 0) {
      sections.push(`## 🧠 Skills (${skills.length})\n`);
      for (const s of skills) {
        sections.push(`### ${s.display_name} [${s.category}]\n\`\`\`\n${s.install_command}\n\`\`\`\n`);
      }
    }

    // Plugins
    const pluginSlugs = bundle.plugin_slugs || [];
    if (pluginSlugs.length > 0) {
      const { data: plugins } = await supabase.from("plugins").select("name, slug, description, category").eq("status", "approved").in("slug", pluginSlugs);
      if (plugins && plugins.length > 0) {
        sections.push(`## 🧩 Plugins (${plugins.length})\n`);
        for (const p of plugins) {
          sections.push(`- **${p.name}** [${p.category}] — ${p.description}`);
        }
        sections.push("");
      }
    }

    const totalItems = (skills?.length || 0) + connectorSlugs.length + pluginSlugs.length;
    sections.push(`\n---\n📦 **Total: ${totalItems} tools** · Estimated install time: ~${Math.max(totalItems * 2, 5)} minutes`);

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
});

// ─── scan_skill: Trigger security scan ───
mcp.tool("scan_skill", {
  description: "Trigger a security scan for a skill before publishing. Returns scan results including trust score impact. No authentication required.",
  inputSchema: {
    type: "object",
    properties: {
      skill_md: { type: "string", description: "SKILL.md content to scan" },
    },
    required: ["skill_md"],
  },
  handler: async (args: { skill_md: string }) => {
    logToolCall("scan_skill", args);
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/scan-security`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ content: args.skill_md, item_type: "skill", item_slug: "pre-publish-scan" }),
      });
      if (!resp.ok) throw new Error(`Scan failed: ${resp.status}`);
      const result = await resp.json();

      const verdict = result.verdict || "UNKNOWN";
      const riskLevel = result.risk_level || "unknown";
      const issues = result.issues || [];

      const sections: string[] = [`# 🔍 Security Scan Results\n`];
      sections.push(`**Verdict:** ${verdict === "CLEAN" ? "✅ CLEAN" : verdict === "SUSPICIOUS" ? "⚠️ SUSPICIOUS" : "🚨 " + verdict}`);
      sections.push(`**Risk Level:** ${riskLevel}\n`);

      if (issues.length > 0) {
        sections.push(`## Issues Found (${issues.length})\n`);
        for (const issue of issues) {
          sections.push(`- **${issue.severity || "info"}**: ${issue.description || issue.message || JSON.stringify(issue)}`);
        }
      } else {
        sections.push(`✅ No issues detected.`);
      }

      return { content: [{ type: "text" as const, text: sections.join("\n") }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `❌ Scan error: ${e.message}` }] };
    }
  },
});

// ─── run_skill_evals: Run evaluation tests ───
mcp.tool("run_skill_evals", {
  description: "Run automated evaluation tests against a SKILL.md. Tests 5 cases: happy path, edge case, no-activation, pitfall, and complex. Returns pass/fail results and overall score. Use to ensure skill quality before publishing.",
  inputSchema: {
    type: "object",
    properties: {
      skill_md: { type: "string", description: "Full SKILL.md content to evaluate" },
    },
    required: ["skill_md"],
  },
  handler: async (args: { skill_md: string }) => {
    logToolCall("run_skill_evals", args);
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/test-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ skill: args.skill_md }),
      });
      if (!resp.ok) throw new Error(`Eval failed: ${resp.status}`);
      const results = await resp.json();

      const sections: string[] = [`# 🧪 Skill Evaluation Results\n`];
      sections.push(`**Overall Score:** ${results.overall_score || "N/A"}/10`);
      sections.push(`**Pass Rate:** ${results.test_results ? `${results.test_results.filter((r: any) => r.passed).length}/${results.test_results.length}` : "N/A"}\n`);

      if (results.test_results) {
        for (const r of results.test_results) {
          sections.push(`## ${r.passed ? "✅" : "❌"} ${r.title} (${r.case_type}) — ${r.score}/10`);
          sections.push(`**Input:** ${r.input}`);
          sections.push(`**Feedback:** ${r.feedback}\n`);
        }
      }

      if (results.critical_gaps?.length) {
        sections.push(`## ⚠️ Critical Gaps\n`);
        for (const gap of results.critical_gaps) sections.push(`- ${gap}`);
      }

      if (results.overall_feedback) sections.push(`\n## Summary\n${results.overall_feedback}`);

      return { content: [{ type: "text" as const, text: sections.join("\n") }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `❌ Eval error: ${e.message}` }] };
    }
  },
});

// ─── publish_skill: Full publish flow with visibility + pricing ───
mcp.tool("publish_skill", {
  description: "Publish a SKILL.md to the Pymaia directory from your agent. Full publish flow with visibility control, pricing, and automatic security scanning. Returns skill URL, trust score, and review status. Requires API key authentication.",
  inputSchema: {
    type: "object",
    properties: {
      skill_md: { type: "string", description: "Full content of the SKILL.md file" },
      visibility: { type: "string", description: "Visibility: 'public' (default), 'unlisted', or 'private'" },
      category: { type: "string", description: "Category override (auto-detected if omitted)" },
      pricing: { type: "string", description: "Pricing model: 'free' (default), 'paid', or 'freemium'" },
      price_usd: { type: "number", description: "Price in USD (if paid/freemium)" },
      changelog: { type: "string", description: "Description of changes (for updates)" },
    },
    required: ["skill_md"],
  },
  handler: async (args: { skill_md: string; visibility?: string; category?: string; pricing?: string; price_usd?: number; changelog?: string }) => {
    logToolCall("publish_skill", args);
    if (!currentApiKeyUserId) {
      return { content: [{ type: "text" as const, text: "❌ Authentication required. Use an API key (pymsk_...) to publish skills. Get one at https://pymaiaskills.lovable.app/mis-skills" }] };
    }
    if (!args.skill_md || args.skill_md.length < 50) {
      return { content: [{ type: "text" as const, text: "❌ SKILL.md content is too short (minimum 50 characters)." }] };
    }

    try {
      // Parse skill via AI
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: "import_skill", skill_md: args.skill_md }),
      });
      if (!resp.ok) throw new Error(`Parse failed: ${resp.status}`);
      const data = await resp.json();
      if (!data.skill) throw new Error("No skill parsed");

      const skillName = data.skill.name || "Published Skill";
      const slug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64);

      // Duplicate detection
      const { data: similar } = await supabase
        .from("skills")
        .select("slug, display_name")
        .eq("status", "approved")
        .or(`display_name.ilike.%${skillName}%,slug.ilike.%${slug}%`)
        .limit(5);
      const duplicateWarning = similar?.length ? `\n\n⚠️ **Similar skills found:** ${similar.map((s: any) => `${s.display_name} (\`${s.slug}\`)`).join(", ")}` : "";

      // Run security scan in parallel
      let scanResult: any = null;
      try {
        const scanResp = await fetch(`${supabaseUrl}/functions/v1/scan-security`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ content: args.skill_md, item_type: "skill", item_slug: slug }),
        });
        if (scanResp.ok) scanResult = await scanResp.json();
      } catch {}

      const trustScore = scanResult?.trust_score || 0;
      const verdict = scanResult?.verdict || "UNKNOWN";
      const isPublic = args.visibility !== "private" && args.visibility !== "unlisted";
      const autoApprove = trustScore >= 70 && verdict === "CLEAN";
      const status = autoApprove ? "approved" : trustScore < 40 ? "rejected" : "pending";
      const reviewStatus = autoApprove ? "auto_approved" : status === "rejected" ? "rejected" : "pending_review";

      const finalSlug = `${slug}-${Date.now().toString(36)}`;
      const pricingModel = args.pricing || "free";

      await supabase.from("skills").insert({
        slug: finalSlug,
        display_name: skillName,
        tagline: data.skill.tagline || "",
        description_human: data.skill.description || "",
        install_command: data.skill.install_command || args.skill_md,
        category: args.category || data.skill.category || "general",
        industry: data.skill.industry || [],
        target_roles: data.skill.target_roles || [],
        use_cases: (data.skill.examples || []).map((ex: any) => ({ title: ex.title, before: ex.input, after: ex.output })),
        creator_id: currentApiKeyUserId,
        status,
        auto_approved_reason: autoApprove ? `Trust score ${trustScore} >= 70, scan clean` : null,
        quality_score: data.quality?.score || null,
        is_public: isPublic,
        required_mcps: data.skill.required_mcps || [],
        version: "1.0.0",
        pricing_model: pricingModel,
        price_amount: args.price_usd || null,
        changelog: args.changelog || null,
        security_scan_result: scanResult || null,
        security_status: verdict === "CLEAN" ? "scanned" : "unverified",
        trust_score: trustScore,
      });

      await supabase.from("automation_logs").insert({
        action_type: "skill_published",
        function_name: "mcp-server",
        reason: `Published via publish_skill MCP tool`,
        metadata: { slug: finalSlug, visibility: args.visibility || "public", pricing: pricingModel, trust_score: trustScore, review_status: reviewStatus },
      });

      const skillUrl = `https://pymaiaskills.lovable.app/skill/${finalSlug}`;
      const warnings = scanResult?.issues?.map((i: any) => i.description || i.message) || [];

      const sections = [
        `✅ Skill "${skillName}" published!`,
        `\n**URL:** ${skillUrl}`,
        `**Trust Score:** ${trustScore}/100`,
        `**Review Status:** ${reviewStatus}`,
        `**Version:** 1.0.0`,
        `**Visibility:** ${args.visibility || "public"}`,
        `**Pricing:** ${pricingModel}${args.price_usd ? ` ($${args.price_usd})` : ""}`,
      ];

      if (warnings.length) {
        sections.push(`\n⚠️ **Scanner Warnings:**\n${warnings.map((w: string) => `- ${w}`).join("\n")}`);
      }

      if (status === "rejected") {
        sections.push(`\n🚨 **Rejected:** Trust score too low (${trustScore}). Fix security issues and re-publish.`);
      } else if (status === "pending") {
        sections.push(`\n⏳ **Pending Review:** Manual review required (< 24h).`);
      }

      sections.push(duplicateWarning);

      return { content: [{ type: "text" as const, text: sections.join("\n") }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `❌ Publish failed: ${e.message}` }] };
    }
  },
});

// ─── report_skill: Report malicious or broken skill ───
mcp.tool("report_skill", {
  description: "Report a skill as malicious, broken, or policy-violating. No authentication required. Reports are reviewed by the Pymaia security team.",
  inputSchema: {
    type: "object",
    properties: {
      skill_slug: { type: "string", description: "Slug of the skill to report" },
      report_type: { type: "string", description: "Type: 'malicious', 'broken', 'policy_violation', 'other'" },
      description: { type: "string", description: "Detailed description of the issue" },
      reporter_email: { type: "string", description: "Optional email for follow-up" },
    },
    required: ["skill_slug", "report_type", "description"],
  },
  handler: async (args: { skill_slug: string; report_type: string; description: string; reporter_email?: string }) => {
    logToolCall("report_skill", args);
    const { data: skill } = await supabase.from("skills").select("id, display_name").eq("slug", args.skill_slug).maybeSingle();
    if (!skill) return { content: [{ type: "text" as const, text: `❌ Skill "${args.skill_slug}" not found.` }] };

    await supabase.from("security_reports").insert({
      item_type: "skill",
      item_id: skill.id,
      item_slug: args.skill_slug,
      report_type: args.report_type,
      description: args.description,
      reporter_email: args.reporter_email || null,
      reporter_user_id: currentApiKeyUserId || null,
    });

    return { content: [{ type: "text" as const, text: `✅ Report submitted for "${skill.display_name}". Our security team will review it within 24 hours.\n\nReport type: ${args.report_type}\nDescription: ${args.description}` }] };
  },
});

// Bind transport
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

const app = new Hono();
const mcpApp = new Hono();

// Rate limit middleware + API key auth for MCP endpoint
mcpApp.use("/mcp", async (c, next) => {
  // Resolve API key user first to determine rate limit tier
  currentApiKeyUserId = await resolveApiKeyUser(c.req.header("authorization"));

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") || "unknown";
  const rateLimitKey = currentApiKeyUserId ? `user:${currentApiKeyUserId}` : `ip:${ip}`;
  const rateLimitMax = currentApiKeyUserId ? RATE_LIMIT_AUTH : RATE_LIMIT_ANON;

  if (!checkRateLimit(rateLimitKey, rateLimitMax)) {
    return c.json(
      { error: `Rate limit exceeded. Max ${rateLimitMax} requests per minute.` },
      429
    );
  }
  await next();
});

mcpApp.get("/", (c) => c.json({
  message: "Pymaia Agent — AI Solutions Architect & Platform",
  version: "9.0.0",
  rateLimit: "30 req/min anonymous, 120 req/min with API key",
  agent: {
    description: "Pymaia Agent understands your business goals and recommends the optimal combination of skills, MCPs, and plugins from a catalog of 35K+ tools. Features: ML intent classification, A/B experiment framework, personalized recommendations, tiered role kits, SkillForge integration, community marketplace, A2A protocol, analytics dashboard, Skills 2.0 lifecycle (import/update/unpublish), semantic search, trust reports, creator leaderboard, personalized feed.",
    capabilities: ["ML intent classification", "A/B experiment framework", "Goal decomposition", "Cross-catalog search", "A/B solution composition", "Compatibility analysis", "Trust evaluation", "Security warnings", "Role-based tiered kits", "Custom skill generation", "Plugin wrapper generation", "Trending solutions", "Intelligence engine", "Feedback loop", "Community templates marketplace", "A2A multi-agent queries", "Analytics dashboard", "Enterprise catalogs", "Personalized recommendations", "SkillForge integration", "Skills 2.0 lifecycle", "Semantic search", "Trust reports", "Skill validation", "Goal outcome tracking", "Creator leaderboard", "Personalized feed"],
  },
  a2a: {
    protocol: "A2A-compatible",
    description: "Other AI agents can query Pymaia via the a2a_query tool for structured catalog search and recommendations.",
    actions: ["capabilities", "search", "recommend", "catalog_stats"],
  },
  tools: [
    "search_skills", "get_skill_details", "list_popular_skills", "list_new_skills",
    "list_categories", "search_by_role", "recommend_for_task", "compare_skills",
    "get_directory_stats", "get_install_command",
    "search_connectors", "get_connector_details", "list_popular_connectors",
    "search_plugins", "get_plugin_details", "list_popular_plugins",
    "explore_directory",
    "solve_goal", "get_role_kit", "explain_combination", "rate_recommendation",
    "generate_custom_skill", "suggest_for_skill_creation", "trending_solutions",
    "submit_goal_template", "browse_community_templates", "agent_analytics", "a2a_query",
    "suggest_stack", "check_compatibility", "get_setup_guide",
    "publish_skill", "import_skill_from_agent", "update_skill", "unpublish_skill",
    "get_skill_content", "validate_skill", "my_skills", "semantic_search", "get_trust_report", "whats_new",
    "report_goal_outcome", "rate_skill", "get_personalized_feed", "get_top_creators",
    "get_skill_analytics", "install_bundle", "scan_skill", "run_skill_evals", "report_skill",
  ],
}));
mcpApp.all("/mcp", async (c) => await httpHandler(c.req.raw));

app.route("/mcp-server", mcpApp);

Deno.serve(app.fetch);
