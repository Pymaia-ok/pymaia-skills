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
  if (roles.length === 0) {
    if (category === "productividad" || category === "ia") roles.push("otro");
    else roles.push("otro");
  }
  return roles;
}

// ─── SOURCE 1: skills.sh ───

async function fetchSkillsSh(): Promise<ParsedSkill[]> {
  console.log("[skills.sh] Fetching leaderboard...");
  const res = await fetch("https://skills.sh/", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)", Accept: "text/html" },
  });
  const html = await res.text();
  console.log(`[skills.sh] HTML: ${html.length} chars`);

  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  // Try anchor-based extraction
  const entryRegex = /href="\/([^\/\s"]+)\/([^\/\s"]+)\/([^\/\s"]+)"[^>]*>[\s\S]*?<\/a>/g;
  let match;

  while ((match = entryRegex.exec(html)) !== null) {
    const [fullMatch, owner, repo, name] = match;
    if (["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner) || name.includes(".") || owner.startsWith("_")) continue;

    const key = `${owner}/${repo}/${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let installCount = 0;
    const countPatterns = fullMatch.match(/(\d[\d,.]*[KkMm])<\/(?:span|div|p|td)/g);
    if (countPatterns) {
      for (const cp of countPatterns) {
        const numStr = cp.replace(/<\/(?:span|div|p|td)/, "");
        if (numStr.match(/[KkMm]$/)) { installCount = parseInstallCount(numStr); break; }
      }
    }
    if (installCount === 0) {
      const plainCounts = fullMatch.match(/>(\d{1,3}(?:,\d{3})+(?:\.\d+)?)<\/(?:span|div)/g);
      if (plainCounts) {
        for (const pc of plainCounts) {
          const numStr = pc.replace(/^>/, "").replace(/<\/(?:span|div)/, "");
          const val = parseInstallCount(numStr);
          if (val > 100) { installCount = val; break; }
        }
      }
    }

    skills.push({ name, owner, repo, installCount, stars: 0, description: "", source: "skills.sh" });
  }

  // Fallback
  if (skills.length === 0) {
    const hrefRegex = /href="\/([^\/\s"]+)\/([^\/\s"]+)\/([^\/\s"]+)"/g;
    while ((match = hrefRegex.exec(html)) !== null) {
      const [, owner, repo, name] = match;
      if (["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner) || name.includes(".") || owner.startsWith("_")) continue;
      const key = `${owner}/${repo}/${name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let installCount = 0;
      const ahead = html.substring(match.index, match.index + 1000);
      const kMatch = ahead.match(/>(\d[\d,.]*[KkMm])</);
      if (kMatch) installCount = parseInstallCount(kMatch[1]);
      skills.push({ name, owner, repo, installCount, stars: 0, description: "", source: "skills.sh" });
    }
  }

  console.log(`[skills.sh] Parsed ${skills.length} skills`);
  return skills;
}

// ─── SOURCE 2: skillsmp.com (via API) ───

async function fetchSkillsMP(): Promise<ParsedSkill[]> {
  const apiKey = Deno.env.get("SKILLSMP_API_KEY");
  if (!apiKey) {
    console.log("[skillsmp.com] No API key configured, skipping");
    return [];
  }

  console.log("[skillsmp.com] Fetching via API...");
  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  // Search for skills across relevant categories (limited to avoid timeout)
  const queries = ["agent skills", "design", "automation", "productivity"];

  for (const query of queries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout per request

      const res = await fetch(
        `https://skillsmp.com/api/v1/skills/search?q=${encodeURIComponent(query)}&limit=50&sortBy=stars`,
        {
          headers: { "Authorization": `Bearer ${apiKey}`, "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)" },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text();
        console.log(`[skillsmp.com] API ${res.status} for "${query}": ${body.substring(0, 200)}`);
        if (res.status === 401) { console.error("[skillsmp.com] Invalid API key"); return skills; }
        continue;
      }

      const json = await res.json();
      const items = json?.data?.skills || json?.skills || json?.data || [];

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
    } catch (e) {
      console.error(`[skillsmp.com] Error for "${query}":`, (e as Error).message);
    }
  }

  console.log(`[skillsmp.com] Parsed ${skills.length} skills via API`);
  return skills;
}

// ─── SOURCE 3: claude-plugins.dev ───

async function fetchClaudePlugins(): Promise<ParsedSkill[]> {
  console.log("[claude-plugins.dev] Fetching skills...");
  const res = await fetch("https://claude-plugins.dev/skills", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)", Accept: "text/html" },
  });
  const html = await res.text();
  console.log(`[claude-plugins.dev] HTML: ${html.length} chars`);

  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  // Pattern from markdown: [skill-name\n@owner/repo\ndownloads\nstars\ndescription\nInstall](url)
  const entryRegex = /\[([\w-]+)\\\\\n\\\\\n@([^/]+)\/([^\\\n]+)\\\\\n\\\\\n([\d,.]+[KkMm]?)\\\\\n\\\\\n([\d,.]+[KkMm]?)\\\\\n\\\\\n([\s\S]*?)\\\\\n\\\\\nInstall\]/g;
  let match;

  while ((match = entryRegex.exec(html)) !== null) {
    const [, name, owner, repo, downloadsRaw, starsRaw, description] = match;
    const key = `${owner}/${repo}/${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const downloads = parseInstallCount(downloadsRaw);
    const stars = parseInstallCount(starsRaw);

    skills.push({
      name, owner, repo: repo.trim(),
      installCount: downloads,
      stars,
      description: description.replace(/\\/g, "").trim(),
      source: "claude-plugins.dev",
    });
  }

  // HTML fallback: look for skill card links
  if (skills.length === 0) {
    console.log("[claude-plugins.dev] Fallback: scanning href patterns");
    const hrefRegex = /href="(?:https:\/\/claude-plugins\.dev)?\/skills\/@([^/]+)\/([^/]+)\/([^"]+)"/g;
    while ((match = hrefRegex.exec(html)) !== null) {
      const [, owner, repo, name] = match;
      const key = `${owner}/${repo}/${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push({ name, owner, repo, installCount: 0, stars: 0, description: "", source: "claude-plugins.dev" });
    }
  }

  console.log(`[claude-plugins.dev] Parsed ${skills.length} skills`);
  return skills;
}

// ─── Fetch description from skills.sh detail page ───

async function fetchSkillDescription(owner: string, repo: string, skillName: string): Promise<string> {
  try {
    const url = `https://skills.sh/${owner}/${repo}/${skillName}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)" } });
    if (!res.ok) { await res.text(); return ""; }
    const html = await res.text();
    const metaMatch = html.match(/name="description"\s+content="([^"]+)"/i);
    if (metaMatch) return metaMatch[1];
    const ogMatch = html.match(/property="og:description"\s+content="([^"]+)"/i);
    if (ogMatch) return ogMatch[1];
    return "";
  } catch { return ""; }
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

    console.log("Starting multi-source skills sync...");

    // Fetch from all 3 sources in parallel
    const [skillsShData, skillsMPData, claudePluginsData] = await Promise.all([
      fetchSkillsSh().catch(e => { console.error("[skills.sh] Error:", e.message); return [] as ParsedSkill[]; }),
      fetchSkillsMP().catch(e => { console.error("[skillsmp.com] Error:", e.message); return [] as ParsedSkill[]; }),
      fetchClaudePlugins().catch(e => { console.error("[claude-plugins.dev] Error:", e.message); return [] as ParsedSkill[]; }),
    ]);

    console.log(`Sources: skills.sh=${skillsShData.length}, skillsmp.com=${skillsMPData.length}, claude-plugins.dev=${claudePluginsData.length}`);

    // Merge: deduplicate by skill name, prefer highest install count
    const merged = new Map<string, ParsedSkill>();

    for (const skill of [...skillsShData, ...skillsMPData, ...claudePluginsData]) {
      const existing = merged.get(skill.name);
      if (!existing || skill.installCount > existing.installCount) {
        // Keep the best description
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

    // Get existing skills from DB
    const { data: existingSkills, error: fetchError } = await supabase
      .from("skills")
      .select("id, slug, install_count, display_name, description_human");
    if (fetchError) throw fetchError;

    const existingBySlug = new Map((existingSkills || []).map((s: any) => [s.slug, s]));

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
      if (ls.description && ls.description.length > existing.description_human?.length) {
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

    // Discover all new skills — no threshold, import everything
    const newSkills = allSkills.filter(ls => !existingBySlug.has(ls.name));

    const toAdd = newSkills.slice(0, 100);

    for (const ns of toAdd) {
      let description = ns.description;
      if (!description && ns.source === "skills.sh") {
        description = await fetchSkillDescription(ns.owner, ns.repo, ns.name);
      }

      const displayName = ns.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const category = inferCategory(ns.name, description || "");
      const targetRoles = inferRoles(ns.name, description || "", category);

      const { error } = await supabase.from("skills").insert({
        slug: ns.name,
        display_name: displayName,
        tagline: description || `Skill del ecosistema: ${displayName}`,
        description_human: description || `${displayName} — Agent Skill popular del ecosistema open-source.`,
        install_command: ns.source === "claude-plugins.dev"
          ? `npx skills add https://github.com/${ns.owner}/${ns.repo} --skill ${ns.name}`
          : `npx skills add https://github.com/${ns.owner}/${ns.repo} --skill ${ns.name}`,
        github_url: `https://github.com/${ns.owner}/${ns.repo}`,
        install_count: ns.installCount,
        status: "approved",
        industry: ["tecnologia"],
        target_roles: targetRoles,
        time_to_install_minutes: 2,
        category,
      });

      if (!error) { added++; console.log(`Added [${ns.source}]: ${ns.name} (${ns.installCount})`); }
      else console.error(`Error adding ${ns.name}:`, error.message);
    }

    const summary = {
      success: true,
      sources: {
        "skills.sh": skillsShData.length,
        "skillsmp.com": skillsMPData.length,
        "claude-plugins.dev": claudePluginsData.length,
      },
      mergedUnique: allSkills.length,
      updated,
      updateDetails: updateDetails.slice(0, 20),
      added,
      newCandidates: newSkills.length,
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
