

# Plan: PRD Round 2 Fixes (6 Issues)

After verifying the current state of the codebase and database, all 6 issues from the PRD are confirmed:

- **722 slug collisions** still exist between `skills` and `mcp_servers`
- **4 install count clusters** remain (1477×2, 1115×2, 1065×3, 540×2)
- **KEYWORD_DOMAIN_MAP** missing key terms like "finances", "personal finances", "campaigns"
- **No GENERIC_TOOL_SLUGS filter** or relevance penalty in solve_goal scoring
- **Hero subtitle** uses generic text, not the differentiator copy
- **StatsBar** already shows security-scanned count (Fix 6 is already done)

---

## Fix 1: solve_goal Classification (P0)

In `supabase/functions/mcp-server/index.ts`:

**A. Expand KEYWORD_DOMAIN_MAP** (line ~38-53):
- Add to `finance`: `"finances"`, `"personal finances"`, `"money"`, `"savings"`, `"income"`, `"debt"`, `"loans"`, `"banking"`, `"investments"`, `"net worth"`, `"cash flow"`, `"gastos"`, `"ahorro"`, `"dinero"`, `"deudas"`
- Add to `advertising`: `"meta campaign"`, `"run campaigns"`, `"paid advertising"`, `"media buying"`, `"campaigns"`, `"publicidad"`, `"anuncios"`
- Add new domains: `personal_finance`, `hr` (expand existing), `healthcare`

**B. Add fuzzy word matching** in `detectDomainByKeywords()` (line ~73-90):
- Split goal into words, check if keyword words share prefix with goal words (e.g. "finances" ↔ "financial")

**C. Lower override threshold** (line ~174-180):
- Change keyword confidence threshold from `0.75` to `0.5`
- Change LLM confidence threshold from `0.9` to `0.85`

**D. Add final word-based fallback** in solve_goal handler (~line 1280):
- If all fallbacks return empty, do a direct ILIKE search on goal words against skills table

---

## Fix 2: 722 Slug Collisions (P1)

Database migration to batch-rename all colliding skill slugs:
- For each skill that shares a slug with an mcp_server, generate `{github_owner}-{slug}` as new slug
- Insert redirects into `slug_redirects`
- Update skills table
- Handle duplicate new slugs with numeric suffix

---

## Fix 3: Install Count Clusters (P2)

Database migration:
```sql
UPDATE skills SET install_count = 0, install_count_source = 'imported'
WHERE install_count IN (
  SELECT install_count FROM skills WHERE install_count > 100
  GROUP BY install_count HAVING count(*) > 1
);
```

---

## Fix 4: solve_goal Relevance (P2)

In `supabase/functions/mcp-server/index.ts`, in the scoring section (~line 1296):

**A. Add GENERIC_TOOL_SLUGS blacklist** — filter out meta-tools like `cowork-plugin-management`, `claude-code-setup`, `claude-code-plugins-plus-skills`, `claude-md-management`

**B. Add goal-word relevance penalty** — if none of the goal words (>3 chars) appear in an item's description, penalize score by 70%

---

## Fix 5: Hero Subtitle (P3)

Update `src/i18n/en.ts` and `src/i18n/es.ts`:
- EN: `"The only directory that unifies AI skills, MCP connectors, and plugins. Security-scanned and ready to use."`
- ES: `"El único directorio que unifica skills de IA, conectores MCP y plugins. Escaneados por seguridad y listos para usar."`

---

## Fix 6: StatsBar — Already Done

The StatsBar already shows a security-scanned count with a Shield icon. No changes needed.

---

## Summary

| # | Fix | Action |
|---|-----|--------|
| 1 | solve_goal classification | Expand keywords + fuzzy match + lower thresholds + word fallback |
| 2 | 722 slug collisions | DB migration batch rename + redirects |
| 3 | Install count clusters | DB migration reset duplicated counts |
| 4 | solve_goal relevance | Blacklist generic tools + word-match penalty |
| 5 | Hero subtitle | Update i18n strings |
| 6 | StatsBar | Already implemented — skip |

Files modified: `supabase/functions/mcp-server/index.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`, + 2 DB migrations.

