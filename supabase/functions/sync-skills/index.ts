import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParsedSkill {
  name: string;
  owner: string;
  repo: string;
  installCount: number;
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

async function fetchLeaderboard(): Promise<ParsedSkill[]> {
  const res = await fetch("https://skills.sh/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)",
      Accept: "text/html",
    },
  });
  const html = await res.text();
  console.log(`Fetched HTML: ${html.length} chars`);

  const skills: ParsedSkill[] = [];
  const seen = new Set<string>();

  // Each leaderboard entry is an <a> tag with href="/owner/repo/skill"
  // containing the skill name, repo info, and install count
  // We split by these anchor patterns and extract data from each block
  const entryRegex =
    /href="\/([^\/\s"]+)\/([^\/\s"]+)\/([^\/\s"]+)"[^>]*>[\s\S]*?<\/a>/g;

  let match;
  while ((match = entryRegex.exec(html)) !== null) {
    const [fullMatch, owner, repo, name] = match;

    // Skip non-skill paths
    if (
      ["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner) ||
      name.includes(".") ||
      owner.startsWith("_")
    ) continue;

    const key = `${owner}/${repo}/${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Extract install count: look for patterns like "390.9K" or "12,345"
    // within this anchor block
    let installCount = 0;
    const countPatterns = fullMatch.match(
      /(\d[\d,.]*[KkMm])<\/(?:span|div|p|td)/g
    );
    if (countPatterns) {
      // The last numeric match with K/M suffix is likely the install count
      // (first one is the ranking number)
      for (const cp of countPatterns) {
        const numStr = cp.replace(/<\/(?:span|div|p|td)/, "");
        if (numStr.match(/[KkMm]$/)) {
          installCount = parseInstallCount(numStr);
          break;
        }
      }
    }

    // If no K/M suffix found, try plain formatted numbers
    if (installCount === 0) {
      const plainCounts = fullMatch.match(
        />(\d{1,3}(?:,\d{3})+(?:\.\d+)?)<\/(?:span|div)/g
      );
      if (plainCounts) {
        for (const pc of plainCounts) {
          const numStr = pc.replace(/^>/, "").replace(/<\/(?:span|div)/, "");
          const val = parseInstallCount(numStr);
          if (val > 100) {
            // Skip small numbers (likely rankings)
            installCount = val;
            break;
          }
        }
      }
    }

    skills.push({ name, owner, repo, installCount });
  }

  // If the greedy </a> regex didn't work (minified HTML can be tricky),
  // try a different approach: find all skill hrefs and their nearby context
  if (skills.length === 0) {
    console.log("Fallback: scanning for skill hrefs individually");
    const hrefRegex = /href="\/([^\/\s"]+)\/([^\/\s"]+)\/([^\/\s"]+)"/g;
    while ((match = hrefRegex.exec(html)) !== null) {
      const [, owner, repo, name] = match;
      if (
        ["_next", "agents", "trending", "hot", "new", "categories", "api"].includes(owner) ||
        name.includes(".") || owner.startsWith("_")
      ) continue;

      const key = `${owner}/${repo}/${name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Look ahead ~1000 chars for install count before next href
      const ahead = html.substring(match.index, match.index + 1000);
      const nextHref = ahead.indexOf('href="/', 10);
      const block = nextHref > 0 ? ahead.substring(0, nextHref) : ahead;

      let installCount = 0;
      // Match "XXX.XK" pattern
      const kMatch = block.match(/>(\d[\d,.]*[KkMm])</);
      if (kMatch) {
        installCount = parseInstallCount(kMatch[1]);
      }

      skills.push({ name, owner, repo, installCount });
    }
  }

  return skills;
}

async function fetchSkillDescription(
  owner: string,
  repo: string,
  skillName: string
): Promise<string> {
  try {
    const url = `https://skills.sh/${owner}/${repo}/${skillName}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SkillStoreBot/1.0)" },
    });
    if (!res.ok) { await res.text(); return ""; }
    const html = await res.text();

    const metaMatch = html.match(/name="description"\s+content="([^"]+)"/i);
    if (metaMatch) return metaMatch[1];
    const ogMatch = html.match(/property="og:description"\s+content="([^"]+)"/i);
    if (ogMatch) return ogMatch[1];
    return "";
  } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting skills sync from skills.sh...");

    const leaderboardSkills = await fetchLeaderboard();
    console.log(`Parsed ${leaderboardSkills.length} skills`);

    // Log sample with install counts
    const withInstalls = leaderboardSkills.filter((s) => s.installCount > 0);
    console.log(`Skills with install counts: ${withInstalls.length}`);
    console.log(
      "Top 5:",
      JSON.stringify(
        leaderboardSkills
          .slice(0, 5)
          .map((s) => ({ n: s.name, i: s.installCount }))
      )
    );

    // Get existing skills
    const { data: existingSkills, error: fetchError } = await supabase
      .from("skills")
      .select("id, slug, install_count, display_name");
    if (fetchError) throw fetchError;

    const existingBySlug = new Map(
      (existingSkills || []).map((s: any) => [s.slug, s])
    );

    let updated = 0;
    let added = 0;
    const updateDetails: string[] = [];

    // Update install counts
    for (const ls of leaderboardSkills) {
      const existing = existingBySlug.get(ls.name);
      if (existing && ls.installCount > 0 && ls.installCount > existing.install_count) {
        const { error } = await supabase
          .from("skills")
          .update({ install_count: ls.installCount })
          .eq("id", existing.id);
        if (!error) {
          updated++;
          updateDetails.push(`${ls.name}: ${existing.install_count}→${ls.installCount}`);
        }
      }
    }

    // Discover new popular skills
    const newSkills = leaderboardSkills.filter(
      (ls) => !existingBySlug.has(ls.name) && ls.installCount >= 10000
    );
    const toAdd = newSkills.slice(0, 5);

    for (const ns of toAdd) {
      const description = await fetchSkillDescription(ns.owner, ns.repo, ns.name);
      const displayName = ns.name
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const { error } = await supabase.from("skills").insert({
        slug: ns.name,
        display_name: displayName,
        tagline: description || `Skill del ecosistema: ${displayName}`,
        description_human: description || `${displayName} — Agent Skill popular del ecosistema open-source.`,
        install_command: `npx skills add https://github.com/${ns.owner}/${ns.repo} --skill ${ns.name}`,
        github_url: `https://github.com/${ns.owner}/${ns.repo}`,
        install_count: ns.installCount,
        status: "approved",
        industry: ["tecnologia"],
        target_roles: ["otro"],
        time_to_install_minutes: 2,
      });

      if (!error) { added++; console.log(`Added: ${ns.name} (${ns.installCount})`); }
      else console.error(`Error adding ${ns.name}:`, error.message);
    }

    const summary = {
      success: true,
      parsed: leaderboardSkills.length,
      withInstallCounts: withInstalls.length,
      updated,
      updateDetails,
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
