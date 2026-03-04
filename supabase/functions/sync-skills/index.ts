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

function parseInstallCount(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  const m = cleaned.match(/^([\d.]+)\s*([KkMm]?)$/);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  const suffix = m[2].toUpperCase();
  if (suffix === "K") return Math.round(num * 1000);
  if (suffix === "M") return Math.round(num * 1000000);
  return Math.round(num);
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

function inferRoles(name: string, desc: string, category: string): string[] {
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

// ─── SOURCE 1: skillsmp.com (paginated API — 17K+ skills) ───

async function fetchSkillsMP(): Promise<ParsedSkill[]> {
  const apiKey = Deno.env.get("SKILLSMP_API_KEY");
  if (!apiKey) {
    console.log("[skillsmp.com] No API key, skipping");
    return [];
  }

  console.log("[skillsmp.com] Fetching ALL skills via paginated API...");
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  // Use fewer queries with limited pages to stay within edge function timeout
  const queries = ["agent", "skill", "design", "marketing", "automation"];

  for (const query of queries) {
    let page = 1;
    const maxPages = 2; // 2 pages * 100 = 200 per query

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
          if (res.status === 401) { console.error("[skillsmp.com] Invalid API key"); return skills; }
          if (res.status === 429) { console.log("[skillsmp.com] Rate limited, stopping"); return skills; }
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

        // If less than 100 results, no more pages
        if (items.length < 100) break;
        page++;
      } catch (e) {
        console.error(`[skillsmp.com] Error q="${query}" p=${page}:`, (e as Error).message);
        break;
      }
    }

    // Log progress every few queries
    if (skills.length % 500 < 100) {
      console.log(`[skillsmp.com] Progress: ${skills.length} skills after query "${query}"`);
    }
  }

  console.log(`[skillsmp.com] Total: ${skills.length} skills`);
  return skills;
}

// ─── SOURCE 2: skills.sh (via Firecrawl map — fast URL discovery) ───

async function fetchSkillsShFirecrawl(): Promise<ParsedSkill[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    console.log("[skills.sh] No Firecrawl key, falling back to HTML scrape");
    return fetchSkillsShHTML();
  }

  console.log("[skills.sh] Mapping site via Firecrawl...");
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
        limit: 5000,
        includeSubdomains: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (mapRes.ok) {
      const mapJson = await mapRes.json();
      const allLinks = mapJson?.links || [];
      console.log(`[skills.sh] Map found ${allLinks.length} URLs`);

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
      console.error(`[skills.sh] Firecrawl map returned ${mapRes.status}`);
      return fetchSkillsShHTML();
    }
  } catch (e) {
    console.error("[skills.sh] Map error:", (e as Error).message);
    return fetchSkillsShHTML();
  }

  console.log(`[skills.sh] Total: ${skills.length} skills`);
  return skills.length > 0 ? skills : fetchSkillsShHTML();
}

// Fallback: raw HTML scrape for skills.sh
async function fetchSkillsShHTML(): Promise<ParsedSkill[]> {
  console.log("[skills.sh] Fetching via HTML scrape (fallback)...");
  const res = await fetch("https://skills.sh/", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)", Accept: "text/html" },
  });
  const html = await res.text();
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  const hrefRegex = /href="\/([^\/\s"]+)\/([^\/\s"]+)\/([^\/\s"]+)"/g;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const [, owner, repo, name] = match;
    if (["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner) || name.includes(".") || owner.startsWith("_")) continue;
    const key = `${owner}/${repo}/${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "skills.sh" });
  }

  console.log(`[skills.sh] HTML fallback: ${skills.length} skills`);
  return skills;
}

// ─── SOURCE 3: claude-plugins.dev (via Firecrawl) ───

async function fetchClaudePlugins(): Promise<ParsedSkill[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    console.log("[claude-plugins.dev] No Firecrawl key, falling back to HTML");
    return fetchClaudePluginsHTML();
  }

  console.log("[claude-plugins.dev] Fetching via Firecrawl...");
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  // Map the site first to find all skill URLs
  try {
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://claude-plugins.dev/skills",
        search: "skills",
        limit: 5000,
        includeSubdomains: false,
      }),
    });

    if (mapRes.ok) {
      const mapJson = await mapRes.json();
      const allLinks = mapJson?.links || [];
      console.log(`[claude-plugins.dev] Map found ${allLinks.length} URLs`);

      for (const link of allLinks) {
        // Pattern: /skills/@owner/repo/skill-name or /@owner/repo/skill-name
        const match = link.match(/(?:skills\/)?\@([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
        if (!match) continue;
        const [, owner, repo, name] = match;

        const key = `${owner}/${repo}/${name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" });
      }
    }
  } catch (e) {
    console.error("[claude-plugins.dev] Map error:", (e as Error).message);
  }

  // Also scrape the main skills page
  try {
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://claude-plugins.dev/skills",
        formats: ["markdown", "links"],
        waitFor: 3000,
      }),
    });

    if (scrapeRes.ok) {
      const json = await scrapeRes.json();
      const links = json?.data?.links || json?.links || [];

      for (const link of links) {
        const match = link.match(/(?:skills\/)?\@([^\/]+)\/([^\/]+)\/([^\/\s?#]+)/);
        if (!match) continue;
        const [, owner, repo, name] = match;

        const key = `${owner}/${repo}/${name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" });
      }
    }
  } catch (e) {
    console.error("[claude-plugins.dev] Scrape error:", (e as Error).message);
  }

  console.log(`[claude-plugins.dev] Total: ${skills.length} skills`);
  return skills.length > 0 ? skills : fetchClaudePluginsHTML();
}

// Fallback HTML scrape
async function fetchClaudePluginsHTML(): Promise<ParsedSkill[]> {
  console.log("[claude-plugins.dev] HTML fallback...");
  const res = await fetch("https://claude-plugins.dev/skills", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)", Accept: "text/html" },
  });
  const html = await res.text();
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  const hrefRegex = /href="(?:https:\/\/claude-plugins\.dev)?\/skills\/@([^/]+)\/([^/]+)\/([^"]+)"/g;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const [, owner, repo, name] = match;
    const key = `${owner}/${repo}/${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" });
  }

  console.log(`[claude-plugins.dev] HTML fallback: ${skills.length} skills`);
  return skills;
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

    // Accept optional source parameter to sync one source at a time (avoids timeout)
    let requestedSource = "all";
    try {
      const body = await req.json();
      requestedSource = body?.source || "all";
    } catch { /* no body = sync all */ }

    console.log(`Syncing source: ${requestedSource}`);

    let skillsMPData: ParsedSkill[] = [];
    let skillsShData: ParsedSkill[] = [];
    let claudePluginsData: ParsedSkill[] = [];

    if (requestedSource === "all" || requestedSource === "skillsmp") {
      skillsMPData = await fetchSkillsMP().catch(e => { console.error("[skillsmp.com] Error:", e.message); return [] as ParsedSkill[]; });
    }
    if (requestedSource === "all" || requestedSource === "skillssh") {
      skillsShData = await fetchSkillsShFirecrawl().catch(e => { console.error("[skills.sh] Error:", e.message); return [] as ParsedSkill[]; });
    }
    if (requestedSource === "all" || requestedSource === "claudeplugins") {
      claudePluginsData = await fetchClaudePlugins().catch(e => { console.error("[claude-plugins.dev] Error:", e.message); return [] as ParsedSkill[]; });
    }

    console.log(`Sources: skillsmp.com=${skillsMPData.length}, skills.sh=${skillsShData.length}, claude-plugins.dev=${claudePluginsData.length}`);

    // Merge: deduplicate by skill name, prefer highest install count
    const merged = new Map<string, ParsedSkill>();

    for (const skill of [...skillsMPData, ...skillsShData, ...claudePluginsData]) {
      const existing = merged.get(skill.name);
      if (!existing || skill.installCount > existing.installCount) {
        if (existing?.description && !skill.description) {
          skill.description = existing.description;
        }
        merged.set(skill.name, skill);
      } else if (existing && skill.description && !existing.description) {
        existing.description = skill.description;
      }
    }

    const allSkills = Array.from(merged.values());
    console.log(`Merged unique skills: ${allSkills.length}`);

    // Get ALL existing skills from DB (paginate past 1000 row limit)
    let existingSkills: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error: fetchError } = await supabase
        .from("skills")
        .select("id, slug, install_count, display_name, description_human")
        .range(offset, offset + pageSize - 1);
      if (fetchError) throw fetchError;
      if (!data || data.length === 0) break;
      existingSkills = existingSkills.concat(data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }
    console.log(`Existing skills in DB: ${existingSkills.length}`);

    const existingBySlug = new Map(existingSkills.map((s: any) => [s.slug, s]));

    let updated = 0;
    let added = 0;
    const updateDetails: string[] = [];

    // Update existing skills
    for (const ls of allSkills) {
      const existing = existingBySlug.get(ls.name);
      if (!existing) continue;

      const updates: any = {};
      if (ls.installCount > 0 && ls.installCount > existing.install_count) {
        updates.install_count = ls.installCount;
      }
      if (ls.description && ls.description.length > (existing.description_human?.length || 0)) {
        updates.description_human = ls.description;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("skills").update(updates).eq("id", existing.id);
        if (!error) {
          updated++;
          if (updates.install_count) updateDetails.push(`${ls.name}: ${existing.install_count}→${updates.install_count}`);
        }
      }
    }

    // Discover ALL new skills — no threshold
    const newSkills = allSkills.filter(ls => !existingBySlug.has(ls.name));

    // Add in batches — keep small to avoid timeout
    const toAdd = newSkills.slice(0, 500);

    // Bulk insert in chunks of 50
    for (let i = 0; i < toAdd.length; i += 50) {
      const chunk = toAdd.slice(i, i + 50).map(ns => {
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

      const { error, data } = await supabase.from("skills").insert(chunk);
      if (!error) added += chunk.length;
      else console.error(`Bulk insert error (batch ${i}):`, error.message);
    }

    const summary = {
      success: true,
      sources: {
        "skillsmp.com": skillsMPData.length,
        "skills.sh": skillsShData.length,
        "claude-plugins.dev": claudePluginsData.length,
      },
      mergedUnique: allSkills.length,
      existingInDB: existingSkills?.length || 0,
      updated,
      updateDetails: updateDetails.slice(0, 20),
      added,
      remainingCandidates: newSkills.length - toAdd.length,
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
