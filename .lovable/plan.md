

# Plan: PRD Final Polish — 7 Fixes

## Current State (verified)
- **33 cron jobs** active — confirmed duplicates: sync-skills (4), sync-connectors (3), discover-trending-skills (3), refresh-catalog-data (3)
- **No crons** for generate-embeddings, bulk-fetch-skill-content, enrich-github-metadata
- Pipeline coverage: embeddings 12.3%, skill_md 2.9%, github_meta 4.7%
- 963 zero-signal skills, quality_rank distribution: 93% low, 4.3% medium, 2.6% high
- enrich-github-metadata already has timeout/rate-limit handling but no graceful 50s cutoff

---

## Fix 1: Add 3 Pipeline Crons [P0]

**DB migration** to schedule:
- `generate-embeddings-auto`: every 5 min, batch 100
- `bulk-fetch-skill-content-auto`: every 10 min, batch 50
- `enrich-github-metadata-auto`: every 15 min, batch 400

Uses `net.http_post()` with service role key from `current_setting('supabase.service_role_key')` (no hardcoded keys).

## Fix 2: Clean Duplicate Crons [P1]

**DB migration** to unschedule duplicates:
- sync-skills: keep jobid 58 (7 AM), drop 1, 55, 56
- sync-connectors: keep 29 (7 AM), drop 13, 14
- discover-trending-skills: keep 59 (daily 4 AM), drop 72, 22
- refresh-catalog-data: keep 74 (daily 7 AM), drop 75, 76

**Result**: 33 → ~24 crons

## Fix 3: Reduce Timeout Rate [P1]

**DB migration** to reschedule high-frequency crons:
- auto-approve: `*/3` → `*/10`
- verify-security: `*/10` → `*/30`
- scan-security: `*/15` → `*/30`
- calculate-trust-score: `*/15` → `*/30`
- enrich-skills-ai: `*/30` → `0 */2 * * *`
- translate-skills: `*/30` → `0 */3 * * *`

Also stagger daily crons (sync-skills→6AM, sync-connectors→7AM, mcp-quality→8AM, blog→9AM — most already aligned).

**Edge function timeout guards**: Add 50s `MAX_RUNTIME` break to `enrich-github-metadata` and `bulk-fetch-skill-content` processing loops (generate-embeddings already has parallel batching).

## Fix 4: Filter Irrelevant Tools in solve_goal [P2]

In `supabase/functions/mcp-server/index.ts`:
1. Add to `SOLVE_GOAL_EXCLUDED_SLUGS`: `firebase`, `neverinfamous-memory-journal-mcp`, `frago`
2. Add `DOMAIN_CATEGORY_MAP` for domain→expected categories penalty (50% if category doesn't match detected domain)

## Fix 5: Mark Zero-Signal Skills [P2]

**DB migration**: Set `quality_rank = 0.01` for 963 approved skills with 0 rating, 0 installs, 0 trust score.

No search filter change needed — the existing scoring already penalizes zero-signal items by -8 points.

## Fix 6: Quality Rank Distribution [P3]

No action now. Resolves automatically once Fix 1 crons run and github_metadata covers >50% of skills, feeding `recompute_quality_ranks()`.

## Fix 7: scrape-skills-sh Diagnostic [P3]

Invoke the function manually via curl to check logs, then verify `skills_import_staging` and `sync_log` for results. If it's failing silently, add error logging. Low priority — existing sync-skills covers the same sources.

---

## Files to Edit

| File | Fixes |
|---|---|
| DB migrations (3) | Fix 1 (add crons), Fix 2 (remove dupes) + Fix 3 (reschedule), Fix 5 (quality_rank) |
| `supabase/functions/mcp-server/index.ts` | Fix 4 (excluded slugs + domain penalty) |
| `supabase/functions/enrich-github-metadata/index.ts` | Fix 3 (50s timeout guard) |
| `supabase/functions/bulk-fetch-skill-content/index.ts` | Fix 3 (50s timeout guard) |

Fix 6 = auto, Fix 7 = manual diagnostic after deployment.

