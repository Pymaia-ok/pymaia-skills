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

// ─── SOURCE 1: skillsmp.com — deep paginated API by query ───

async function fetchSkillsMP(query: string): Promise<ParsedSkill[]> {
  const apiKey = Deno.env.get("SKILLSMP_API_KEY");
  if (!apiKey) {
    console.log("[skillsmp] No API key, skipping");
    return [];
  }

  console.log(`[skillsmp] Fetching skills for query "${query}"...`);
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();
  const maxPages = 100;

  let page = 1;
  while (page <= maxPages) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const url = `https://skillsmp.com/api/v1/skills/search?q=${encodeURIComponent(query)}&page=${page}&limit=100&sortBy=stars`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 401) { console.error("[skillsmp] Invalid API key"); return skills; }
        if (res.status === 429) { console.log("[skillsmp] Rate limited, stopping"); return skills; }
        console.log(`[skillsmp] HTTP ${res.status} at page ${page}, stopping`);
        break;
      }

      const json = await res.json();
      const items = json?.data?.skills || json?.skills || json?.data || [];
      if (!items || items.length === 0) break;

      for (const item of items) {
        const rawName = item.name || item.skillName || item.slug || "";
        if (!rawName) continue;
        const name = rawName.replace(/\.md$/, "").replace(/\s+/g, "-").toLowerCase();
        const owner = item.owner || item.author || item.repoOwner || "";
        const repo = item.repo || item.repoName || "";

        const key = `${owner}/${repo}/${name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        skills.push({
          name, owner, repo,
          installCount: item.stars || item.downloads || 0,
          stars: item.stars || 0,
          description: item.description || "",
          source: "skillsmp.com",
        });
      }

      if (items.length < 100) break;
      page++;
    } catch (e) {
      console.error(`[skillsmp] Error query="${query}" page=${page}:`, (e as Error).message);
      break;
    }
  }

  console.log(`[skillsmp] Query "${query}": ${skills.length} skills, ${page} pages`);
  return skills;
}

// ─── SOURCE 1b: skillsmp-bigrams — runs 26 bigram queries for a given prefix ───

async function fetchSkillsMPBigrams(prefix: string): Promise<ParsedSkill[]> {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const allSkills: ParsedSkill[] = [];
  const seen = new Set<string>();

  for (const ch of alphabet) {
    const bigram = `${prefix}${ch}`;
    console.log(`[skillsmp-bigrams] Running bigram "${bigram}"...`);
    const skills = await fetchSkillsMP(bigram);
    for (const s of skills) {
      const key = `${s.owner}/${s.repo}/${s.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        allSkills.push(s);
      }
    }
  }

  console.log(`[skillsmp-bigrams] Prefix "${prefix}": ${allSkills.length} unique skills from 26 bigrams`);
  return allSkills;
}

// ─── SOURCE 2: skills.sh — Firecrawl crawl (async) ───

async function fetchSkillsShCrawl(): Promise<ParsedSkill[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    console.log("[skillssh-crawl] No Firecrawl key, skipping");
    return [];
  }

  console.log("[skillssh-crawl] Starting crawl of skills.sh...");
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  try {
    // Start crawl
    const crawlRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://skills.sh",
        limit: 1000,
        includePaths: ["/*/*/*"],
        excludePaths: ["/api/*", "/_next/*", "/agents/*", "/trending", "/hot", "/new", "/categories/*"],
        scrapeOptions: { formats: ["links"] },
      }),
    });

    if (!crawlRes.ok) {
      console.error(`[skillssh-crawl] Crawl start failed: ${crawlRes.status}`);
      return [];
    }

    const crawlData = await crawlRes.json();
    const crawlId = crawlData?.id;
    if (!crawlId) {
      console.error("[skillssh-crawl] No crawl ID returned");
      return [];
    }

    console.log(`[skillssh-crawl] Crawl started, id=${crawlId}. Polling...`);

    // Poll for results (max ~50s to stay within edge function timeout)
    const maxPolls = 10;
    const pollInterval = 5000;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, pollInterval));

      const statusRes = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
        headers: { "Authorization": `Bearer ${firecrawlKey}` },
      });

      if (!statusRes.ok) {
        console.error(`[skillssh-crawl] Poll failed: ${statusRes.status}`);
        continue;
      }

      const statusData = await statusRes.json();
      console.log(`[skillssh-crawl] Poll ${i + 1}: status=${statusData.status}, completed=${statusData.completed}/${statusData.total}`);

      // Extract URLs from completed pages
      if (statusData.data && Array.isArray(statusData.data)) {
        for (const page of statusData.data) {
          const pageUrl = page?.metadata?.sourceURL || "";
          const match = pageUrl.match(/skills\.sh\/([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
          if (!match) continue;
          const [, owner, repo, name] = match;
          if (["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner)) continue;

          const key = `${owner}/${repo}/${name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "skills.sh" });

          // Also extract links from page content
          if (page.links && Array.isArray(page.links)) {
            for (const link of page.links) {
              const m = link.match(/skills\.sh\/([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
              if (!m) continue;
              const [, o, r, n] = m;
              if (["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(o)) continue;
              const k = `${o}/${r}/${n}`;
              if (seen.has(k)) continue;
              seen.add(k);
              skills.push({ name: n, owner: o, repo: r, installCount: 0, stars: 0, description: "", source: "skills.sh" });
            }
          }
        }
      }

      if (statusData.status === "completed") {
        console.log("[skillssh-crawl] Crawl completed");
        break;
      }
    }
  } catch (e) {
    console.error("[skillssh-crawl] Error:", (e as Error).message);
  }

  console.log(`[skillssh-crawl] Total: ${skills.length} skills`);
  return skills;
}

// ─── SOURCE 2 (legacy): skills.sh — Firecrawl map ───

async function fetchSkillsSh(letter: string): Promise<ParsedSkill[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    console.log("[skillssh] No Firecrawl key, skipping");
    return [];
  }

  console.log(`[skillssh] Mapping with search="${letter}"...`);
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://skills.sh",
        search: letter,
        limit: 5000,
        includeSubdomains: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (mapRes.ok) {
      const mapJson = await mapRes.json();
      const allLinks = mapJson?.links || [];
      console.log(`[skillssh] Map returned ${allLinks.length} URLs`);

      for (const link of allLinks) {
        const match = link.match(/skills\.sh\/([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
        if (!match) continue;
        const [, owner, repo, name] = match;
        if (["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner)) continue;

        const key = `${owner}/${repo}/${name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "skills.sh" });
      }
    } else {
      console.error(`[skillssh] Firecrawl map returned ${mapRes.status}`);
    }
  } catch (e) {
    console.error("[skillssh] Map error:", (e as Error).message);
  }

  console.log(`[skillssh] Letter "${letter}": ${skills.length} skills`);
  return skills;
}

// ─── SOURCE 3: claude-plugins.dev — Firecrawl crawl (async) ───

async function fetchClaudePluginsCrawl(): Promise<ParsedSkill[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    console.log("[claudeplugins-crawl] No Firecrawl key, skipping");
    return [];
  }

  console.log("[claudeplugins-crawl] Starting crawl of claude-plugins.dev...");
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  try {
    const crawlRes = await fetch("https://api.firecrawl.dev/v1/crawl", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://claude-plugins.dev/skills",
        limit: 1000,
        includePaths: ["/skills/@*"],
        scrapeOptions: { formats: ["links"] },
      }),
    });

    if (!crawlRes.ok) {
      console.error(`[claudeplugins-crawl] Crawl start failed: ${crawlRes.status}`);
      return [];
    }

    const crawlData = await crawlRes.json();
    const crawlId = crawlData?.id;
    if (!crawlId) {
      console.error("[claudeplugins-crawl] No crawl ID returned");
      return [];
    }

    console.log(`[claudeplugins-crawl] Crawl started, id=${crawlId}. Polling...`);

    const maxPolls = 10;
    const pollInterval = 5000;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, pollInterval));

      const statusRes = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
        headers: { "Authorization": `Bearer ${firecrawlKey}` },
      });

      if (!statusRes.ok) {
        console.error(`[claudeplugins-crawl] Poll failed: ${statusRes.status}`);
        continue;
      }

      const statusData = await statusRes.json();
      console.log(`[claudeplugins-crawl] Poll ${i + 1}: status=${statusData.status}, completed=${statusData.completed}/${statusData.total}`);

      if (statusData.data && Array.isArray(statusData.data)) {
        for (const page of statusData.data) {
          const pageUrl = page?.metadata?.sourceURL || "";
          const match = pageUrl.match(/(?:skills\/)?\@([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
          if (match) {
            const [, owner, repo, name] = match;
            const key = `${owner}/${repo}/${name}`;
            if (!seen.has(key)) {
              seen.add(key);
              skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" });
            }
          }

          if (page.links && Array.isArray(page.links)) {
            for (const link of page.links) {
              const m = link.match(/(?:skills\/)?\@([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
              if (!m) continue;
              const [, o, r, n] = m;
              const k = `${o}/${r}/${n}`;
              if (!seen.has(k)) {
                seen.add(k);
                skills.push({ name: n, owner: o, repo: r, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" });
              }
            }
          }
        }
      }

      if (statusData.status === "completed") {
        console.log("[claudeplugins-crawl] Crawl completed");
        break;
      }
    }
  } catch (e) {
    console.error("[claudeplugins-crawl] Error:", (e as Error).message);
  }

  console.log(`[claudeplugins-crawl] Total: ${skills.length} skills`);
  return skills;
}

// ─── SOURCE 3 (legacy): claude-plugins.dev — Firecrawl map ───

async function fetchClaudePlugins(letter: string): Promise<ParsedSkill[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    console.log("[claudeplugins] No Firecrawl key, skipping");
    return [];
  }

  console.log(`[claudeplugins] Mapping with search="${letter}"...`);
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://claude-plugins.dev/skills",
        search: letter,
        limit: 5000,
        includeSubdomains: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (mapRes.ok) {
      const mapJson = await mapRes.json();
      const allLinks = mapJson?.links || [];
      console.log(`[claudeplugins] Map returned ${allLinks.length} URLs`);

      for (const link of allLinks) {
        const match = link.match(/(?:skills\/)?\@([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
        if (!match) continue;
        const [, owner, repo, name] = match;

        const key = `${owner}/${repo}/${name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" });
      }
    } else {
      console.error(`[claudeplugins] Firecrawl map returned ${mapRes.status}`);
    }
  } catch (e) {
    console.error("[claudeplugins] Map error:", (e as Error).message);
  }

  console.log(`[claudeplugins] Letter "${letter}": ${skills.length} skills`);
  return skills;
}

// ─── UPSERT LOGIC ───

async function upsertSkills(supabase: ReturnType<typeof createClient>, discovered: ParsedSkill[], insertOffset: number, maxInsert: number) {
  // Deduplicate
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

  // Get ALL existing slugs from DB
  const existingSlugs = new Set<string>();
  let dbOffset = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from("skills").select("slug").range(dbOffset, dbOffset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const s of data) existingSlugs.add(s.slug);
    if (data.length < pageSize) break;
    dbOffset += pageSize;
  }
  console.log(`Existing slugs in DB: ${existingSlugs.size}`);

  const newSkills = allSkills.filter(s => !existingSlugs.has(s.name));
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
        install_command: `npx skills add https://github.com/${ns.owner}/${ns.repo} --skill ${ns.name}`,
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

    try {
      const body = await req.json();
      requestedSource = body?.source || "all";
      letter = body?.letter || "";
      insertOffset = body?.offset || 0;
      maxInsert = body?.maxInsert || 2000;
    } catch { /* no body */ }

    console.log(`Sync: source=${requestedSource}, letter="${letter}", offset=${insertOffset}, maxInsert=${maxInsert}`);

    const needsLetter = ["skillsmp", "skillssh", "claudeplugins", "skillsmp-bigrams"].includes(requestedSource);
    if (needsLetter && !letter) {
      return new Response(JSON.stringify({
        success: false,
        error: "Parameter 'letter' is required for this source."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let discovered: ParsedSkill[] = [];

    if (requestedSource === "skillsmp") {
      discovered = await fetchSkillsMP(letter);
    } else if (requestedSource === "skillsmp-bigrams") {
      discovered = await fetchSkillsMPBigrams(letter);
    } else if (requestedSource === "skillssh") {
      discovered = await fetchSkillsSh(letter);
    } else if (requestedSource === "skillssh-crawl") {
      discovered = await fetchSkillsShCrawl();
    } else if (requestedSource === "claudeplugins") {
      discovered = await fetchClaudePlugins(letter);
    } else if (requestedSource === "claudeplugins-crawl") {
      discovered = await fetchClaudePluginsCrawl();
    } else if (requestedSource === "all") {
      const [a, b, c] = await Promise.all([
        fetchSkillsMP("a").catch(() => [] as ParsedSkill[]),
        fetchSkillsSh("").catch(() => [] as ParsedSkill[]),
        fetchClaudePlugins("").catch(() => [] as ParsedSkill[]),
      ]);
      discovered = [...a, ...b, ...c];
    }

    const result = await upsertSkills(supabase, discovered, insertOffset, maxInsert);

    const summary = {
      success: true,
      source: requestedSource,
      letter,
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
