# PRD: Sprint 4 — Catalog Expansion (Skills.sh Import)

## Overview
Import missing skills from skills.sh (the largest competitor with 88K+ skills) to make Pymaia the most comprehensive AI skills catalog. All imports must be deduplicated, properly slugged, and queued for GitHub enrichment.

## Context
Pymaia currently has ~37K skills. Skills.sh has ~88K. The goal is to import the ~50K+ skills that Pymaia is missing, with proper deduplication to avoid duplicates, and with slug formats that prevent the collision issues fixed in Sprint 1. All imported skills should be queued for the GitHub metadata and SKILL.md content pipelines built in Sprint 2.

---

## Requirement 1: Skills.sh Scraper

### Problem
Pymaia is missing approximately 50,000+ skills that exist in the skills.sh directory. To have the most complete catalog, we need to systematically import these missing skills.

### Expected Behavior
A scraper/sync system that can pull all skills from skills.sh, identify which ones are new (not already in Pymaia's catalog), and import them with clean data.

### Implementation

1. **Research skills.sh data access:**
   - Check if skills.sh has a public API (check for `/api/` endpoints, GraphQL, or REST)
   - If no API, check if skills.sh has a data dump or public GitHub repo with their catalog
   - If neither, build an HTML scraper for the listing pages
   - Skills.sh lists skills organized by GitHub repos. Each skill entry typically has: name, slug, repo URL, install command, description, install count

2. **Create staging table** `skills_import_staging`:
   - `id` (UUID, primary key)
   - `source` (TEXT) — 'skills.sh'
   - `source_slug` (TEXT) — original slug from skills.sh
   - `source_install_count` (INTEGER) — their install count (for reference only, NOT imported as our count)
   - `name` (TEXT)
   - `repo_url` (TEXT)
   - `repo_owner` (TEXT) — parsed from repo_url
   - `repo_name` (TEXT) — parsed from repo_url
   - `skill_folder` (TEXT) — the skill folder name within the repo
   - `install_command` (TEXT)
   - `description` (TEXT)
   - `category` (TEXT, nullable) — if skills.sh provides category info
   - `dedup_status` (TEXT, default 'pending') — 'pending', 'new', 'duplicate', 'merge'
   - `matched_existing_slug` (TEXT, nullable) — if duplicate, which existing skill it matches
   - `dedup_reason` (TEXT, nullable) — why it was flagged as duplicate
   - `import_status` (TEXT, default 'pending') — 'pending', 'imported', 'skipped', 'error'
   - `imported_at` (TIMESTAMPTZ, nullable)
   - `created_at` (TIMESTAMPTZ, default now())

3. **Build the scraper edge function** `scrape-skills-sh`:
   - Fetch skills from skills.sh in pages/batches
   - Parse each entry to extract: name, repo_url, install_command, description
   - Parse `repo_url` into `repo_owner` and `repo_name`
   - Parse `install_command` to extract `skill_folder` name
   - Insert into `skills_import_staging` with `dedup_status = 'pending'`
   - Log progress: total scraped, total inserted into staging

4. **Deduplication logic** (separate step, runs after scraping):
   For each staging entry with `dedup_status = 'pending'`:

   Check 1 — Exact repo URL + skill folder match:
   ```
   SELECT slug FROM skills
   WHERE repo_url = staging.repo_url
   AND (slug LIKE '%' || staging.skill_folder || '%' OR name ILIKE staging.name)
   ```
   → If found: mark as 'duplicate', set `matched_existing_slug`

   Check 2 — Same install command:
   ```
   SELECT slug FROM skills WHERE install_command = staging.install_command
   ```
   → If found: mark as 'duplicate'

   Check 3 — Normalized name match (same org + similar name):
   ```
   SELECT slug FROM skills
   WHERE lower(replace(name, '-', ' ')) = lower(replace(staging.name, '-', ' '))
   AND repo_url LIKE '%' || staging.repo_owner || '%'
   ```
   → If found: mark as 'duplicate'

   If none match: mark as 'new'

5. **Import logic** (separate step, runs after dedup):
   For each staging entry with `dedup_status = 'new'` and `import_status = 'pending'`:

   Generate slug:
   - If `skill_folder` is a common word (exists in connectors table or reserved list), use `{repo_owner}-{repo_name}-{skill_folder}`
   - Otherwise, use `skill_folder` (cleaner slug)
   - If slug already exists in skills table, fall back to prefixed format

   Insert into `skills` table:
   - `name`: from staging
   - `slug`: generated above
   - `repo_url`: from staging
   - `install_command`: from staging
   - `description`: from staging
   - `category`: from staging or 'uncategorized'
   - `status`: 'auto-imported'
   - `install_count`: 0 (DO NOT import their install counts)
   - `install_count_source`: 'imported'
   - `skill_md_status`: 'pending' (queued for Sprint 2 SKILL.md pipeline)
   - `trust_score`: null (queued for security scan)

   Update staging: set `import_status = 'imported'`, `imported_at = now()`

### Acceptance Criteria
- Scraper successfully extracts skills from skills.sh
- Dedup correctly identifies existing skills (test with 100 known duplicates)
- No duplicate skills created in the skills table
- All new skills have properly prefixed slugs (no collisions)
- All new skills have `install_count = 0` and `install_count_source = 'imported'`
- After import, total skill count exceeds 80,000
- Import process is idempotent (running it twice doesn't create duplicates)

---

## Requirement 2: Category Auto-Detection for Imported Skills

### Problem
Skills imported from skills.sh may not have category information, or their categories may use a different taxonomy than Pymaia's 19 categories.

### Expected Behavior
Every imported skill should be assigned to one of Pymaia's existing categories based on its name, description, and repository context.

### Implementation

1. **Keyword-based category detection** (fast, no LLM needed):
   ```
   desarrollo: code, programming, api, sdk, framework, react, vue, angular, python, javascript, typescript, rust, go, compiler, debug, git, cli, terminal, vscode
   ia: ai, machine learning, llm, gpt, claude, model, neural, nlp, embedding, vector, agent, chatbot
   automatización: automate, workflow, pipeline, n8n, zapier, cron, scheduler, scraper, bot
   diseño: design, ui, ux, figma, css, tailwind, component, layout, animation, font
   productividad: productivity, todo, notes, calendar, time, organize, template, snippet
   datos: data, database, sql, analytics, visualization, chart, dashboard, etl, warehouse, csv, excel
   marketing: marketing, seo, content, social media, campaign, email marketing, copywriting, ads
   creatividad: creative, video, audio, music, image, photo, 3d, animation, render
   legal: legal, contract, compliance, gdpr, privacy, patent, regulation
   negocios: business, strategy, pitch, presentation, consulting, proposal
   finanzas: finance, accounting, invoice, payment, budget, tax, banking, crypto
   ventas: sales, crm, lead, prospect, cold email, outbound, pipeline
   operaciones: devops, infrastructure, monitoring, deployment, docker, kubernetes, terraform
   educación: education, learning, tutorial, course, quiz, teaching, student
   producto: product, feature, roadmap, spec, requirement, user story, sprint
   ecommerce: ecommerce, shop, store, cart, checkout, payment, inventory, shipping
   soporte: support, ticket, helpdesk, customer service, faq, chatbot
   salud: health, medical, clinical, patient, diagnosis, wellness, fitness
   rrhh: hr, recruiting, hiring, onboarding, payroll, employee, performance review
   ```

2. For each imported skill with no category:
   - Check name + description against keyword lists
   - Assign the category with the most keyword matches
   - If no matches or tie, default to 'desarrollo' (largest category, most likely for code-related skills)

3. Store the detection method: add a `category_source` column (TEXT) — 'manual', 'auto-keyword', 'auto-llm'

### Acceptance Criteria
- 95%+ of imported skills have a category assigned
- Category assignments are reasonable (spot-check 50 random skills)
- No skills left as 'uncategorized' unless they truly don't fit any category

---

## Requirement 3: Ongoing Sync Schedule

### Problem
Skills.sh adds new skills daily. A one-time import would become stale quickly.

### Expected Behavior
Weekly automated sync that imports new skills from skills.sh, with logging and monitoring.

### Implementation

1. Create a `sync_log` table:
   - `id` (SERIAL, primary key)
   - `source` (TEXT) — 'skills.sh'
   - `started_at` (TIMESTAMPTZ)
   - `completed_at` (TIMESTAMPTZ, nullable)
   - `status` (TEXT) — 'running', 'completed', 'failed'
   - `total_scraped` (INTEGER, default 0)
   - `new_count` (INTEGER, default 0)
   - `duplicate_count` (INTEGER, default 0)
   - `imported_count` (INTEGER, default 0)
   - `skipped_count` (INTEGER, default 0)
   - `error_count` (INTEGER, default 0)
   - `error_log` (JSONB, nullable)
   - `duration_seconds` (INTEGER, nullable)

2. Schedule the scraper + dedup + import pipeline as a weekly pg_cron job (Sundays at 2:00 AM UTC)

3. The sync should be incremental:
   - Store the last sync timestamp
   - Only scrape skills newer than the last successful sync
   - If skills.sh doesn't support date filtering, scrape everything but rely on dedup to skip existing entries

4. Add a health check: if the last successful sync was > 14 days ago, log a warning

### Acceptance Criteria
- Sync runs automatically every week
- Second sync on the same data produces 0 new imports (idempotent)
- `sync_log` table has accurate counts for each run
- Failed syncs are logged with error details

---

## Requirement 4: Bulk SKILL.md Fetching for New Imports

### Problem
Newly imported skills will have `skill_md_status = 'pending'`. The Sprint 2 daily pipeline handles this, but with 50K+ new skills, it would take weeks to process at 5,000/day (GitHub rate limit).

### Expected Behavior
A one-time bulk fetch job that prioritizes high-quality imports.

### Implementation

1. Prioritize fetching SKILL.md for imports that have:
   - GitHub repos with > 50 stars (from `github_metadata`, enriched in Sprint 2)
   - Skills in popular categories (desarrollo, ia, automatización)
   - Skills whose name suggests they are well-documented

2. Process in batches:
   - Batch 1: Skills from repos with > 100 stars (likely well-documented)
   - Batch 2: Skills from repos with 10-100 stars
   - Batch 3: Everything else

3. Use the same fetch logic from Sprint 2's `bulk-fetch-skill-content` function

4. Increase the daily pipeline capacity: if using authenticated GitHub requests (PAT), can do 5,000/hour. Run for 2 hours daily = 10,000 skills/day = 5 days to process 50K.

### Acceptance Criteria
- Within 1 week of import, 60%+ of new skills with valid GitHub URLs have SKILL.md content fetched
- High-star repos are prioritized (processed first)
- No GitHub API rate limit violations

---

## Requirement 5: Embedding Generation for New Imports

### Problem
The `semantic_search` feature works well but only for skills that have embeddings. Newly imported skills won't have embeddings and won't appear in semantic search results until they do.

### Expected Behavior
All imported skills should have embeddings generated within a few days of import, so they appear in semantic search.

### Implementation

1. Create a background edge function `generate-embeddings-batch`:
   - Query skills where `embedding IS NULL` in batches of 100
   - For each skill, generate a text for embedding: `{name}. {tagline}. {description}. Category: {category}`
   - Call the embedding API (use the same provider/model already used for existing skills)
   - Store the embedding vector in the skill's `embedding` column
   - Rate limit based on the embedding API's limits

2. Schedule via pg_cron: run every 6 hours until all skills have embeddings, then reduce to daily for new additions

3. Track progress: log how many skills have embeddings vs total in `directory_stats_mv`

### Acceptance Criteria
- Within 3 days of import, 90%+ of new skills have embeddings
- `semantic_search` returns results from newly imported skills
- No embedding API rate limit violations
