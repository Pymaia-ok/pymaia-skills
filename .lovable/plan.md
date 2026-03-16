

# Plan: PRD Final V2 — 7 Fixes

## Current State (verified now)

| Pipeline | Done | Total | Issue |
|---|---|---|---|
| Embeddings | 6,087 (16%) | 37,020 | Only 5-10/run, many "failed" entries before latest deploy |
| SKILL.md | 1,434 (4%) | 37,020 | Working but slow |
| GitHub meta | 2,306 (6%) | 37,020 | Working but slow |
| skills.sh import | 174 imported | 1,147 new | **931 slug collisions cause batch insert failure** |
| Crons | 30 active | — | 3 duplicates remain (refresh-catalog ×3, discover-trending ×2) |

---

## Fix 1: generate-embeddings — Reduce Batch & Add Error Logging [P0]

**Problem confirmed**: Default `batch_size=100` → 100 LLM calls × ~1s = timeout. Recent runs only succeed with 5-10.

**Changes to `supabase/functions/generate-embeddings/index.ts`:**
- Change default `batch_size` from 100 to **25** (safe within 50s MAX_RUNTIME)
- Add error detail to sync_log on failure (include `error.message` in an update)
- Errors per-skill already handled via `Promise.allSettled` — no change needed there

**Cron change (SQL migration):** Reschedule generate-embeddings from `*/5` to `*/3` to compensate smaller batch.

## Fix 2: skills.sh Import — Fix 931 Slug Collisions [P0]

**Root cause confirmed**: The batch insert fails entirely when ANY row has a slug collision. The slug generation uses `skill_folder` directly, and 931/1147 entries collide with existing skills.

**Changes to `supabase/functions/scrape-skills-sh/index.ts`:**
- Change batch insert to **individual upserts with error handling per row** — if one skill fails, log the error on its staging row and continue
- Add `error_message` column to staging (SQL migration)
- Always use prefixed slug format: `{owner}-{repo}-{skill_folder}` to avoid collisions
- After fix, re-run import for the 1,147 "new" entries

## Fix 3: Tools Irrelevantes — Expanded Exclusion + Stronger Penalty [P1]

**Changes to `supabase/functions/mcp-server/index.ts`:**
- Add to `SOLVE_GOAL_EXCLUDED_SLUGS`: `claude-code-cwd-tracker`, `avisangle-calculator-server`, `multi-mcp`, `ui-ticket-mcp`
- Upgrade `DOMAIN_CATEGORY_MAP` to use Spanish category names that match the actual catalog (the current map uses English names like "analytics" but actual categories are "datos", "marketing", etc.)
- Increase domain-category penalty from -5 to `score *= 0.2` (80% penalty, matching the goal-word penalty)
- Add connector description-overlap check: if item_type is "connector" and no goal word (4+ chars) appears in its description, apply 90% penalty

## Fix 4: Clean 3 Remaining Duplicate Crons [P1]

**SQL migration to unschedule:**
- `discover-trending-skills` jobid 72 (keep 59 daily 4AM)
- `refresh-catalog-data` jobid 75 and 76 (keep 74 daily 7AM)

Result: 30 → 27 crons.

## Fix 5: Accelerate enrich-github-metadata — Parallelize [P2]

**Changes to `supabase/functions/enrich-github-metadata/index.ts`:**
- Reduce batch from 400 to **150**
- Process in parallel batches of 5 (currently sequential)
- Add 200ms delay between parallel batches

**Cron change:** `*/15` → `*/10` minutes.

## Fix 6: Accelerate bulk-fetch-skill-content [P2]

Already parallelized (batches of 5) from prior PRD. Just need cron frequency change: `*/10` → `*/5` minutes.

## Fix 7: Stagger Crons to Reduce Timeout Rate [P2]

**SQL migration to offset schedules:**
- `calculate-trust-score`: `*/30` → `5,35 * * * *`
- `scan-security`: `*/30` → `10,40 * * * *`
- `verify-security`: `*/30` → `15,45 * * * *`
- `generate-embeddings`: `*/3` → `1,4,7,10,...` (offset +1)
- `bulk-fetch-skill-content`: `*/5` → `3,8,13,18,...` (offset +3)

---

## Files to Edit

| File | Fixes |
|---|---|
| `supabase/functions/generate-embeddings/index.ts` | Fix 1 (batch 25, error logging) |
| `supabase/functions/scrape-skills-sh/index.ts` | Fix 2 (individual inserts, prefixed slugs, error_message) |
| `supabase/functions/mcp-server/index.ts` | Fix 3 (exclusions, Spanish categories, stronger penalties) |
| `supabase/functions/enrich-github-metadata/index.ts` | Fix 5 (parallel batches of 5) |
| SQL migration 1 | Fix 2 (add error_message column to staging) |
| SQL migration 2 | Fix 4 + Fix 7 (clean dupes, stagger crons, adjust frequencies) |

