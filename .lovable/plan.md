

## Analysis: Skills without `github_url`

**Current state of the 1,205 skills without `github_url`:**
- **1,083** already have descriptions >100 characters (good quality, from SKILL.md source files)
- **122** have short/garbage descriptions (<100 chars) — includes Chinese text, broken parses, placeholder content
- **935** come from skills.sh via `npx skills add`

**Key finding:** The `install_command` column contains embedded GitHub repo URLs even though `github_url` is null. For example:
```
npx skills add https://github.com/openclaw/ --skill healthcheck
npx skills add https://github.com/microsoft/ --skill update-screenshots
```

This means we can extract the GitHub owner/repo from the install command and populate `github_url`, which would then let the existing `fetch-readme-auto` cron enrich them with README content and AI summaries.

## Plan

### 1. Migration: Backfill `github_url` from `install_command`
Run a SQL update to extract GitHub URLs from install commands:
```sql
UPDATE skills
SET github_url = regexp_replace(install_command, '^.*?(https://github\.com/[^/]+/?).*$', '\1')
WHERE github_url IS NULL
  AND install_command LIKE '%github.com/%'
  AND status = 'approved';
```
This would populate `github_url` for ~935 skills, making them eligible for the existing `fetch-readme-auto` cron.

### 2. AI enrichment for the remaining ~122 with poor descriptions
These are already covered by the `enrich-skills-ai-auto` cron. We just need to ensure they're being picked up (descriptions <50 chars should qualify).

### 3. Cleanup garbage entries
The 122 short-description skills include broken parses (Chinese-only text, `@Type:WebSite`, single-word nonsense). These should be flagged as `pending` or deleted since they're not real skills.

**Net result:** After the backfill, the fetch-readme cron will automatically process ~935 additional skills with full README documentation and AI summaries, without creating any new infrastructure.

