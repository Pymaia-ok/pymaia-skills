

## Diagnosis: Why These 3 Repos Were Not Indexed

The automatic indexing pipeline discovers skills through these channels:

1. **skills.sh / agentskill.sh / claude-plugins.dev** — Web crawling of skill directories
2. **GitHub Search by topics** — Searches for repos tagged `mcp-server`, `claude-skill`, `agent-skill`, `cursor-rules`, etc.
3. **GitHub Popular Search** — Keyword queries like `"ai agent" stars:>500`
4. **Awesome Lists** — Scrapes curated lists (punkpeye, travisvn, etc.)
5. **Antigravity** — Monthly sync from `sickn33/antigravity-awesome-skills`
6. **Monorepo detection** — Scans repos with 3+ SKILL.md files

**Why these 3 missed:**

| Repo | Stars | Created | Reason |
|------|-------|---------|--------|
| `HKUDS/CLI-Anything` | 16k | Mar 8 (8 days ago) | Too new; no `claude-skill`/`mcp-server` topics; not on skills.sh yet; keyword "CLI-Anything" doesn't match any search queries |
| `gsd-build/gsd-2` | ~1.4k | Recent | No standard topics; not on any directory; name too generic for keyword search |
| `garrytan/gstack` | ~15.8k | Recent | Same — no topics, not on directories |

**Root cause:** The pipeline only discovers repos that either (a) are listed on third-party directories, (b) use specific GitHub topics, or (c) match narrow keyword searches. Fast-rising repos without these signals slip through.

---

## Plan

### Step 1: Insert the 3 missing repos now
Use the database insert tool to add `CLI-Anything`, `GSD 2`, and `gstack` directly to the `skills` table with correct metadata (github_url, stars, description, category, status=approved).

### Step 2: Create a "trending repos watchlist" edge function
New function: `discover-trending-repos/index.ts`

**What it does:**
- Queries the GitHub Search API for recently created repos with high star velocity: `stars:>1000 created:>{7_days_ago} sort:stars`
- Also queries broader terms: `"claude" OR "agent" OR "AI tool" stars:>500 pushed:>{7_days_ago}`
- Checks if the repo already exists in `skills` or `mcp_servers`
- For new repos: auto-inserts with `status: approved` if stars > 1000, or `status: pending` if 500-1000
- Logs to `automation_logs` with action `trending_repo_discovered`

**Schedule:** Daily cron at 06:00 UTC (after other syncs complete)

### Step 3: Expand GitHub Popular Search queries
Add more keyword queries to the existing `github-popular` source in `sync-skills`:
- `"claude code" stars:>500`
- `"AI native" stars:>500`  
- `"agent native" stars:>500`
- `"AI stack" stars:>500`
- `"dev tools AI" stars:>500`

This broadens coverage for repos that don't use conventional topics.

### Step 4: Add the cron job
Schedule `discover-trending-repos` as a daily cron at 06:00 UTC via `pg_cron`.

---

### Technical details

- The new function uses `GITHUB_TOKEN` (already configured) and `LOVABLE_API_KEY` for AI-based category detection
- Deduplication reuses the same pattern: check existing slugs + github_urls before insert
- Stars threshold of 1000+ ensures quality without manual review
- The function covers repos in any language/domain, not just those tagged for AI agents

