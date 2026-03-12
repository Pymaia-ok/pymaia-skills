

## Plan: Auto-discovery of Skill Monorepos

### The Problem

Today, `github-monorepo` is a manual source — you have to know the repo name and invoke it explicitly. When a new monorepo like `alirezarezvani/claude-skills` appears, it won't get its subdirectory skills indexed until someone manually triggers it.

### Solution: Two-Phase Automatic Monorepo Detection

#### Phase 1 — Detect monorepos from existing indexed skills

**File**: `supabase/functions/discover-trending-skills/index.ts`

Add a new mode `monorepo_scan` that:

1. Queries the `skills` table for repos with high stars (>500) that were indexed as a single entry but whose GitHub tree contains multiple `SKILL.md` files
2. Uses the GitHub Trees API to check if an already-indexed repo has >5 `SKILL.md` files at different paths — if so, it's a monorepo
3. Automatically calls `sync-skills` with `source: "github-monorepo"` for each discovered monorepo
4. Stores discovered monorepos in a new `monorepo_registry` table to avoid re-scanning known ones

#### Phase 2 — Detect monorepos from discovery sources

**File**: `supabase/functions/sync-skills/index.ts`

Enhance the `github-popular` and `github-search` sources to flag potential monorepos:

1. After fetching a repo, do a lightweight check: `GET /repos/{owner}/{repo}/git/trees/main?recursive=1` and count `SKILL.md` files
2. If count > 3, insert into `monorepo_registry` for the `monorepo_scan` cron to process later
3. This avoids blocking the main sync with slow tree traversals

#### Phase 3 — Cron schedule

Add a weekly cron `sync-monorepos-auto` that:
1. Reads `monorepo_registry` for unprocessed entries
2. Calls `sync-skills` with `source: "github-monorepo"` for each, in sequence
3. Marks them as processed with `last_synced_at`

### DB Migration

New table `monorepo_registry`:
```sql
CREATE TABLE public.monorepo_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_full_name text NOT NULL UNIQUE,
  skill_count integer DEFAULT 0,
  github_stars integer DEFAULT 0,
  last_synced_at timestamptz,
  discovered_via text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monorepo_registry ENABLE ROW LEVEL SECURITY;
-- Service role only
CREATE POLICY "Service role monorepo_registry" ON public.monorepo_registry
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view monorepo_registry" ON public.monorepo_registry
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
```

### Files to modify/create

| File | Change |
|------|--------|
| `supabase/functions/discover-trending-skills/index.ts` | Add `monorepo_scan` mode: scan high-star repos for multiple SKILL.md files, insert into `monorepo_registry` |
| `supabase/functions/sync-skills/index.ts` | In `github-popular` and `github-search`, add lightweight monorepo detection (count SKILL.md in tree, insert to registry if >3) |
| DB migration | Create `monorepo_registry` table |
| Cron job (SQL insert) | Weekly `sync-monorepos-auto` that processes the registry |

### How it works end-to-end

1. **Daily**: `github-popular` discovers `someuser/mega-skills-repo` (2K stars). It checks the tree, finds 50 `SKILL.md` files, inserts into `monorepo_registry`
2. **Weekly**: `sync-monorepos-auto` cron picks it up, calls `sync-skills?source=github-monorepo&topic=someuser/mega-skills-repo`
3. **Result**: All 50 skills are individually indexed with correct subdirectory URLs

This makes monorepo discovery fully autonomous — no manual intervention needed.

