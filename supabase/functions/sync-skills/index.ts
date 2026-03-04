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
  if (text.match(/design|ui|ux|css|style|layout|figma/)) return "diseño";
  if (text.match(/market|seo|content|copy|social|brand/)) return "marketing";
  if (text.match(/automat|browser|scrape|crawl|workflow/)) return "automatización";
  if (text.match(/legal|contract|compliance|law/)) return "legal";
  if (text.match(/video|animation|creative|art|remotion/)) return "creatividad";
  if (text.match(/data|analyt|chart|csv|excel|xlsx/)) return "datos";
  if (text.match(/\bai\b|llm|agent|model|gpt|claude|prompt/)) return "ia";
  if (text.match(/pitch|business|presentation|pptx|slide/)) return "negocios";
  if (text.match(/productiv|brainstorm|organiz|todo|debug/)) return "productividad";
  if (text.match(/doc|pdf|word|docx|document/)) return "productividad";
  return "desarrollo";
}

function inferRoles(name: string, desc: string, _category: string): string[] {
  const text = `${name} ${desc}`.toLowerCase();
  const roles: string[] = [];
  if (text.match(/market|seo|content|copy|social|brand/)) roles.push("marketer");
  if (text.match(/legal|contract|compliance|law/)) roles.push("abogado");
  if (text.match(/consult|strateg|proposal|research/)) roles.push("consultor");
  if (text.match(/startup|product|pitch|founder|mvp/)) roles.push("founder");
  if (text.match(/design|ui|ux|figma|css|frontend/)) roles.push("disenador");
  if (roles.length === 0) roles.push("otro");
  return roles;
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

  // Find skills with github_url but missing description or low install_count
  const { data: skills, error } = await supabase
    .from("skills")
    .select("id, slug, github_url, description_human, install_count")
    .not("github_url", "is", null)
    .or("description_human.ilike.%ecosistema open-source%,install_count.eq.0")
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

      if (repoData.description && skill.description_human?.includes("ecosistema open-source")) {
        updates.description_human = repoData.description;
        updates.tagline = repoData.description;
      }
      if (repoData.stargazers_count > (skill.install_count || 0)) {
        updates.install_count = repoData.stargazers_count;
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

  console.log("[smithery] Starting crawl...");
  const pages = await firecrawlCrawl("https://smithery.ai", {
    limit: 100,
    includePaths: ["/server/*"],
    excludePaths: ["/docs/*", "/blog/*", "/auth/*"],
    scrapeOptions: { formats: ["markdown", "links"] },
  });

  for (const page of pages) {
    const pageUrl = page?.metadata?.sourceURL || "";
    // Smithery URLs: /server/@owner/repo-name
    const match = pageUrl.match(/smithery\.ai\/server\/@([^\/]+)\/([^\/\s?#]+)/);
    if (match) {
      const [, owner, repo] = match;
      const name = slugFromName(repo);
      const key = `${owner}/${repo}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Try to extract description from markdown
        const desc = (page.markdown || "").slice(0, 200).replace(/[#\n]/g, " ").trim();
        skills.push({ name, owner, repo, installCount: 0, stars: 0, description: desc, source: "smithery.ai" });
      }
    }

    // Also check links on each page
    for (const link of (page.links || [])) {
      const m = link.match(/smithery\.ai\/server\/@([^\/]+)\/([^\/\s?#]+)/);
      if (!m) continue;
      const [, o, r] = m;
      const k = `${o}/${r}`;
      if (!seen.has(k)) { seen.add(k); skills.push({ name: slugFromName(r), owner: o, repo: r, installCount: 0, stars: 0, description: "", source: "smithery.ai" }); }
    }
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
        install_count: ns.installCount,
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
