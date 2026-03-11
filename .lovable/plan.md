

## Analysis of Current Logs + Quality Monitoring System

### Log Analysis

The logs show `solve_goal` is working correctly now:
- **Intent classified**: keywords `["outbound email automation", "sales email outreach", "email marketing automation", "lead nurturing", "crm integration"]`, confidence 0.8
- **Keyword expansion worked**: 26 original keywords → 10 unique expanded → matched template "outbound-sales"
- **Results**: 44 skills, 39 connectors, 30 plugins (113 total) — much better than before
- Multi-word keywords like `"outbound email automation"` returned 0 results, but their individual words (`"outbound"` → 8 skills, `"email"` → 8 skills) successfully matched

### Proposed: Quality Feedback Loop (Continuous Improvement)

A new Edge Function `mcp-quality-monitor` that runs as a cron, analyzes recent `solve_goal` interactions, and identifies improvement opportunities.

#### How it works

1. **Reads recent `agent_analytics`** entries for `solve_goal` events (last 24h)
2. **Cross-references with `recommendation_feedback`** to find low-rated recommendations
3. **Detects "empty result" patterns**: goals where total results < 3 or key categories are missing
4. **Uses AI (Gemini Flash)** to analyze failing queries and suggest:
   - New `goal_templates` triggers to add
   - Missing keywords that should be synonyms
   - Categories that need more coverage in the catalog
5. **Logs findings** to a new `quality_insights` table for admin review
6. **Auto-creates goal templates** for frequently searched goals with no template match

#### Database changes

New table `quality_insights`:
- `id`, `created_at`
- `insight_type`: `empty_results` | `low_rating` | `missing_template` | `keyword_gap`
- `goal`: the original query
- `details`: jsonb with analysis
- `action_taken`: what was auto-fixed (if any)
- `status`: `pending` | `resolved` | `dismissed`

#### Edge Function: `mcp-quality-monitor`

- Runs daily via cron
- Queries analytics for patterns:
  - Goals with 0 results in any category
  - Goals with no template match + high frequency
  - Low-rated recommendations (from `recommendation_feedback`)
- Calls AI to analyze gaps and suggest template triggers
- Auto-creates `goal_templates` for high-frequency unmatched goals (status: pending for admin review)
- Inserts insights into `quality_insights` for the admin dashboard

#### Admin visibility

Add a "Quality" section to the admin panel showing:
- Recent insights (empty results, keyword gaps)
- Suggested template additions
- Feedback scores over time

#### Files to create/modify

1. **Create** `supabase/functions/mcp-quality-monitor/index.ts` — the cron function
2. **DB migration** — `quality_insights` table with RLS
3. **Modify** `src/components/admin/AdminOverviewTab.tsx` — add quality metrics card
4. **Modify** `supabase/config.toml` — register new function

