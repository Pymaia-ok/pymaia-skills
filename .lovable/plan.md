

## Sprint 1: Data Quality & Error Handling

The audit identified 5 foundational issues. All changes target `supabase/functions/mcp-server/index.ts` and database migrations. Here is the plan:

---

### 1. Fix Directory Stats Inconsistency

**Problem:** `get_directory_stats` fetches all skills and counts in-memory (hits the 1000-row Supabase default limit), showing "1,000 skills". Meanwhile `a2a_query(catalog_stats)` uses `count: "exact"` and correctly returns ~36,820.

**Fix:**
- Create a materialized view `directory_stats_mv` via migration with pre-aggregated counts across `skills`, `mcp_servers`, and `plugins`
- Schedule hourly refresh via `pg_cron`
- Rewrite `get_directory_stats` handler to `SELECT * FROM directory_stats_mv` (single row, <10ms)
- Update `a2a_query(catalog_stats)` to also read from the same view for consistency

---

### 2. Audit and Fix Install Counts

**Problem:** Multiple unrelated skills share exact inflated install counts (261,003, 249,321) from bulk imports, poisoning all ranking features.

**Fix:**
- Migration: Add `install_count_source` (TEXT, default 'imported') and `install_count_verified` (BOOLEAN, default false) to `skills`
- Migration: Reset `install_count = 0` for all skills in clusters of >5 sharing the same count
- Update `list_popular_skills` to use a composite ranking: prioritize `install_count_source = 'tracked'`, then fallback to `trust_score + avg_rating * 20` as tiebreaker
- When `get_install_command` resolves, mark installs as `tracked`

---

### 3. Fix Slug Collisions

**Problem:** Skills like "slack" resolve to unrelated tools ("Browser automation CLI"), breaking `explain_combination`, `compare_skills`, etc.

**Fix:**
- Migration: Create `slug_redirects` table (`old_slug`, `new_slug`, `item_type`, `created_at`)
- Migration: Identify colliding slugs between `skills` and `mcp_servers`, rename skill slugs to `{org}-{repo}` format, insert redirects
- Add a `resolveSlug` helper function at the top of the MCP server that checks `slug_redirects` first, then does the normal lookup
- Apply this helper in `get_skill_details`, `get_install_command`, `explain_combination`, `compare_skills`, `get_skill_content`, `get_trust_report`

---

### 4. Fix Error Handling Across All MCP Tools

**Problem:** Multiple tools return empty/blank responses with no explanation when they fail or find no results.

**Fix:** Add a shared `ensureResponse` utility and wrap outputs in the following tools:
- `get_skill_details` — already returns a message, but add suggestion: *"Try search_skills('keyword') to find similar skills."*
- `solve_goal` — when results are empty, return: *"No matching tools found for this goal. Try: broader keywords, explore_directory, or suggest_stack."*
- `suggest_stack` — already has fallback, verified OK
- `get_top_creators` — when no creators with `creator_id`, return: *"Creator profiles are being built. The catalog has X skills but most were imported without creator attribution."*
- `install_bundle` — when not found, list available bundles: query `skill_bundles` for active ones and show names
- `validate_skill` — catch the `throw new Error("Validation failed: ${resp.status}")` and instead parse the response body, then return specific structural feedback (has title? has sections? min length? has usage instructions?)

---

### 5. Seed Community Templates

**Problem:** `browse_community_templates` returns "No community templates found."

**Fix:** Migration to insert 24 curated templates into `community_goal_templates` covering 9 domains (marketing, development, sales, data, design, legal, operations, support, finance). Each template will have:
- Meaningful `slug`, `display_name`, `domain`, `description`
- 5-8 `triggers` (keywords that match natural language queries)
- `status = 'approved'`
- `user_id = '00000000-0000-0000-0000-000000000000'` (system user)

---

### Technical Details

- **Files modified:** `supabase/functions/mcp-server/index.ts` (all 5 requirements)
- **Migrations:** 3 SQL migrations (stats materialized view + cron, install count columns + cleanup + slug redirects table + slug fixes, seed community templates)
- **No UI changes** — all backend/MCP improvements
- **Backward compatible** — slug redirects preserve old URLs, install count columns default to existing behavior

