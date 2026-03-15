import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sanitize for PostgREST .or() filters
function sanitize(s: string): string {
  return s.replace(/[%_'"\\(),.]/g, "").trim();
}

// AI keyword extraction — same approach as MCP solve_goal's classifyIntent
async function extractSearchIntent(query: string, apiKey: string): Promise<{
  keywords: string[];
  category: string | null;
  capabilities: string[];
}> {
  try {
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
            content: `You extract search parameters from user intent queries about AI agent skills/tools.
Given a user query describing what they want to do, return:
- keywords: 4-8 English search terms that would match skill names, taglines, or descriptions in a catalog of 38K+ AI tools. Include both specific terms and broader synonyms. Think about what the tool NAME or TAGLINE would contain.
- category: one of [ia, desarrollo, diseño, marketing, automatización, datos, creatividad, productividad, legal, negocios, ventas, producto, finanzas, ecommerce, operaciones, educación, salud] or null
- capabilities: 2-4 technical capabilities needed (e.g., "image generation", "social media content", "carousel creation")

Examples:
"quiero generar carrouseles virales para instagram" -> keywords: ["carousel", "instagram", "social media", "content creation", "design", "post generator", "slides", "canva"], category: "marketing", capabilities: ["carousel generation", "social media content", "visual design"]
"automate outbound sales emails" -> keywords: ["email", "outbound", "sales", "automation", "cold email", "campaign", "CRM"], category: "ventas", capabilities: ["email automation", "outbound sales"]
"review smart contracts for vulnerabilities" -> keywords: ["smart contract", "audit", "solidity", "security", "blockchain", "vulnerability"], category: "desarrollo", capabilities: ["code review", "security audit"]`,
          },
          { role: "user", content: query },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_search_params",
            description: "Extract search parameters from user intent",
            parameters: {
              type: "object",
              properties: {
                keywords: { type: "array", items: { type: "string" }, description: "4-8 search terms" },
                category: { type: "string", nullable: true },
                capabilities: { type: "array", items: { type: "string" } },
              },
              required: ["keywords", "category", "capabilities"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_search_params" } },
      }),
    });

    if (!resp.ok) {
      const status = resp.status;
      if (status === 429) throw new Error("RATE_LIMIT");
      if (status === 402) throw new Error("CREDITS_EXHAUSTED");
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No tool call");
    return JSON.parse(call.function.arguments);
  } catch (e) {
    if (e instanceof Error && (e.message === "RATE_LIMIT" || e.message === "CREDITS_EXHAUSTED")) throw e;
    console.error("Intent extraction fallback:", e);
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    return { keywords: words, category: null, capabilities: [] };
  }
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

    // 1. AI keyword extraction (same approach as MCP solve_goal)
    const intent = await extractSearchIntent(query, LOVABLE_API_KEY);
    const { keywords, category: aiCategory, capabilities } = intent;

    const searchCategory = category || aiCategory || null;

    // 2. Expand keywords: multi-word keywords also searched as individual words
    const expandedKeywords = new Set<string>();
    for (const kw of keywords) {
      expandedKeywords.add(kw);
      const parts = kw.split(/\s+/).filter(w => w.length >= 2);
      if (parts.length > 1) {
        for (const part of parts) expandedKeywords.add(part);
      }
    }
    // Add capabilities as search terms too
    for (const cap of capabilities) {
      const parts = cap.split(/\s+/).filter(w => w.length >= 2);
      for (const part of parts) expandedKeywords.add(part);
    }
    const uniqueKeywords = [...expandedKeywords].slice(0, 12);

    // 3. Cross-catalog search (broad ilike on name, tagline, description, category)
    const searchTables = tables || ["skills"];
    const skillMap = new Map<string, any>();
    const connectorMap = new Map<string, any>();
    const pluginMap = new Map<string, any>();

    for (const kw of uniqueKeywords) {
      const q = sanitize(kw);
      if (!q || q.length < 2) continue;

      const promises: Promise<any>[] = [];

      // Skills search (always)
      promises.push(
        supabase.from("skills")
          .select("id, slug, display_name, display_name_es, tagline, tagline_es, description_human, description_human_es, category, industry, target_roles, install_command, github_url, video_url, time_to_install_minutes, install_count, avg_rating, review_count, github_stars, use_cases, creator_id, created_at, status, trust_score, quality_score, is_stale, security_status")
          .eq("status", "approved")
          .eq("is_public", true)
          .or(`display_name.ilike.%${q}%,display_name_es.ilike.%${q}%,tagline.ilike.%${q}%,tagline_es.ilike.%${q}%,description_human.ilike.%${q}%,description_human_es.ilike.%${q}%,slug.ilike.%${q}%,category.ilike.%${q}%`)
          .order("install_count", { ascending: false })
          .limit(15)
      );

      // Connectors search (if requested)
      if (searchTables.includes("connectors")) {
        promises.push(
          supabase.from("mcp_servers")
            .select("id, slug, name, description, description_es, category, github_stars, is_official, install_command, trust_score, security_status")
            .eq("status", "approved")
            .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%,description_es.ilike.%${q}%,category.ilike.%${q}%`)
            .order("is_official", { ascending: false })
            .order("trust_score", { ascending: false })
            .limit(10)
        );
      }

      // Plugins search (if requested)
      if (searchTables.includes("plugins")) {
        promises.push(
          supabase.from("plugins")
            .select("id, slug, name, name_es, description, description_es, category, install_count, is_official, is_anthropic_verified, trust_score, security_status, github_stars")
            .eq("status", "approved")
            .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%,description_es.ilike.%${q}%,category.ilike.%${q}%`)
            .order("install_count", { ascending: false })
            .limit(10)
        );
      }

      const results = await Promise.all(promises);
      
      // Skills always first
      const skillsData = results[0]?.data || [];
      for (const s of skillsData) {
        if (!skillMap.has(s.slug)) skillMap.set(s.slug, s);
      }

      let idx = 1;
      if (searchTables.includes("connectors") && results[idx]) {
        for (const c of results[idx].data || []) {
          if (!connectorMap.has(c.slug)) connectorMap.set(c.slug, c);
        }
        idx++;
      }
      if (searchTables.includes("plugins") && results[idx]) {
        for (const p of results[idx].data || []) {
          if (!pluginMap.has(p.slug)) pluginMap.set(p.slug, p);
        }
      }
    }

    // 4. Quality-weighted scoring (same approach as MCP solve_goal)
    const goalWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
    
    const scoredSkills = Array.from(skillMap.values()).map((s: any) => {
      let score = 0;
      const searchable = `${s.display_name} ${s.display_name_es || ""} ${s.tagline} ${s.tagline_es || ""} ${s.description_human} ${s.category}`.toLowerCase();
      
      // Goal word matches (high weight)
      for (const w of goalWords) { if (searchable.includes(w)) score += 3; }
      // AI keyword matches
      for (const kw of keywords) { if (searchable.includes(kw.toLowerCase())) score += 2; }
      // Capability matches
      for (const cap of capabilities) {
        const capWords = cap.toLowerCase().split(/\s+/);
        for (const cw of capWords) { if (searchable.includes(cw)) score += 1; }
      }
      // Category match from AI
      if (searchCategory && s.category === searchCategory) score += 4;
      // Quality signals
      const stars = s.github_stars || 0;
      if (stars > 10000) score += 5;
      else if (stars > 1000) score += 3;
      else if (stars > 100) score += 1;
      score += (s.trust_score || 0) / 20;
      score += (s.quality_score || 0) / 25;
      // Penalize stale
      if (s.is_stale) score -= 2;
      // Penalize low quality
      if (s.avg_rating < 3) score -= 3;
      
      return { ...s, relevance_score: score };
    });

    // Sort by relevance, then by quality signals
    scoredSkills.sort((a: any, b: any) => {
      const diff = b.relevance_score - a.relevance_score;
      if (Math.abs(diff) > 1) return diff;
      // Tiebreaker: trust score, then stars
      return (b.trust_score || 0) - (a.trust_score || 0) || (b.github_stars || 0) - (a.github_stars || 0);
    });

    // 5. Paginate
    const pageSize = 24;
    const pageNum = page ?? 0;
    const start = pageNum * pageSize;
    const paged = scoredSkills.slice(start, start + pageSize);

    // Build response with connectors/plugins if requested
    const response: any = {
      data: paged,
      count: scoredSkills.length,
      keywords,
      ai_category: aiCategory,
      mode: "semantic",
    };

    if (searchTables.includes("connectors")) {
      response.connectors = Array.from(connectorMap.values()).slice(0, 10);
    }
    if (searchTables.includes("plugins")) {
      response.plugins = Array.from(pluginMap.values()).slice(0, 10);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
