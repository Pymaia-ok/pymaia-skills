import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPO = "sickn33/antigravity-awesome-skills";
const INDEX_URL = `https://raw.githubusercontent.com/${REPO}/main/skills_index.json`;
const GITHUB_URL = `https://github.com/${REPO}`;

// Map Antigravity categories to Pymaia categories
const CATEGORY_MAP: Record<string, string> = {
  "architecture": "desarrollo",
  "business": "negocios",
  "data-ai": "ia",
  "data & ai": "ia",
  "development": "desarrollo",
  "general": "productividad",
  "infrastructure": "operaciones",
  "security": "desarrollo",
  "testing": "desarrollo",
  "workflow": "automatización",
  "creative": "creatividad",
  "design": "diseño",
  "marketing": "marketing",
  "education": "educación",
  "finance": "finanzas",
  "legal": "legal",
  "health": "salud",
  "sales": "ventas",
  "support": "soporte",
  "ecommerce": "ecommerce",
  "hr": "rrhh",
  "product": "producto",
  "data": "datos",
  "operations": "operaciones",
};

function mapCategory(cat: string | undefined): string {
  if (!cat) return "desarrollo";
  const lower = cat.toLowerCase().trim();
  return CATEGORY_MAP[lower] || "desarrollo";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { dryRun = false } = await req.json().catch(() => ({}));

    // 1. Fetch skills_index.json
    console.log("Fetching skills_index.json...");
    const res = await fetch(INDEX_URL, {
      headers: { "User-Agent": "Pymaia-Skills-Sync/1.0" },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to fetch index: ${res.status} - ${body.slice(0, 200)}`);
    }

    const indexData = await res.json();
    const entries: Array<{ id: string; path?: string; category?: string; description?: string; risk?: string; source?: string }> =
      Array.isArray(indexData) ? indexData : (indexData.skills || []);

    console.log(`Parsed ${entries.length} entries from skills_index.json`);

    // 2. Get all existing slugs from skills table
    const existingSlugs = new Set<string>();
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("skills")
        .select("slug")
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data) existingSlugs.add(row.slug);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    console.log(`Existing skills in DB: ${existingSlugs.size}`);

    // 3. Get already-staged slugs to avoid re-staging
    const stagedSlugs = new Set<string>();
    offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("skills_import_staging")
        .select("source_slug")
        .eq("source", "antigravity")
        .range(offset, offset + PAGE - 1);
      if (error) break; // table might not have these yet
      if (!data || data.length === 0) break;
      for (const row of data) stagedSlugs.add(row.source_slug);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    console.log(`Already staged: ${stagedSlugs.size}`);

    // 4. Find missing skills
    const toInsert: Array<Record<string, unknown>> = [];
    for (const entry of entries) {
      const slug = entry.id?.toLowerCase().trim();
      if (!slug) continue;

      // Skip if already exists or already staged
      if (existingSlugs.has(slug) || stagedSlugs.has(slug)) continue;

      // Also check common slug variants
      const variants = [
        slug,
        slug.replace(/_/g, "-"),
        `antigravity-${slug}`,
        `sickn33-antigravity-awesome-skills-${slug}`,
      ];
      if (variants.some((v) => existingSlugs.has(v))) continue;

      toInsert.push({
        source: "antigravity",
        source_slug: slug,
        source_install_count: 0,
        name: entry.id.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        repo_url: GITHUB_URL,
        repo_owner: "sickn33",
        repo_name: "antigravity-awesome-skills",
        skill_folder: slug,
        install_command: `npx @anthropic-ai/claude-code skill add --from-url https://raw.githubusercontent.com/${REPO}/main/skills/${slug}/SKILL.md`,
        description: entry.description || `${entry.id} skill from Antigravity Awesome Skills collection`,
        category: mapCategory(entry.category),
        dedup_status: "new",
        import_status: "pending",
      });
    }

    console.log(`Missing skills to import: ${toInsert.length}`);

    if (dryRun) {
      return new Response(JSON.stringify({
        total_in_index: entries.length,
        existing_in_db: existingSlugs.size,
        already_staged: stagedSlugs.size,
        missing_count: toInsert.length,
        sample: toInsert.slice(0, 10).map((e) => e.source_slug),
        dry_run: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Insert into staging in batches
    let inserted = 0;
    let errors = 0;
    const BATCH = 100;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error } = await supabase.from("skills_import_staging").insert(batch);
      if (error) {
        console.error(`Batch ${i / BATCH} error:`, error.message);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    // 6. Now import staged entries directly into skills table
    let imported = 0;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const skillRows = batch.map((s) => ({
        slug: s.source_slug as string,
        display_name: s.name as string,
        description_human: s.description as string,
        tagline: (s.description as string).slice(0, 120),
        category: s.category as string,
        install_command: s.install_command as string,
        github_url: GITHUB_URL,
        status: "pending",
        install_count: 0,
        install_count_source: "imported",
        install_count_verified: false,
        skill_md_status: "pending",
        github_stars: 24700,
        auto_approved_reason: "trusted_source:sickn33/antigravity-awesome-skills (24.7k stars)",
      }));

      const { error } = await supabase.from("skills").insert(skillRows);
      if (error) {
        // Some might have slug collisions, try one by one
        for (const row of skillRows) {
          const { error: singleErr } = await supabase.from("skills").insert(row);
          if (!singleErr) imported++;
          else console.warn(`Skip ${row.slug}: ${singleErr.message}`);
        }
      } else {
        imported += skillRows.length;
      }
    }

    // 7. Update staging status
    if (inserted > 0) {
      await supabase
        .from("skills_import_staging")
        .update({ import_status: "imported", imported_at: new Date().toISOString() })
        .eq("source", "antigravity")
        .eq("dedup_status", "new")
        .eq("import_status", "pending");
    }

    // 8. Update monorepo_registry last_synced_at
    await supabase
      .from("monorepo_registry")
      .update({ last_synced_at: new Date().toISOString(), skill_count: entries.length })
      .eq("repo_full_name", REPO);

    // 9. Log to sync_log
    try {
      await supabase.from("sync_log").insert({
        source: "antigravity",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: "completed",
        total_scraped: entries.length,
        new_count: toInsert.length,
        duplicate_count: entries.length - toInsert.length,
        imported_count: imported,
        error_count: errors,
      });
    } catch (_) { /* sync_log is optional */ }

    return new Response(JSON.stringify({
      total_in_index: entries.length,
      existing_in_db: existingSlugs.size,
      staged: inserted,
      imported,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("sync-antigravity error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
