
# Experience Layer v2.0 — Implementation Status

## ✅ Completed

### Mensaje 1: DB Setup
- [x] `experience_executions` table with RLS
- [x] `experience_outcomes` table with RLS
- [x] `scoring_config` table seeded with 17 keys
- [x] `rate_limit_log` table
- [x] Materialized view `experience_tool_scores`
- [x] RPC `upsert_rate_limit` (atomic rate limiting)
- [x] RPC `refresh_experience_scores` (refresh + cleanup)
- [x] `HASH_SALT` secret configured

### Mensaje 2: Logging + Config
- [x] `hashCallerIP` helper using HASH_SALT
- [x] `generateExecutionId` helper
- [x] `getScoringConfig` loader with 5-min cache
- [x] `sc()` config reader with fallback
- [x] All hardcoded scoring weights replaced by `sc(scoringCfg, key, fallback)`
- [x] `execution_id` generated per solve_goal call
- [x] HTML comment `<!-- execution_id: ... -->` in response
- [x] Async logging to `experience_executions` table
- [x] Experience-backed items indicator in response

### Mensaje 3: report_goal_outcome + Rate Limiting
- [x] `checkRateLimit` using `upsert_rate_limit` RPC
- [x] `report_goal_outcome` updated with execution_id + tool_slug support
- [x] Rate limit: 20 outcomes/hour per caller
- [x] Outcome validation (success/partial/failure/skipped)
- [x] Backwards compatible with legacy `recommendation_feedback`
- [x] Caller hash extracted in Hono middleware

### Mensaje 4: Dynamic Scoring + Cron
- [x] `experience_tool_scores` queried in scoring loop (200ms timeout)
- [x] Experience-backed boost/penalty integrated
- [x] `refresh-experience-scores` edge function created
- [x] Config in supabase/config.toml

## ✅ All Complete
- [x] Schedule cron job for `refresh-experience-scores` (hourly) — cron ID 163, runs at :15 each hour
