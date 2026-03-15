# PRD: Sprint 5 — Ecosystem Features

## Overview
Build out the ecosystem features that are currently empty: creator profiles, auto-generated bundles, and real trending data based on actual usage. This sprint transforms Pymaia from a directory into a living ecosystem.

## Context
The audit found that `get_top_creators` returns nothing, `install_bundle` works only for "marketer", `trending_solutions` has only 1 data point, and `browse_community_templates` is empty (fixed in Sprint 1 with seeded templates). These features exist in the MCP API but have no data behind them, making them feel like vaporware.

---

## Requirement 1: Auto-Generate Creator Profiles from GitHub Data

### Problem
`get_top_creators` returns "No creators found." There's no creator/author data in the system even though every skill comes from a GitHub user or organization.

### Expected Behavior
Creator profiles should be automatically generated from GitHub data, showing who creates the most skills, their GitHub identity, and aggregate stats.

### Implementation

1. Create a `creators` table:
   - `id` (UUID, primary key, default gen_random_uuid())
   - `github_username` (TEXT, UNIQUE) — the GitHub org or user
   - `display_name` (TEXT, nullable) — from GitHub API
   - `avatar_url` (TEXT, nullable) — from GitHub API
   - `bio` (TEXT, nullable) — from GitHub API
   - `website` (TEXT, nullable) — from GitHub API
   - `company` (TEXT, nullable) — from GitHub API
   - `skill_count` (INTEGER, default 0) — number of skills in Pymaia
   - `connector_count` (INTEGER, default 0) — number of connectors
   - `plugin_count` (INTEGER, default 0) — number of plugins
   - `total_installs` (INTEGER, default 0) — sum of tracked installs
   - `avg_rating` (FLOAT, default 0) — average rating across their skills
   - `avg_trust_score` (FLOAT, default 0) — average trust score
   - `top_category` (TEXT, nullable) — their most common category
   - `github_followers` (INTEGER, default 0)
   - `is_organization` (BOOLEAN, default false)
   - `verified` (BOOLEAN, default false) — for notable creators
   - `fetched_at` (TIMESTAMPTZ, nullable)
   - `created_at` (TIMESTAMPTZ, default now())

2. **Populate from existing skills data:**
   - Extract GitHub username from `repo_url` for every skill, connector, and plugin
   - Group by username and count items
   - Only create profiles for creators with 2+ items (filter out single-skill forks)
   - Insert into `creators` table

3. **Enrich via GitHub API:**
   - For each creator, call GitHub API: `GET /users/{username}` or `GET /orgs/{username}`
   - Extract: display_name (name field), avatar_url, bio, website, company, followers, is_organization
   - Store in creators table
   - Rate limit: batch process, same PAT as metadata pipeline

4. **Recompute aggregate stats daily via pg_cron:**
   - Recalculate `skill_count`, `total_installs`, `avg_rating`, `avg_trust_score`, `top_category` from live data
   - This keeps stats current as new skills are imported or rated

5. **Update `get_top_creators` edge function:**
   - Query `creators` table
   - Sort by composite score: `skill_count * 0.3 + avg_rating * 0.3 + total_installs * 0.2 + avg_trust_score * 0.2`
   - Return formatted output with: avatar, display name, GitHub username, skill count, avg rating, top category
   - Support `limit` parameter

6. **Mark notable creators as verified:**
   - Auto-verify creators whose GitHub username matches known organizations: anthropic, vercel, microsoft, google, meta, openai, supabase, etc.
   - Show a verified badge in output

### Acceptance Criteria
- `get_top_creators(limit: 10)` returns 10 creators with real GitHub data (avatars, display names)
- Verified organizations (anthropic, vercel, microsoft) appear with verification badge
- Creator stats (skill_count, avg_rating) are accurate
- Stats refresh automatically daily

---

## Requirement 2: Auto-Generate Bundles for All Roles

### Problem
`install_bundle("developer")` returns "Bundle not found." Only the "marketer" bundle exists (manually curated). All other roles have no bundles.

### Expected Behavior
Every supported role should have a curated bundle of recommended skills, connectors, and plugins that can be installed together.

### Implementation

1. Create a `bundles` table (if it doesn't already exist, or expand the existing one):
   - `id` (UUID, primary key)
   - `slug` (TEXT, UNIQUE)
   - `name` (TEXT)
   - `description` (TEXT)
   - `role` (TEXT) — target role
   - `skill_slugs` (TEXT array) — list of skill slugs in this bundle
   - `connector_slugs` (TEXT array) — list of connector slugs
   - `plugin_slugs` (TEXT array) — list of plugin slugs
   - `total_items` (INTEGER) — count of all items
   - `auto_generated` (BOOLEAN, default false)
   - `last_regenerated_at` (TIMESTAMPTZ, nullable)
   - `created_at` (TIMESTAMPTZ, default now())

2. **Define bundles for each role:**

   **developer:**
   - Skills: top 5 by quality_rank in categories [desarrollo, productividad]
   - Connectors: GitHub, Playwright
   - Plugins: Code Review, Context7, Superpowers, Frontend Design, TypeScript LSP

   **marketer:**
   - Skills: top 5 in [marketing, ventas, creatividad]
   - Connectors: any social media or analytics connectors
   - Plugins: Marketing plugin

   **designer:**
   - Skills: top 5 in [diseño, creatividad]
   - Connectors: Figma-related MCPs
   - Plugins: Frontend Design

   **data-analyst:**
   - Skills: top 5 in [datos, ia]
   - Connectors: PostgreSQL, SQLite, database-related MCPs
   - Plugins: data-related plugins

   **founder:**
   - Skills: top 5 in [negocios, producto, ventas, marketing]
   - Mix of connectors for business tools
   - Plugins: productivity-focused

   **devops:**
   - Skills: top 5 in [operaciones, automatización, desarrollo]
   - Connectors: infrastructure-related MCPs
   - Plugins: deployment/CI-related

   **lawyer:**
   - Skills: top 5 in [legal]
   - Connectors: document management MCPs
   - Plugins: document-related

   **product-manager:**
   - Skills: top 5 in [producto, negocios, datos]
   - Connectors: project management MCPs
   - Plugins: productivity-related

   **sales:**
   - Skills: top 5 in [ventas, marketing]
   - Connectors: CRM, email MCPs
   - Plugins: sales-related

   **hr:**
   - Skills: top 5 in [rrhh, negocios]
   - Connectors: HR tool MCPs
   - Plugins: HR-related

3. **Auto-generation logic:**
   - For each role, query skills by relevant categories, sort by `quality_rank DESC`, take top 5-8
   - Only include skills with `quality_rank > 0.2` (minimum quality threshold)
   - For connectors, search by keywords related to the role
   - For plugins, take the most installed plugins relevant to the role
   - Generate a name and description for each bundle

4. **Regeneration schedule:**
   - Regenerate all auto-generated bundles weekly via pg_cron (after quality_rank is recomputed)
   - Only update bundles where the top skills have changed
   - Keep manually curated bundles (like the existing marketer one) unchanged

5. **Update `install_bundle` edge function:**
   - Look up the bundle by slug or role
   - Return formatted install commands for all items in the bundle, organized by type (connectors first, then skills, then plugins)
   - Show total item count and estimated install time

### Acceptance Criteria
- `install_bundle("developer")` returns a bundle with 10+ items across skills, connectors, and plugins
- All 10 roles have bundles
- Bundle contents are relevant to each role (spot-check 5 roles)
- Bundles automatically update weekly to reflect quality changes
- The existing manually curated marketer bundle is preserved

---

## Requirement 3: Real Usage Tracking for Trending

### Problem
`trending_solutions` shows only 1 data point. `agent_analytics` shows only 1 recommendation ever rated. There's no real usage tracking, so trending is based on fake install counts.

### Expected Behavior
Every MCP tool interaction should be tracked so trending data reflects actual user behavior.

### Implementation

1. Create a `usage_events` table:
   - `id` (UUID, primary key, default gen_random_uuid())
   - `event_type` (TEXT) — see event types below
   - `item_slug` (TEXT) — which skill/connector/plugin
   - `item_type` (TEXT) — 'skill', 'connector', 'plugin'
   - `query_text` (TEXT, nullable) — what the user searched for (for search events)
   - `session_id` (TEXT, nullable) — to group events from the same session
   - `created_at` (TIMESTAMPTZ, default now())

   **Event types:**
   - `view` — skill/connector/plugin details were viewed (get_skill_details, get_connector_details, get_plugin_details)
   - `install_copied` — install command was requested (get_install_command)
   - `search_result` — item appeared in search results (search_skills, search_connectors, search_plugins, semantic_search)
   - `recommended` — item was recommended (recommend_for_task, solve_goal, get_role_kit)
   - `compared` — item was compared (compare_skills)
   - `content_viewed` — SKILL.md content was requested (get_skill_content)
   - `trust_checked` — trust report was requested (get_trust_report)

2. Create indexes for fast querying:
   - `(item_slug, created_at)` — for per-item trending
   - `(event_type, created_at)` — for event-type analytics
   - `(created_at)` — for time-based cleanup

3. **Instrument edge functions:**
   Add a single line at the end of each relevant edge function to log the event. This should be fire-and-forget (don't await, don't let it fail the main response):
   - `get_skill_details` → log `view` for the viewed skill
   - `get_install_command` → log `install_copied`
   - `search_skills` results → log `search_result` for each result returned (just the slug, not the full data)
   - `solve_goal` results → log `recommended` for each tool in the response
   - `recommend_for_task` → log `recommended`
   - `get_trust_report` → log `trust_checked`
   - `get_skill_content` → log `content_viewed`
   - `compare_skills` → log `compared`

4. **Update `trending_solutions` edge function:**
   - Query `usage_events` for the last 7 or 30 days (based on `period` parameter)
   - Group by `item_slug`, count events, weighting:
     - `install_copied`: weight 5 (strongest signal)
     - `content_viewed`: weight 3
     - `view`: weight 2
     - `trust_checked`: weight 2
     - `recommended`: weight 1
     - `search_result`: weight 0.5
   - Return top 10 trending items sorted by weighted score
   - Include event breakdown per item

5. **Update `agent_analytics` edge function:**
   - Query `usage_events` for aggregate stats:
     - Total events by type
     - Most viewed items
     - Most installed items
     - Most searched queries
     - Active sessions count
   - This replaces the current hardcoded/sparse data

6. **Data retention policy:**
   - Keep detailed events for 90 days
   - After 90 days, aggregate into daily summaries and delete individual events
   - Create a pg_cron job to clean up old events monthly

### Acceptance Criteria
- Every MCP tool interaction creates a usage event (verify by checking usage_events table after calling each tool)
- `trending_solutions` shows real trending data based on actual usage after a few days of operation
- `agent_analytics` shows meaningful aggregate stats
- Event logging does not slow down any MCP tool response time (fire-and-forget)
- Old events are automatically cleaned up after 90 days

---

## Requirement 4: Update Trending Solutions Format

### Problem
Even when trending data exists, the current format mixes goals (from solve_goal) with skills (from install counts). This is confusing.

### Expected Behavior
Trending should have clear sections: trending skills, trending connectors, trending plugins, and popular search queries.

### Implementation

1. Restructure `trending_solutions` output format:

   ```
   # Trending This Week

   ## Most Installed Skills
   1. {skill_name} — {install_copied count} installs this week
   2. ...

   ## Most Installed Connectors
   1. {connector_name} — {install_copied count} installs this week
   2. ...

   ## Most Viewed
   1. {item_name} ({type}) — {view count} views
   2. ...

   ## Popular Searches
   1. "{query}" — searched {count} times
   2. ...

   ## Trending Goals (from solve_goal)
   1. "{goal}" — asked {count} times
   2. ...
   ```

2. Each section draws from `usage_events` filtered by the appropriate `event_type`

### Acceptance Criteria
- Trending output has distinct sections for skills, connectors, searches, and goals
- Data comes from real usage events, not from static install counts
- Empty sections show "No data yet" instead of being omitted
