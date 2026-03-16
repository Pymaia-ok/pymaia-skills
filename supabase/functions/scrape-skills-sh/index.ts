// scrape-skills-sh — Import skills from skills.sh sitemap
// Modes: scrape | dedup | import | full (all 3 sequentially)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Category auto-detection keywords ───
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  desarrollo: ["code", "programming", "api", "sdk", "framework", "react", "vue", "angular", "python", "javascript", "typescript", "rust", "go", "compiler", "debug", "git", "cli", "terminal", "vscode", "lint", "test", "build", "webpack", "npm", "package"],
  ia: ["ai", "machine learning", "llm", "gpt", "claude", "model", "neural", "nlp", "embedding", "vector", "agent", "chatbot", "openai", "anthropic", "gemini"],
  automatizacion: ["automate", "workflow", "pipeline", "n8n", "zapier", "cron", "scheduler", "scraper", "bot", "ci", "cd", "deploy"],
  diseno: ["design", "ui", "ux", "figma", "css", "tailwind", "component", "layout", "animation", "font", "svg", "icon"],
  productividad: ["productivity", "todo", "notes", "calendar", "time", "organize", "template", "snippet", "notion", "obsidian"],
  datos: ["data", "database", "sql", "analytics", "visualization", "chart", "dashboard", "etl", "warehouse", "csv", "excel", "postgres", "mongo"],
  marketing: ["marketing", "seo", "content", "social media", "campaign", "email marketing", "copywriting", "ads", "branding"],
  creatividad: ["creative", "video", "audio", "music", "image", "photo", "3d", "animation", "render", "media"],
  legal: ["legal", "contract", "compliance", "gdpr", "privacy", "patent", "regulation"],
  negocios: ["business", "strategy", "pitch", "presentation", "consulting", "proposal"],
  finanzas: ["finance", "accounting", "invoice", "payment", "budget", "tax", "banking", "crypto"],
  ventas: ["sales", "crm", "lead", "prospect", "cold email", "outbound"],
  operaciones: ["devops", "infrastructure", "monitoring", "deployment", "docker", "kubernetes", "terraform", "aws", "azure", "cloud"],
  educacion: ["education", "learning", "tutorial", "course", "quiz", "teaching", "student"],
  producto: ["product", "feature", "roadmap", "spec", "requirement", "user story", "sprint", "agile"],
  ecommerce: ["ecommerce", "shop", "store", "cart", "checkout", "inventory", "shipping", "shopify"],
  soporte: ["support", "ticket", "helpdesk", "customer service", "faq"],
  salud: ["health", "medical", "clinical", "patient", "diagnosis", "wellness", "fitness"],
  rrhh: ["hr", "recruiting", "hiring", "onboarding", "payroll", "employee", "performance review"],
};

function detectCategory(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  let bestCategory = "desarrollo"; // default for code-related skills
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
}

// Reserved slugs that conflict with connectors or common words
const RESERVED_SLUGS = new Set([
  "slack", "github", "notion", "discord", "google", "aws", "azure", "stripe",
  "postgres", "redis", "docker", "kubernetes", "terraform", "vercel", "supabase",
  "linear", "jira", "asana", "trello", "figma", "canva", "shopify", "twilio",
  "sendgrid", "mailchimp", "hubspot", "salesforce", "datadog", "sentry",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "full"; // scrape | dedup | import | full
    const batchSize = body.batchSize || 5000;

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from("sync_log")
      .insert({ source: "skills.sh", status: "running" })
      .select("id")
      .single();
    const syncId = syncLog?.id;

    const startTime = Date.now();
    let result: any = {};

    if (mode === "scrape" || mode === "full") {
      result.scrape = await scrapeFromSitemap(supabase, batchSize);
    }
    if (mode === "dedup" || mode === "full") {
      result.dedup = await runDedup(supabase, body.dedupBatch || 2000);
    }
    if (mode === "import" || mode === "full") {
      result.import = await runImport(supabase, body.importBatch || 5000);
    }

    // Update sync log
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    if (syncId) {
      await supabase.from("sync_log").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_scraped: result.scrape?.inserted || 0,
        new_count: result.dedup?.newCount || 0,
        duplicate_count: result.dedup?.duplicateCount || 0,
        imported_count: result.import?.imported || 0,
        error_count: (result.scrape?.errors || 0) + (result.import?.errors || 0),
        duration_seconds: durationSeconds,
      }).eq("id", syncId);
    }

    return new Response(JSON.stringify({ mode, ...result, durationSeconds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-skills-sh error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── STEP 1: Scrape from sitemap.xml ───
async function scrapeFromSitemap(supabase: any, maxEntries: number) {
  console.log("[scrape] Fetching skills.sh sitemap...");

  // Try sitemap.xml first, fallback to sitemap-skills.xml, then API
  let sitemapText: string | null = null;
  for (const url of [
    "https://skills.sh/sitemap.xml",
    "https://skills.sh/sitemap-skills.xml",
    "https://skills.sh/sitemap-0.xml",
  ]) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "pymaia-skills-bot/1.0" } });
      if (res.ok) {
        sitemapText = await res.text();
        console.log(`[scrape] Loaded sitemap from ${url} (${sitemapText.length} chars)`);
        break;
      }
      await res.text().catch(() => {}); // consume body
      console.warn(`[scrape] ${url} returned ${res.status}`);
    } catch (e) {
      console.warn(`[scrape] Failed to fetch ${url}: ${(e as Error).message}`);
    }
  }

  if (!sitemapText) throw new Error("All sitemap URLs failed — skills.sh may be down or restructured");

  const sitemapText = await sitemapRes.text();

  // Parse URLs from sitemap XML
  // Format: <loc>https://skills.sh/{owner}/{repo}/{skill}</loc>
  const urlRegex = /https:\/\/skills\.sh\/([^<\s]+)/g;
  const allUrls: string[] = [];
  let match;
  while ((match = urlRegex.exec(sitemapText)) !== null) {
    allUrls.push(match[1]);
  }

  console.log(`[scrape] Found ${allUrls.length} total URLs in sitemap`);

  // Filter to skill URLs (3 segments: owner/repo/skill)
  const skillEntries: Array<{ owner: string; repo: string; skill: string; sourceSlug: string }> = [];
  for (const path of allUrls) {
    const parts = path.replace(/\/$/, "").split("/");
    if (parts.length === 3) {
      const [owner, repo, skill] = parts;
      // Skip non-skill paths
      if (["trending", "hot", "new", "search", "about", "api"].includes(owner)) continue;
      skillEntries.push({
        owner,
        repo,
        skill,
        sourceSlug: `${owner}/${repo}/${skill}`,
      });
    }
  }

  console.log(`[scrape] ${skillEntries.length} skill entries parsed`);

  // Insert into staging in batches (skip existing via unique index)
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const entriesToProcess = skillEntries.slice(0, maxEntries);

  for (let i = 0; i < entriesToProcess.length; i += 500) {
    const batch = entriesToProcess.slice(i, i + 500).map((e) => ({
      source: "skills.sh",
      source_slug: e.sourceSlug,
      name: e.skill.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      repo_url: `https://github.com/${e.owner}/${e.repo}`,
      repo_owner: e.owner,
      repo_name: e.repo,
      skill_folder: e.skill,
      install_command: `npx skills add ${e.owner}/${e.repo} --skill ${e.skill}`,
      description: "",
      dedup_status: "pending",
      import_status: "pending",
    }));

    const { error, count } = await supabase
      .from("skills_import_staging")
      .upsert(batch, { onConflict: "source,source_slug", ignoreDuplicates: true, count: "exact" });

    if (error) {
      console.error(`[scrape] Batch upsert error:`, error.message);
      errors++;
    } else {
      inserted += count || 0;
      skipped += batch.length - (count || 0);
    }
  }

  console.log(`[scrape] Inserted ${inserted}, skipped ${skipped}, errors ${errors}`);
  return { total: entriesToProcess.length, inserted, skipped, errors };
}

// ─── STEP 2: Dedup against existing skills ───
async function runDedup(supabase: any, batchSize: number) {
  console.log("[dedup] Starting deduplication...");

  // Get pending staging entries
  const { data: pending } = await supabase
    .from("skills_import_staging")
    .select("id, name, repo_url, repo_owner, repo_name, skill_folder, install_command")
    .eq("dedup_status", "pending")
    .limit(batchSize);

  if (!pending || pending.length === 0) {
    return { processed: 0, newCount: 0, duplicateCount: 0 };
  }

  // Load existing skills for comparison (slugs, github_urls, install_commands)
  const { data: existingSlugs } = await supabase
    .from("skills")
    .select("slug, github_url, install_command, display_name")
    .eq("status", "approved")
    .limit(50000);

  const slugSet = new Set((existingSlugs || []).map((s: any) => s.slug));
  const urlSet = new Set((existingSlugs || []).map((s: any) => s.github_url?.toLowerCase()).filter(Boolean));
  const cmdSet = new Set((existingSlugs || []).map((s: any) => s.install_command?.toLowerCase()).filter(Boolean));
  const nameMap = new Map<string, string>();
  for (const s of existingSlugs || []) {
    nameMap.set(s.display_name?.toLowerCase().replace(/-/g, " ") || "", s.slug);
  }

  let newCount = 0;
  let duplicateCount = 0;
  const updates: any[] = [];

  for (const entry of pending) {
    let isDuplicate = false;
    let matchedSlug = "";
    let reason = "";

    // Check 1: Same repo URL + skill folder match in slug
    const repoUrl = entry.repo_url?.toLowerCase();
    if (repoUrl && urlSet.has(repoUrl)) {
      // Check if the slug contains the skill_folder
      const matchingSlug = (existingSlugs || []).find((s: any) =>
        s.github_url?.toLowerCase() === repoUrl &&
        (s.slug.includes(entry.skill_folder) || s.display_name?.toLowerCase().includes(entry.skill_folder.replace(/-/g, " ")))
      );
      if (matchingSlug) {
        isDuplicate = true;
        matchedSlug = matchingSlug.slug;
        reason = "repo_url+skill_folder";
      }
    }

    // Check 2: Same install command
    if (!isDuplicate && entry.install_command && cmdSet.has(entry.install_command.toLowerCase())) {
      isDuplicate = true;
      reason = "install_command";
    }

    // Check 3: Normalized name match (same org + similar name)
    if (!isDuplicate) {
      const normalizedName = entry.name?.toLowerCase().replace(/-/g, " ");
      if (normalizedName && nameMap.has(normalizedName)) {
        const existingSlug = nameMap.get(normalizedName)!;
        // Verify same org
        const existingSkill = (existingSlugs || []).find((s: any) => s.slug === existingSlug);
        if (existingSkill?.github_url?.toLowerCase().includes(entry.repo_owner.toLowerCase())) {
          isDuplicate = true;
          matchedSlug = existingSlug;
          reason = "name+org";
        }
      }
    }

    // Check 4: Slug already exists
    if (!isDuplicate) {
      const candidateSlug = slugify(entry.skill_folder);
      const prefixedSlug = `${slugify(entry.repo_owner)}-${slugify(entry.repo_name)}-${slugify(entry.skill_folder)}`;
      if (slugSet.has(candidateSlug) || slugSet.has(prefixedSlug)) {
        isDuplicate = true;
        reason = "slug_exists";
        matchedSlug = slugSet.has(candidateSlug) ? candidateSlug : prefixedSlug;
      }
    }

    updates.push({
      id: entry.id,
      dedup_status: isDuplicate ? "duplicate" : "new",
      matched_existing_slug: isDuplicate ? matchedSlug : null,
      dedup_reason: isDuplicate ? reason : null,
    });

    if (isDuplicate) duplicateCount++;
    else newCount++;
  }

  // Batch update dedup results
  for (let i = 0; i < updates.length; i += 500) {
    const batch = updates.slice(i, i + 500);
    for (const u of batch) {
      await supabase.from("skills_import_staging").update({
        dedup_status: u.dedup_status,
        matched_existing_slug: u.matched_existing_slug,
        dedup_reason: u.dedup_reason,
      }).eq("id", u.id);
    }
  }

  console.log(`[dedup] Processed ${pending.length}: ${newCount} new, ${duplicateCount} duplicate`);
  return { processed: pending.length, newCount, duplicateCount };
}

// ─── STEP 3: Import new skills ───
async function runImport(supabase: any, batchSize: number) {
  console.log("[import] Starting import...");

  const { data: toImport } = await supabase
    .from("skills_import_staging")
    .select("*")
    .eq("dedup_status", "new")
    .eq("import_status", "pending")
    .limit(batchSize);

  if (!toImport || toImport.length === 0) {
    return { imported: 0, skipped: 0, errors: 0 };
  }

  // Load existing slugs to prevent collisions
  const { data: existingSlugsData } = await supabase
    .from("skills")
    .select("slug")
    .limit(100000);
  const existingSlugs = new Set((existingSlugsData || []).map((s: any) => s.slug));

  // Load connector slugs for reserved word check
  const { data: connectorSlugs } = await supabase
    .from("mcp_servers")
    .select("slug")
    .limit(10000);
  const connectorSlugSet = new Set((connectorSlugs || []).map((s: any) => s.slug));

  let imported = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < toImport.length; i += 200) {
    const batch = toImport.slice(i, i + 200);
    const skillRows: any[] = [];
    const stagingUpdates: string[] = [];

    for (const entry of batch) {
      try {
        // Generate slug
        let slug = slugify(entry.skill_folder);

        // Use prefixed slug if it's a reserved/common word or already exists
        if (RESERVED_SLUGS.has(slug) || connectorSlugSet.has(slug) || existingSlugs.has(slug)) {
          slug = `${slugify(entry.repo_owner)}-${slugify(entry.repo_name)}-${slugify(entry.skill_folder)}`;
        }

        // Final collision check
        if (existingSlugs.has(slug)) {
          slug = `${slugify(entry.repo_owner)}-${slug}-${Date.now().toString(36).slice(-4)}`;
        }

        if (existingSlugs.has(slug)) {
          skipped++;
          continue;
        }

        const category = entry.category || detectCategory(entry.name, entry.description || "");
        const displayName = entry.name || entry.skill_folder.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

        skillRows.push({
          slug,
          display_name: displayName,
          description_human: entry.description || `${displayName} — AI agent skill from ${entry.repo_owner}/${entry.repo_name}`,
          tagline: `${displayName} skill for AI agents`,
          category,
          github_url: entry.repo_url,
          install_command: entry.install_command || "",
          status: "approved",
          install_count: 0,
          install_count_source: "imported",
          install_count_verified: false,
          skill_md_status: "pending",
          is_public: true,
          github_stars: 0,
          avg_rating: 0,
          review_count: 0,
          time_to_install_minutes: 1,
          pricing_model: "free",
          industry: [],
          target_roles: [],
          use_cases: [],
        });

        existingSlugs.add(slug); // Prevent in-batch collisions
        stagingUpdates.push(entry.id);
      } catch (e) {
        console.error(`Import error for ${entry.source_slug}:`, (e as Error).message);
        errors++;
      }
    }

    // Bulk insert skills
    if (skillRows.length > 0) {
      const { error } = await supabase.from("skills").insert(skillRows);
      if (error) {
        console.error(`[import] Batch insert error:`, error.message);
        errors += skillRows.length;
      } else {
        imported += skillRows.length;
        // Mark staging as imported
        for (const id of stagingUpdates) {
          await supabase.from("skills_import_staging").update({
            import_status: "imported",
            imported_at: new Date().toISOString(),
          }).eq("id", id);
        }
      }
    }
  }

  console.log(`[import] Imported ${imported}, skipped ${skipped}, errors ${errors}`);
  return { imported, skipped, errors };
}
