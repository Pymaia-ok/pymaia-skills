import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedSkill {
  name: string;
  owner: string;
  repo: string;
  installCount: number;
  stars: number;
  description: string;
  source: string;
}

// ─── HELPERS ───

function inferCategory(name: string, desc: string): string {
  const text = `${name} ${desc}`.toLowerCase();

  // 1. Legal — very specific domain
  if (text.match(/\b(legal|lawyer|law\b|contract|compliance|regulat|gdpr|hipaa|attorney|litigation|arbitrat)/)) return "legal";

  // 2. Marketing — broad but specific keywords
  if (text.match(/\b(marketing|seo\b|sem\b|adwords|analytics|campaign|newsletter|email.?market|social.?media|brand|copywriting|advertising|ads\b|hubspot|mailchimp|google.?ads)/)) return "marketing";

  // 3. Design — visual/UI tools
  if (text.match(/\b(design|figma|sketch|adobe|photoshop|illustrat|canva|ui.?kit|ux\b|wireframe|prototype|color.?palette|typography|tailwind|css|style|layout|responsive)/)) return "diseño";

  // 4. Data — analytics, databases, data processing
  if (text.match(/\b(database|sql\b|postgres|mysql|mongo|redis|elasticsearch|bigquery|snowflake|data.?warehouse|etl\b|csv|excel|xlsx|parquet|arrow|tableau|power.?bi|grafana|analytics|metric|dashboard|chart|visualiz|pandas|dataframe|dbt\b|pipeline)/)) return "datos";

  // 5. Automation — workflow, scraping, integration
  if (text.match(/\b(automat|workflow|zapier|n8n|scrape|crawl|puppeteer|playwright|selenium|cron|schedul|webhook|integration|connect|sync\b|orchestrat|pipeline|trigger|batch|queue|worker)/)) return "automatización";

  // 6. Creativity — media creation
  if (text.match(/\b(video|audio|music|sound|animation|3d\b|render|image.?gen|dall.?e|stable.?diffus|midjourney|creative|art\b|photo|camera|podcast|stream|youtube|tiktok|instagram)/)) return "creatividad";

  // 7. Productivity — communication, docs, organization
  if (text.match(/\b(slack|discord|teams|notion|obsidian|roam|todoist|trello|jira|asana|linear|calendar|email|gmail|outlook|pdf\b|document|note|wiki|knowledge.?base|bookmark|clipboard|translat|meeting|zoom|organiz)/)) return "productividad";

  // 8. Business — finance, sales, strategy
  if (text.match(/\b(business|finance|invoice|payment|stripe|paypal|shopify|e.?commerce|sales|crm|salesforce|pitch|investor|startup|revenue|pricing|accounting|tax\b|budget|forecast|report)/)) return "negocios";

  // 9. Development — code, devtools, infrastructure
  if (text.match(/\b(github|gitlab|bitbucket|docker|kubernetes|aws\b|azure|gcp\b|terraform|ci.?cd|deploy|server|api\b|rest\b|graphql|grpc|typescript|javascript|python|rust|golang|node|npm|package|lint|test|debug|compiler|ide\b|vscode|terminal|shell|bash|git\b|commit|pull.?request|code.?review|webpack|vite\b|build|infra)/)) return "desarrollo";

  // 10. AI — only if nothing more specific matched above
  if (text.match(/\b(ai\b|artificial.?intellig|llm|language.?model|gpt|claude|gemini|openai|anthropic|embedding|vector|rag\b|retriev|chat.?bot|conversati|prompt|fine.?tun|train|inference|neural|transformer|token|context.?window|agent|copilot|assistant)/)) return "ia";

  // Default: check if it mentions "mcp" or "server" generically — likely a dev tool
  if (text.match(/\b(mcp|server|tool|plugin|extension)/)) return "desarrollo";

  return "desarrollo";
}

function inferRoles(name: string, desc: string, category: string): string[] {
  const text = `${name} ${desc}`.toLowerCase();
  const roles: string[] = [];

  // Category-based defaults
  if (category === "marketing") roles.push("marketer");
  if (category === "legal") roles.push("abogado");
  if (category === "diseño") roles.push("disenador");
  if (category === "negocios") roles.push("founder");
  if (category === "datos") roles.push("consultor");
  if (category === "desarrollo" || category === "ia") roles.push("developer");

  // Keyword-based additions
  if (text.match(/\b(market|seo|content|copy|social|brand|campaign)/)) roles.push("marketer");
  if (text.match(/\b(legal|contract|compliance|law\b)/)) roles.push("abogado");
  if (text.match(/\b(consult|strateg|proposal|research|analys)/)) roles.push("consultor");
  if (text.match(/\b(startup|product|pitch|founder|mvp|business)/)) roles.push("founder");
  if (text.match(/\b(design|ui|ux|figma|css|frontend)/)) roles.push("disenador");

  // Deduplicate
  const unique = [...new Set(roles)];
  return unique.length > 0 ? unique : ["otro"];
}

function slugFromName(raw: string): string {
  return raw.replace(/\.md$/, "").replace(/\s+/g, "-").toLowerCase();
}

// ─── Firecrawl crawl helper (async with polling) ───

async function firecrawlCrawl(url: string, opts: Record<string, unknown>): Promise<any[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) return [];

  const crawlRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
    method: "POST",
    headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, ...opts }),
  });

  if (!crawlRes.ok) {
    console.error(`[firecrawl] Crawl start failed: ${crawlRes.status}`);
    return [];
  }

  const crawlData = await crawlRes.json();
  const crawlId = crawlData?.id;
  if (!crawlId) { console.error("[firecrawl] No crawl ID"); return []; }

  console.log(`[firecrawl] Crawl started id=${crawlId}, polling...`);
  const allPages: any[] = [];
  const maxPolls = 15;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
      headers: { "Authorization": `Bearer ${firecrawlKey}` },
    });
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    console.log(`[firecrawl] Poll ${i + 1}: status=${statusData.status}, ${statusData.completed}/${statusData.total}`);

    if (statusData.data && Array.isArray(statusData.data)) {
      allPages.push(...statusData.data);
    }
    if (statusData.status === "completed") break;
  }

  return allPages;
}

// ─── SOURCE 1: skillsmp.com ───

async function fetchSkillsMP(query: string): Promise<ParsedSkill[]> {
  const apiKey = Deno.env.get("SKILLSMP_API_KEY");
  if (!apiKey) return [];

  console.log(`[skillsmp] Fetching query="${query}"...`);
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();
  let page = 1;
  const maxPages = 100;

  while (page <= maxPages) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const url = `https://skillsmp.com/api/v1/skills/search?q=${encodeURIComponent(query)}&page=${page}&limit=100&sortBy=stars`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${apiKey}`, "User-Agent": "SkillStoreBot/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) { if (res.status === 429 || res.status === 401) break; break; }
      const json = await res.json();
      const items = json?.data?.skills || json?.skills || json?.data || [];
      if (!items || items.length === 0) break;

      for (const item of items) {
        const rawName = item.name || item.skillName || item.slug || "";
        if (!rawName) continue;
        const name = slugFromName(rawName);
        const owner = item.owner || item.author || item.repoOwner || "";
        const repo = item.repo || item.repoName || "";
        const key = `${owner}/${repo}/${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        skills.push({ name, owner, repo, installCount: item.stars || item.downloads || 0, stars: item.stars || 0, description: item.description || "", source: "skillsmp.com" });
      }
      if (items.length < 100) break;
      page++;
    } catch (e) { console.error(`[skillsmp] Error page=${page}:`, (e as Error).message); break; }
  }
  console.log(`[skillsmp] "${query}": ${skills.length} skills`);
  return skills;
}

// ─── SOURCE 1b: skillsmp-bigrams ───

async function fetchSkillsMPBigrams(prefix: string): Promise<ParsedSkill[]> {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const allSkills: ParsedSkill[] = [];
  const seen = new Set<string>();
  for (const ch of alphabet) {
    const skills = await fetchSkillsMP(`${prefix}${ch}`);
    for (const s of skills) {
      const key = `${s.owner}/${s.repo}/${s.name}`;
      if (!seen.has(key)) { seen.add(key); allSkills.push(s); }
    }
  }
  console.log(`[skillsmp-bigrams] "${prefix}": ${allSkills.length} unique`);
  return allSkills;
}

// ─── SOURCE 2: skills.sh — Firecrawl map (legacy) ───

async function fetchSkillsSh(letter: string): Promise<ParsedSkill[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) return [];
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://skills.sh", search: letter, limit: 5000, includeSubdomains: false }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (mapRes.ok) {
      const mapJson = await mapRes.json();
      for (const link of (mapJson?.links || [])) {
        const match = link.match(/skills\.sh\/([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
        if (!match) continue;
        const [, owner, repo, name] = match;
        if (["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner)) continue;
        const key = `${owner}/${repo}/${name}`;
        if (!seen.has(key)) { seen.add(key); skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "skills.sh" }); }
      }
    }
  } catch (e) { console.error("[skillssh] Error:", (e as Error).message); }
  console.log(`[skillssh] "${letter}": ${skills.length} skills`);
  return skills;
}

// ─── SOURCE 2b: skills.sh — Firecrawl crawl ───

async function fetchSkillsShCrawl(): Promise<ParsedSkill[]> {
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();
  const pages = await firecrawlCrawl("https://skills.sh", {
    limit: 1000,
    includePaths: ["/*/*/*"],
    excludePaths: ["/api/*", "/_next/*", "/agents/*", "/trending", "/hot", "/new", "/categories/*"],
    scrapeOptions: { formats: ["links"] },
  });

  for (const page of pages) {
    const urls = [page?.metadata?.sourceURL || "", ...(page.links || [])];
    for (const u of urls) {
      const match = u.match(/skills\.sh\/([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
      if (!match) continue;
      const [, owner, repo, name] = match;
      if (["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner)) continue;
      const key = `${owner}/${repo}/${name}`;
      if (!seen.has(key)) { seen.add(key); skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "skills.sh" }); }
    }
  }
  console.log(`[skillssh-crawl] Total: ${skills.length}`);
  return skills;
}

// ─── SOURCE 3: claude-plugins.dev — map (legacy) ───

async function fetchClaudePlugins(letter: string): Promise<ParsedSkill[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) return [];
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://claude-plugins.dev/skills", search: letter, limit: 5000, includeSubdomains: false }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (mapRes.ok) {
      const mapJson = await mapRes.json();
      for (const link of (mapJson?.links || [])) {
        const match = link.match(/(?:skills\/)?\@([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
        if (!match) continue;
        const [, owner, repo, name] = match;
        const key = `${owner}/${repo}/${name}`;
        if (!seen.has(key)) { seen.add(key); skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" }); }
      }
    }
  } catch (e) { console.error("[claudeplugins] Error:", (e as Error).message); }
  console.log(`[claudeplugins] "${letter}": ${skills.length}`);
  return skills;
}

// ─── SOURCE 3b: claude-plugins.dev — crawl ───

async function fetchClaudePluginsCrawl(): Promise<ParsedSkill[]> {
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();
  const pages = await firecrawlCrawl("https://claude-plugins.dev/skills", {
    limit: 1000,
    includePaths: ["/skills/@*"],
    scrapeOptions: { formats: ["links"] },
  });

  for (const page of pages) {
    const urls = [page?.metadata?.sourceURL || "", ...(page.links || [])];
    for (const u of urls) {
      const match = u.match(/(?:skills\/)?\@([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
      if (!match) continue;
      const [, owner, repo, name] = match;
      const key = `${owner}/${repo}/${name}`;
      if (!seen.has(key)) { seen.add(key); skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" }); }
    }
  }
  console.log(`[claudeplugins-crawl] Total: ${skills.length}`);
  return skills;
}

// ─── SOURCE 4: GitHub Search API ───

async function fetchGitHubSearch(topic: string): Promise<ParsedSkill[]> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) { console.log("[github-search] No GITHUB_TOKEN, skipping"); return []; }

  console.log(`[github-search] Searching topic="${topic}"...`);
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();
  const perPage = 100;
  const maxPages = 10; // 1000 results max per topic

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;
      const res = await fetch(url, {
        headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json", "User-Agent": "SkillStoreBot/1.0" },
      });

      if (res.status === 403 || res.status === 422) {
        console.log(`[github-search] Rate limited or error at page ${page}`);
        break;
      }
      if (!res.ok) { console.error(`[github-search] HTTP ${res.status}`); break; }

      const json = await res.json();
      const items = json?.items || [];
      if (items.length === 0) break;

      for (const item of items) {
        const owner = item.owner?.login || "";
        const repo = item.name || "";
        if (!owner || !repo) continue;

        const key = `${owner}/${repo}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Try to extract individual skill names from topics
        const name = slugFromName(repo);
        skills.push({
          name,
          owner,
          repo,
          installCount: item.stargazers_count || 0,
          stars: item.stargazers_count || 0,
          description: item.description || "",
          source: "github",
        });
      }

      if (items.length < perPage) break;

      // Respect GitHub rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`[github-search] Error page=${page}:`, (e as Error).message);
      break;
    }
  }

  console.log(`[github-search] topic="${topic}": ${skills.length} repos`);
  return skills;
}

// ─── SOURCE 5: GitHub Enrich — update existing skills with GitHub metadata ───

async function githubEnrich(supabase: ReturnType<typeof createClient>, batchSize: number): Promise<{ enriched: number }> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) { console.log("[github-enrich] No GITHUB_TOKEN"); return { enriched: 0 }; }

  // Find skills with github_url but missing/generic/short description or no github_stars
  const { data: skills, error } = await supabase
    .from("skills")
    .select("id, slug, github_url, description_human, tagline, install_count, github_stars")
    .not("github_url", "is", null)
    .or("description_human.ilike.%ecosistema open-source%,github_stars.eq.0,tagline.ilike.%skill del ecosistema%")
    .limit(batchSize);

  if (error || !skills || skills.length === 0) {
    console.log(`[github-enrich] No skills to enrich (${error?.message || "0 found"})`);
    return { enriched: 0 };
  }

  console.log(`[github-enrich] Enriching ${skills.length} skills...`);
  let enriched = 0;

  for (const skill of skills) {
    try {
      // Extract owner/repo from github_url
      const match = skill.github_url?.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/);
      if (!match) continue;
      const [, owner, repo] = match;

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json", "User-Agent": "SkillStoreBot/1.0" },
      });

      if (res.status === 403) { console.log("[github-enrich] Rate limited, stopping"); break; }
      if (!res.ok) continue;

      const repoData = await res.json();
      const updates: Record<string, unknown> = {};

      // Use GitHub description as fallback for generic, short, or residue descriptions
      const descLen = (skill.description_human || "").length;
      const isGenericDesc = !skill.description_human
        || skill.description_human.includes("ecosistema open-source")
        || descLen < 40
        || /^[|>!\-\s]{1,3}$/.test(skill.description_human.trim());
      const isGenericTagline = !skill.tagline
        || skill.tagline.includes("Skill del ecosistema")
        || (skill.tagline || "").length < 10;

      if (repoData.description && isGenericDesc) {
        updates.description_human = repoData.description;
      }
      if (repoData.description && isGenericTagline) {
        updates.tagline = repoData.description;
      }
      if (repoData.stargazers_count > 0) {
        updates.github_stars = repoData.stargazers_count;
      }
      // Infer category from topics
      if (repoData.topics && repoData.topics.length > 0) {
        const topicStr = repoData.topics.join(" ");
        updates.category = inferCategory(skill.slug, topicStr);
        updates.target_roles = inferRoles(skill.slug, topicStr, updates.category as string);
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase.from("skills").update(updates).eq("id", skill.id);
        if (!updateErr) enriched++;
      }

      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`[github-enrich] Error for ${skill.slug}:`, (e as Error).message);
    }
  }

  console.log(`[github-enrich] Enriched ${enriched}/${skills.length}`);
  return { enriched };
}

// ─── SOURCE 6: Smithery.ai crawl ───

async function fetchSmitheryCrawl(): Promise<ParsedSkill[]> {
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY not set");

  // Use map (fast sitemap) instead of crawl to avoid timeouts
  console.log("[smithery] Using map to discover URLs...");
  const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
    method: "POST",
    headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://smithery.ai/servers", limit: 5000, includeSubdomains: false }),
  });
  const mapData = await mapRes.json();
  const links: string[] = mapData?.links || [];
  console.log(`[smithery] Map returned ${links.length} URLs`);

  const parseSmitheryUrl = (url: string) => {
    const m1 = url.match(/smithery\.ai\/servers\/([^\/\s?#]+)\/([^\/\s?#]+)/);
    if (m1) return { owner: m1[1], repo: m1[2], key: `${m1[1]}/${m1[2]}` };
    const m2 = url.match(/smithery\.ai\/servers\/([^\/\s?#]+)/);
    if (m2 && !["new", "search", "trending", "popular", "featured", "categories"].includes(m2[1])) return { owner: m2[1], repo: m2[1], key: m2[1] };
    return null;
  };

  for (const link of links) {
    const p = parseSmitheryUrl(link);
    if (!p || seen.has(p.key)) continue;
    seen.add(p.key);
    skills.push({ name: slugFromName(p.repo), owner: p.owner, repo: p.repo, installCount: 0, stars: 0, description: "", source: "smithery.ai" });
  }

  console.log(`[smithery] Total: ${skills.length}`);
  return skills;
}

// ─── SOURCE 7: mcp.so crawl ───

async function fetchMcpSoCrawl(): Promise<ParsedSkill[]> {
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  console.log("[mcp.so] Starting crawl...");
  const pages = await firecrawlCrawl("https://mcp.so", {
    limit: 100,
    includePaths: ["/server/*"],
    excludePaths: ["/blog/*", "/docs/*"],
    scrapeOptions: { formats: ["markdown", "links"] },
  });

  for (const page of pages) {
    const pageUrl = page?.metadata?.sourceURL || "";
    // mcp.so URLs: /server/slug-name
    const match = pageUrl.match(/mcp\.so\/server\/([^\/\s?#]+)/);
    if (match) {
      const slug = match[1];
      const name = slugFromName(slug);
      if (!seen.has(name)) {
        seen.add(name);
        const desc = (page.markdown || "").slice(0, 200).replace(/[#\n]/g, " ").trim();
        // Try to extract github link from page
        let ghOwner = "", ghRepo = "";
        const ghMatch = (page.markdown || "").match(/github\.com\/([^\/\s]+)\/([^\/\s?#"]+)/);
        if (ghMatch) { ghOwner = ghMatch[1]; ghRepo = ghMatch[2]; }
        skills.push({ name, owner: ghOwner, repo: ghRepo || name, installCount: 0, stars: 0, description: desc, source: "mcp.so" });
      }
    }

    for (const link of (page.links || [])) {
      const m = link.match(/mcp\.so\/server\/([^\/\s?#]+)/);
      if (!m) continue;
      const n = slugFromName(m[1]);
      if (!seen.has(n)) { seen.add(n); skills.push({ name: n, owner: "", repo: n, installCount: 0, stars: 0, description: "", source: "mcp.so" }); }
    }
  }

  console.log(`[mcp.so] Total: ${skills.length}`);
  return skills;
}

// ─── SOURCE 8: Glama.ai crawl ───

async function fetchGlamaCrawl(): Promise<ParsedSkill[]> {
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  console.log("[glama] Starting crawl...");
  const pages = await firecrawlCrawl("https://glama.ai/mcp/servers", {
    limit: 100,
    includePaths: ["/mcp/servers/*"],
    excludePaths: ["/blog/*", "/docs/*", "/auth/*"],
    scrapeOptions: { formats: ["markdown", "links"] },
  });

  for (const page of pages) {
    const pageUrl = page?.metadata?.sourceURL || "";
    // Glama URLs: /mcp/servers/slug
    const match = pageUrl.match(/glama\.ai\/mcp\/servers\/([^\/\s?#]+)/);
    if (match) {
      const slug = match[1];
      const name = slugFromName(slug);
      if (!seen.has(name)) {
        seen.add(name);
        const desc = (page.markdown || "").slice(0, 200).replace(/[#\n]/g, " ").trim();
        let ghOwner = "", ghRepo = "";
        const ghMatch = (page.markdown || "").match(/github\.com\/([^\/\s]+)\/([^\/\s?#"]+)/);
        if (ghMatch) { ghOwner = ghMatch[1]; ghRepo = ghMatch[2]; }
        skills.push({ name, owner: ghOwner, repo: ghRepo || name, installCount: 0, stars: 0, description: desc, source: "glama.ai" });
      }
    }

    for (const link of (page.links || [])) {
      const m = link.match(/glama\.ai\/mcp\/servers\/([^\/\s?#]+)/);
      if (!m) continue;
      const n = slugFromName(m[1]);
      if (!seen.has(n)) { seen.add(n); skills.push({ name: n, owner: "", repo: n, installCount: 0, stars: 0, description: "", source: "glama.ai" }); }
    }
  }

  console.log(`[glama] Total: ${skills.length}`);
  return skills;
}

// ─── SOURCE 9: PulseMCP.com crawl ───

async function fetchPulseMCPCrawl(): Promise<ParsedSkill[]> {
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  console.log("[pulsemcp] Starting crawl...");
  const pages = await firecrawlCrawl("https://pulsemcp.com", {
    limit: 100,
    includePaths: ["/servers/*"],
    excludePaths: ["/blog/*", "/docs/*", "/auth/*"],
    scrapeOptions: { formats: ["markdown", "links"] },
  });

  for (const page of pages) {
    const pageUrl = page?.metadata?.sourceURL || "";
    const match = pageUrl.match(/pulsemcp\.com\/servers\/([^\/\s?#]+)/);
    if (match) {
      const slug = match[1];
      const name = slugFromName(slug);
      if (!seen.has(name)) {
        seen.add(name);
        const desc = (page.markdown || "").slice(0, 200).replace(/[#\n]/g, " ").trim();
        let ghOwner = "", ghRepo = "";
        const ghMatch = (page.markdown || "").match(/github\.com\/([^\/\s]+)\/([^\/\s?#"]+)/);
        if (ghMatch) { ghOwner = ghMatch[1]; ghRepo = ghMatch[2]; }
        skills.push({ name, owner: ghOwner, repo: ghRepo || name, installCount: 0, stars: 0, description: desc, source: "pulsemcp.com" });
      }
    }

    for (const link of (page.links || [])) {
      const m = link.match(/pulsemcp\.com\/servers\/([^\/\s?#]+)/);
      if (!m) continue;
      const n = slugFromName(m[1]);
      if (!seen.has(n)) { seen.add(n); skills.push({ name: n, owner: "", repo: n, installCount: 0, stars: 0, description: "", source: "pulsemcp.com" }); }
    }
  }

  console.log(`[pulsemcp] Total: ${skills.length}`);
  return skills;
}

// ─── SOURCE 10: Awesome Lists — scrape README.md for repo links ───

async function fetchAwesomeLists(): Promise<ParsedSkill[]> {
  const token = Deno.env.get("GITHUB_TOKEN");
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  const repos = [
    "punkpeye/awesome-mcp-servers",
    "wong2/awesome-mcp-servers",
    "appcypher/awesome-mcp-servers",
    "VoltAgent/awesome-agent-skills",
    "travisvn/awesome-claude-skills",
  ];

  for (const repoPath of repos) {
    try {
      console.log(`[awesome] Fetching ${repoPath}...`);
      const headers: Record<string, string> = { "Accept": "application/vnd.github.v3.raw", "User-Agent": "SkillStoreBot/1.0" };
      if (token) headers["Authorization"] = `token ${token}`;

      const res = await fetch(`https://api.github.com/repos/${repoPath}/readme`, { headers });
      if (!res.ok) { console.log(`[awesome] ${repoPath} → ${res.status}`); continue; }

      const readme = await res.text();
      // Extract all github.com repo links from README
      const ghRegex = /github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/g;
      let m;
      while ((m = ghRegex.exec(readme)) !== null) {
        const [, owner, repo] = m;
        // Skip known non-skill repos
        if (["topics", "search", "settings", "notifications", "pulls", "issues", "marketplace"].includes(repo)) continue;
        if (owner === repoPath.split("/")[0] && repo === repoPath.split("/")[1]) continue; // skip self

        const key = `${owner}/${repo}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const name = slugFromName(repo);
        skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "awesome-list" });
      }

      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`[awesome] Error ${repoPath}:`, (e as Error).message);
    }
  }

  console.log(`[awesome] Total: ${skills.length} unique repos from awesome lists`);
  return skills;
}

// ─── UPSERT LOGIC ───

async function upsertSkills(supabase: ReturnType<typeof createClient>, discovered: ParsedSkill[], insertOffset: number, maxInsert: number) {
  // Deduplicate by name, prefer higher installCount
  const merged = new Map<string, ParsedSkill>();
  for (const skill of discovered) {
    const existing = merged.get(skill.name);
    if (!existing || skill.installCount > existing.installCount) {
      if (existing?.description && !skill.description) skill.description = existing.description;
      merged.set(skill.name, skill);
    } else if (existing && skill.description && !existing.description) {
      existing.description = skill.description;
    }
  }
  const allSkills = Array.from(merged.values());
  console.log(`Discovered ${discovered.length} → deduplicated ${allSkills.length}`);

  // Also deduplicate by github_url
  const byGithub = new Map<string, ParsedSkill>();
  for (const s of allSkills) {
    if (s.owner && s.repo) {
      const ghKey = `${s.owner}/${s.repo}`.toLowerCase();
      if (!byGithub.has(ghKey) || s.installCount > (byGithub.get(ghKey)?.installCount || 0)) {
        byGithub.set(ghKey, s);
      }
    }
  }

  // Get ALL existing slugs and github_urls from DB
  const existingSlugs = new Set<string>();
  const existingGithubUrls = new Set<string>();
  let dbOffset = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from("skills").select("slug, github_url").range(dbOffset, dbOffset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const s of data) {
      existingSlugs.add(s.slug);
      if (s.github_url) {
        const m = s.github_url.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/);
        if (m) existingGithubUrls.add(`${m[1]}/${m[2]}`.toLowerCase());
      }
    }
    if (data.length < pageSize) break;
    dbOffset += pageSize;
  }
  console.log(`Existing: ${existingSlugs.size} slugs, ${existingGithubUrls.size} github URLs`);

  // Filter new skills (not existing by slug or github URL)
  const newSkills = allSkills.filter(s => {
    if (existingSlugs.has(s.name)) return false;
    if (s.owner && s.repo) {
      const ghKey = `${s.owner}/${s.repo}`.toLowerCase();
      if (existingGithubUrls.has(ghKey)) return false;
    }
    return true;
  });
  console.log(`New skills to add: ${newSkills.length} (offset=${insertOffset}, max=${maxInsert})`);

  const toAdd = newSkills.slice(insertOffset, insertOffset + maxInsert);
  let added = 0;

  for (let i = 0; i < toAdd.length; i += 100) {
    const chunk = toAdd.slice(i, i + 100).map(ns => {
      const displayName = ns.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const description = ns.description || `${displayName} — Agent Skill del ecosistema open-source.`;
      const category = inferCategory(ns.name, description);
      const targetRoles = inferRoles(ns.name, description, category);
      return {
        slug: ns.name,
        display_name: displayName,
        tagline: ns.description || `Skill del ecosistema: ${displayName}`,
        description_human: description,
        install_command: ns.owner && ns.repo
          ? `npx skills add https://github.com/${ns.owner}/${ns.repo} --skill ${ns.name}`
          : `npx skills add ${ns.name}`,
        github_url: ns.owner && ns.repo ? `https://github.com/${ns.owner}/${ns.repo}` : null,
        github_stars: ns.stars,
        install_count: 0,
        status: "approved",
        industry: ["tecnologia"],
        target_roles: targetRoles,
        time_to_install_minutes: 2,
        category,
      };
    });

    const { error } = await supabase.from("skills").insert(chunk);
    if (!error) added += chunk.length;
    else console.error(`Insert error (batch ${i}):`, error.message);
  }

  // Update existing with better data
  let updated = 0;
  for (const skill of allSkills) {
    if (!existingSlugs.has(skill.name)) continue;
    if (skill.installCount <= 0 && !skill.description) continue;
    const updates: Record<string, unknown> = {};
    if (skill.installCount > 0) updates.install_count = skill.installCount;
    if (skill.description) updates.description_human = skill.description;
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("skills").update(updates).eq("slug", skill.name);
      if (!error) updated++;
    }
  }

  return { allSkills, existingSlugs, newSkills, toAdd, added, updated };
}

// ─── MAIN HANDLER ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let requestedSource = "all";
    let letter = "";
    let insertOffset = 0;
    let maxInsert = 2000;
    let topic = "";
    let batchSize = 50;

    try {
      const body = await req.json();
      requestedSource = body?.source || "all";
      letter = body?.letter || "";
      insertOffset = body?.offset || 0;
      maxInsert = body?.maxInsert || 2000;
      topic = body?.topic || "";
      batchSize = body?.batchSize || 50;
    } catch { /* no body */ }

    console.log(`Sync: source=${requestedSource}, letter="${letter}", topic="${topic}", offset=${insertOffset}, maxInsert=${maxInsert}`);

    // ─── Recategorize: re-apply inferCategory in batches ───
    if (requestedSource === "recategorize") {
      const pageSize = batchSize || 200;
      const { data: batch } = await supabase
        .from("skills")
        .select("id, slug, display_name, tagline, description_human, category, target_roles")
        .eq("status", "approved")
        .range(insertOffset, insertOffset + pageSize - 1);

      if (!batch || batch.length === 0) {
        return new Response(JSON.stringify({ success: true, source: "recategorize", updated: 0, message: "No more skills to process" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Group updates by new category to batch them
      const updatesByCategory: Record<string, { ids: string[]; roles: string[] }[]> = {};
      let changed = 0;

      for (const skill of batch) {
        const newCat = inferCategory(skill.slug, `${skill.display_name} ${skill.tagline} ${skill.description_human}`);
        const newRoles = inferRoles(skill.slug, `${skill.display_name} ${skill.tagline} ${skill.description_human}`, newCat);
        if (newCat !== skill.category) {
          await supabase.from("skills").update({ category: newCat, target_roles: newRoles }).eq("id", skill.id);
          changed++;
        }
      }

      return new Response(JSON.stringify({
        success: true, source: "recategorize", processed: batch.length, changed,
        nextOffset: insertOffset + batch.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GitHub Enrich (special: doesn't go through upsert) ───
    if (requestedSource === "github-enrich") {
      const result = await githubEnrich(supabase, batchSize);
      return new Response(JSON.stringify({ success: true, source: "github-enrich", ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const needsLetter = ["skillsmp", "skillssh", "claudeplugins", "skillsmp-bigrams"].includes(requestedSource);
    if (needsLetter && !letter) {
      return new Response(JSON.stringify({ success: false, error: "Parameter 'letter' is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let discovered: ParsedSkill[] = [];

    switch (requestedSource) {
      case "skillsmp": discovered = await fetchSkillsMP(letter); break;
      case "skillsmp-bigrams": discovered = await fetchSkillsMPBigrams(letter); break;
      case "skillssh": discovered = await fetchSkillsSh(letter); break;
      case "skillssh-crawl": discovered = await fetchSkillsShCrawl(); break;
      case "claudeplugins": discovered = await fetchClaudePlugins(letter); break;
      case "claudeplugins-crawl": discovered = await fetchClaudePluginsCrawl(); break;
      case "github-search": {
        const topics = topic ? [topic] : ["mcp-server", "claude-skill", "agent-skill", "mcp", "model-context-protocol"];
        for (const t of topics) {
          const results = await fetchGitHubSearch(t);
          discovered.push(...results);
        }
        break;
      }
      case "smithery-crawl": discovered = await fetchSmitheryCrawl(); break;
      case "mcpso-crawl": discovered = await fetchMcpSoCrawl(); break;
      case "glama-crawl": discovered = await fetchGlamaCrawl(); break;
      case "pulsemcp-crawl": discovered = await fetchPulseMCPCrawl(); break;
      case "awesome-lists": discovered = await fetchAwesomeLists(); break;
      case "all": {
        const [a, b, c] = await Promise.all([
          fetchSkillsMP("a").catch(() => [] as ParsedSkill[]),
          fetchSkillsSh("").catch(() => [] as ParsedSkill[]),
          fetchClaudePlugins("").catch(() => [] as ParsedSkill[]),
        ]);
        discovered = [...a, ...b, ...c];
        break;
      }
      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown source: ${requestedSource}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const result = await upsertSkills(supabase, discovered, insertOffset, maxInsert);

    const summary = {
      success: true,
      source: requestedSource,
      letter,
      topic,
      discovered: discovered.length,
      deduplicated: result.allSkills.length,
      existingInDB: result.existingSlugs.size,
      newFound: result.newSkills.length,
      added: result.added,
      updated: result.updated,
      remainingNew: Math.max(0, result.newSkills.length - insertOffset - maxInsert),
      nextOffset: insertOffset + result.toAdd.length,
      timestamp: new Date().toISOString(),
    };

    console.log("Sync complete:", JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
