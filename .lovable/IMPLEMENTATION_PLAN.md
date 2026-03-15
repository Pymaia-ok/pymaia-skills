# Pymaia Skills MCP - Plan de Implementación

**Fecha:** 15 de marzo de 2026
**Objetivo:** Arreglar todos los issues del audit + catálogo completo con data real de GitHub

---

## Resumen de Sprints

| Sprint | Semanas | Foco | Tasks |
|---|---|---|---|
| **Sprint 1** | 1-2 | Foundation & Quick Wins | Stats fix, install counts, slug collisions, error handling, seed templates |
| **Sprint 2** | 3-4 | Search & Content | Fix get_skill_content, GitHub enrichment pipeline, FTS search |
| **Sprint 3** | 5-6 | Core Tool Fixes | Fix solve_goal, recommend_for_task, quality ranking |
| **Sprint 4** | 7-8 | Catalog Expansion | Skills.sh scraper, bulk SKILL.md fetching |
| **Sprint 5** | 9-10 | Ecosystem | Ongoing sync, creators, bundles, trending, semantic recs |

---

## Phase 1: Data Quality & Integrity (Foundation)

### 1.1 Fix Stats Discrepancy [S]
**Problema:** `get_directory_stats` dice 1,000 skills, `a2a_query` dice 36,820.

**Solución:** Crear materialized view refreshed por pg_cron:

```sql
CREATE MATERIALIZED VIEW directory_stats_mv AS
SELECT
  (SELECT count(*) FROM skills WHERE status = 'approved') as total_skills,
  (SELECT count(*) FROM connectors) as total_connectors,
  (SELECT count(*) FROM plugins) as total_plugins,
  (SELECT count(DISTINCT category) FROM skills) as total_categories,
  (SELECT sum(install_count) FROM skills) as total_installs;

SELECT cron.schedule('refresh-stats', '0 * * * *', 'REFRESH MATERIALIZED VIEW directory_stats_mv');
```

Actualizar edge function para usar `SELECT * FROM directory_stats_mv`.

**Test:** `get_directory_stats` y `a2a_query(catalog_stats)` deben coincidir.

---

### 1.2 Audit y Fix Install Counts [M]
**Problema:** 6+ skills con exactamente 261,003 installs. Datos fabricados del bulk import.

**Solución:**

```sql
-- Auditar clusters sospechosos
SELECT install_count, count(*) as num_skills
FROM skills
GROUP BY install_count
HAVING count(*) > 3
ORDER BY num_skills DESC;

-- Resetear los inflados
UPDATE skills SET install_count = 0
WHERE install_count IN (
  SELECT install_count FROM skills
  GROUP BY install_count HAVING count(*) > 5
);

-- Agregar tracking de fuente
ALTER TABLE skills ADD COLUMN install_count_source TEXT DEFAULT 'imported';
ALTER TABLE skills ADD COLUMN install_count_verified BOOLEAN DEFAULT false;
```

**Test:** `list_popular_skills` no debe mostrar empates en números sospechosos.

---

### 1.3 Fix Slug Collisions [L]
**Problema:** Slug "slack" → "Browser automation CLI", slug "github" → "React Native skills".

**Solución:**

```sql
-- Identificar colisiones skill vs connector
SELECT s.slug, s.name, s.repo_url, c.slug as connector_slug
FROM skills s
JOIN connectors c ON s.slug = c.slug;

-- Renombrar skills con slug conflictivo: {org}-{repo}-{skill-folder}
-- slack (vercel-labs/agent-browser) → vercel-labs-agent-browser
-- github (callstackincubator) → callstack-agent-skills

-- Tabla de redirects para backward compatibility
CREATE TABLE slug_redirects (
  old_slug TEXT PRIMARY KEY,
  new_slug TEXT NOT NULL,
  item_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index para prevenir futuras colisiones
CREATE UNIQUE INDEX idx_skills_slug_unique ON skills(slug);
```

**Regla para imports futuros:** Slugs de common words (que matcheen un connector) siempre usan formato prefijado.

**Test:** `explain_combination(['slack', 'github'])` no retorna datos incorrectos.

---

### 1.4 Fix get_skill_content [M]
**Problema:** Retorna solo el install command, no el SKILL.md real.

**Solución:**

```typescript
async function fetchSkillMd(skill: Skill): Promise<string> {
  // Si ya tenemos contenido real, retornarlo
  if (skill.skill_md && skill.skill_md.length > 100) {
    return skill.skill_md;
  }
  // Fetch desde GitHub
  const rawUrl = `https://raw.githubusercontent.com/${skill.repo_owner}/${skill.repo_name}/main/skills/${skill.folder_name}/SKILL.md`;
  const resp = await fetch(rawUrl);
  if (resp.ok) {
    const content = await resp.text();
    // Cache en DB
    await supabase.from('skills').update({ skill_md: content }).eq('slug', skill.slug);
    return content;
  }
  return `# ${skill.name}\n\nSKILL.md not available. Install: \`${skill.install_command}\``;
}
```

**Schema:**
```sql
ALTER TABLE skills ADD COLUMN skill_md_status TEXT DEFAULT 'pending';
-- 'pending', 'fetched', 'not_found', 'error'
```

**Test:** `get_skill_content('coding-agent')` retorna SKILL.md completo, no solo install command.

---

### 1.5 GitHub Metadata Enrichment Pipeline [L]
**Problema:** Skills sin datos reales de GitHub. Connectors con stars infladas.

**Schema:**
```sql
CREATE TABLE github_metadata (
  repo_full_name TEXT PRIMARY KEY,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  license TEXT,
  last_commit_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  contributor_count INTEGER DEFAULT 0,
  topics TEXT[],
  description TEXT,
  readme_md TEXT,
  archived BOOLEAN DEFAULT false,
  fetched_at TIMESTAMPTZ DEFAULT now()
);
```

**Edge Function `enrich-github-metadata`:**
1. Query skills/connectors con `fetched_at IS NULL OR fetched_at < now() - interval '7 days'`
2. Parsear `repo_full_name` de `repo_url`
3. Llamar GitHub API: `GET /repos/{owner}/{repo}` (PAT read-only, 5000 req/hour)
4. Batches de 500
5. Upsert en `github_metadata`

**Cron:**
```sql
SELECT cron.schedule('enrich-github', '0 3 * * *',
  $$ SELECT net.http_post('https://<project>.supabase.co/functions/v1/enrich-github-metadata', ...) $$
);
```

**Test:** `get_trust_report` muestra stars reales, last commit, license.

---

## Phase 2: Catalog Completeness

### 2.1 Skills.sh Scraper/Sync [XL]
**Objetivo:** Importar ~50K+ skills faltantes de skills.sh.

**Staging table:**
```sql
CREATE TABLE skills_import_staging (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL, -- 'skills.sh'
  source_slug TEXT,
  name TEXT,
  repo_url TEXT,
  install_command TEXT,
  description TEXT,
  category TEXT,
  dedup_status TEXT DEFAULT 'pending', -- 'pending', 'new', 'duplicate', 'merge'
  matched_existing_slug TEXT,
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Pipeline:**
1. Scrape skills.sh (API si la tienen, o scrape de HTML)
2. Insertar en `skills_import_staging`
3. Dedup check por `repo_url`, `install_command`, y `normalized_name`
4. Para `new`: insertar en `skills` con `status = 'auto-imported'`, `install_count = 0`
5. Generar slugs como `{org}-{repo}-{skill-folder}` para evitar colisiones
6. Queue para GitHub enrichment (1.5) y embedding generation

**Dedup SQL:**
```sql
-- Match by repo URL (most reliable)
SELECT slug FROM skills WHERE repo_url = $1;
-- Match by normalized name
SELECT slug FROM skills WHERE lower(replace(name, '-', ' ')) = lower(replace($1, '-', ' '));
-- Match by install command
SELECT slug FROM skills WHERE install_command = $1;
```

**Dep:** Requiere 1.3 (slug fix) completado primero.

**Test:** `a2a_query(catalog_stats)` muestra 85K+ skills. Spot-check 20 random imports.

---

### 2.2 Ongoing Sync Schedule [M]
```sql
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  new_count INTEGER,
  updated_count INTEGER,
  skipped_count INTEGER,
  error_log JSONB
);
```
Sync semanal via pg_cron. Solo procesar entries más nuevos que último sync exitoso.

**Test:** Correr sync dos veces. Segunda vez: 0 nuevos (no duplicados).

---

### 2.3 Bulk SKILL.md Fetching [M]
Para todos los skills con `repo_url` válida, fetch SKILL.md y guardar en columna `skill_md`. Batches de 100, respetando rate limits de GitHub.

**Target:** 80%+ de skills con `skill_md_status = 'fetched'` y contenido > 100 chars.

---

## Phase 3: Fix Critical MCP Tools

### 3.1 Fix solve_goal (CRÍTICO) [L]
**Problema:** Retorna vacío 2/3 veces. Clasifica mal los goals.

**Solución - Fallback Chain:**

```typescript
async function solveGoal(goal: string, ...params) {
  // 1. Keyword-to-domain mapping PRIMERO (rápido, preciso)
  const domainMatch = matchDomainKeywords(goal);

  // 2. Template matching
  const templateMatch = await matchGoalTemplate(goal);
  if (templateMatch && templateMatch.confidence > 0.7) {
    return formatTemplateResponse(templateMatch);
  }

  // 3. LLM classification con timeout de 8s
  try {
    const llmResult = await withTimeout(classifyAndRecommend(goal, params), 8000);
    if (llmResult?.options?.length > 0) return formatLlmResponse(llmResult);
  } catch (e) {
    console.error('LLM classification failed:', e);
  }

  // 4. Fallback: semantic search cross-catalog
  const [skills, connectors, plugins] = await Promise.all([
    semanticSearch(goal, { limit: 3 }),
    searchConnectors(goal, { limit: 3 }),
    searchPlugins(goal, { limit: 3 }),
  ]);

  // 5. NUNCA retornar vacío
  if (!skills.length && !connectors.length && !plugins.length) {
    return formatNotFound(goal);
  }
  return formatFallbackResponse(goal, skills, connectors, plugins);
}
```

**Keyword-to-domain mapping (fix clasificación):**
```typescript
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  'advertising': ['meta ads', 'facebook ads', 'google ads', 'tiktok ads', 'ppc', 'ad campaign'],
  'email': ['email marketing', 'newsletter', 'drip campaign', 'mailchimp'],
  'social_media': ['social media', 'instagram', 'twitter', 'linkedin post'],
  'devops': ['kubernetes', 'docker', 'ci/cd', 'deploy', 'infrastructure'],
  'finance': ['expenses', 'budget', 'accounting', 'invoicing', 'financial'],
  // ... 30+ mappings
};
```

**Regla de oro:** `if (!result || result.trim() === '') return fallback(goal);`

**Test:** 20 goals diversas, 0 retornos vacíos, relevancia validada manualmente.

---

### 3.2 Fix search_skills Recall [M]
**Problema:** No encuentra "Social Autoposter" al buscar "automate social media posting".

**Solución: PostgreSQL Full-Text Search + Trigram fallback:**

```sql
-- Agregar tsvector
ALTER TABLE skills ADD COLUMN search_vector tsvector;

UPDATE skills SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'D');

CREATE INDEX idx_skills_search ON skills USING gin(search_vector);

-- Trigger para auto-update
CREATE TRIGGER trg_skills_search
  BEFORE INSERT OR UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION skills_search_trigger();
```

**Query actualizado:**
```sql
SELECT *, ts_rank(search_vector, websearch_to_tsquery('english', $1)) as rank
FROM skills
WHERE search_vector @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC LIMIT $2;
```

**Fallback trigram si FTS = 0 results:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SELECT *, similarity(name || ' ' || description, $1) as sim
FROM skills WHERE similarity(name || ' ' || description, $1) > 0.1
ORDER BY sim DESC LIMIT $2;
```

**Test:** `search_skills("automate social media posting")` retorna Social Autoposter.

---

### 3.3 Fix recommend_for_task Relevance [M]
**Problema:** Ranking por install_count (datos fake) → resultados irrelevantes.

**Solución: Semantic search como candidate generator + re-ranking:**

```typescript
async function recommendForTask(task: string, role?: string) {
  // 1. Semantic search para candidatos relevantes (top 20)
  const candidates = await semanticSearchInternal(task, { limit: 20 });

  // 2. Scoring compuesto
  const scored = candidates.map(skill => ({
    ...skill,
    final_score:
      0.7 * skill.similarity +       // Relevancia semántica
      0.2 * computeQualityScore(skill) + // Calidad (stars, trust, content)
      0.1 * roleBoost(skill, role)    // Boost por rol
  }));

  scored.sort((a, b) => b.final_score - a.final_score);
  return scored.slice(0, 5);
}
```

**Dep:** Requiere 1.2 (install counts limpios).

**Test:** `recommend_for_task("crear contenido para redes sociales")` retorna skills de marketing/social.

---

### 3.4 Fix validate_skill [S]
**Problema:** "Validation failed: 400" sin detalles.

**Solución: Validación local como fallback:**

```typescript
function localValidation(skillMd: string) {
  const errors: string[] = [];
  if (!skillMd.startsWith('#')) errors.push('Must start with # Title');
  if (skillMd.length < 50) errors.push('Too short (min 50 chars)');
  if (!skillMd.includes('##')) errors.push('Missing ## subsections');
  if (!/instruction|usage|when to use/i.test(skillMd)) {
    errors.push('Missing instructions section');
  }
  return {
    valid: errors.length === 0,
    errors,
    suggestions: ['See https://skills.pymaia.com/docs/skill-format'],
    quality_score: Math.max(0, 100 - errors.length * 20)
  };
}
```

**Test:** Input minimal retorna errores específicos, no "400".

---

### 3.5 Fix Error Handling (All 50 tools) [M]
**Regla:** Ninguna tool retorna vacío. Siempre JSON con `error` + `suggestion`.

**Wrapper compartido:**
```typescript
// _shared/error-handler.ts
function wrapHandler(handler: Function) {
  return async (req: Request) => {
    try {
      const result = await handler(req);
      if (!result || result === '') {
        return jsonResponse({ error: 'No results found', suggestion: 'Try broader keywords' });
      }
      return result;
    } catch (error) {
      return jsonResponse({
        error: 'Internal error',
        message: error.message,
        suggestion: 'Please try again'
      });
    }
  };
}
```

**Test:** 50 tools × 2 (valid + invalid input) = 100 tests. 0 vacíos.

---

## Phase 4: Recommendations Engine

### 4.1 Composite Quality Ranking [M]

```sql
ALTER TABLE skills ADD COLUMN quality_rank FLOAT DEFAULT 0;

-- Recompute via pg_cron diario
UPDATE skills s SET quality_rank =
  COALESCE(0.25 * LEAST(gm.stars, 10000) / 10000.0, 0) +     -- GitHub stars
  COALESCE(0.20 * (s.rating / 5.0), 0) +                      -- Rating
  COALESCE(0.15 * s.trust_score / 100.0, 0) +                  -- Trust
  COALESCE(0.15 * CASE WHEN s.skill_md IS NOT NULL
    AND length(s.skill_md) > 200 THEN 1 ELSE 0 END, 0) +      -- Has content
  COALESCE(0.10 * CASE WHEN gm.last_commit_at > now() - interval '90 days' THEN 1
    WHEN gm.last_commit_at > now() - interval '365 days' THEN 0.5
    ELSE 0 END, 0) +                                           -- Recency
  COALESCE(0.10 * CASE WHEN s.install_count_source = 'tracked'
    THEN LEAST(s.install_count, 1000) / 1000.0 ELSE 0 END, 0) + -- Verified installs
  COALESCE(0.05 * s.review_count / 50.0, 0)                    -- Engagement
FROM github_metadata gm
WHERE s.repo_url LIKE '%' || gm.repo_full_name || '%';
```

**Dep:** 1.2 + 1.5

---

### 4.2 Category-Aware Recommendations [S]

```typescript
const TASK_CATEGORY_MAP: Record<string, string[]> = {
  'social media': ['marketing', 'automatización', 'ventas'],
  'code review': ['desarrollo', 'productividad'],
  'legal contract': ['legal'],
  'data analysis': ['datos', 'ia'],
};
```

Boost 1.5x a resultados que matcheen categoría inferida.

---

### 4.3 Semantic Similarity for All Recommendations [M]
Todas las recommendation paths (recommend_for_task, solve_goal, search_by_role, get_role_kit) usan vector similarity como first-pass candidate generator.

Para skills sin embeddings (nuevos imports): generar en batch via edge function.

---

## Phase 5: Ecosystem Features

### 5.1 Creator Profiles [M]

```sql
CREATE TABLE creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  github_username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  skill_count INTEGER DEFAULT 0,
  total_installs INTEGER DEFAULT 0,
  avg_rating FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Populate from existing data
INSERT INTO creators (github_username, skill_count)
SELECT
  split_part(replace(repo_url, 'https://github.com/', ''), '/', 1),
  count(*)
FROM skills WHERE repo_url LIKE 'https://github.com/%'
GROUP BY 1 HAVING count(*) >= 2;
```

Enriquecer via GitHub API (avatar, bio, display name).

---

### 5.2 Auto-Generate Bundles [M]

```sql
CREATE TABLE bundles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT,
  skill_slugs TEXT[] NOT NULL,
  connector_slugs TEXT[],
  plugin_slugs TEXT[],
  auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Generar bundles para: developer, marketer, designer, data-analyst, founder, lawyer, devops.
Top 5-10 skills por rol usando `quality_rank` + filtro por categoría.
Refresh semanal via pg_cron.

---

### 5.3 Seed Community Templates [S]
Pre-seed 20-30 templates para use cases comunes:
- Social Media Automation, Code Review Pipeline, CI/CD Setup, Customer Support, E-commerce Analytics, Legal Contract Review, Data Pipeline, etc.

Marcar como `source: 'curated'`.

---

### 5.4 Real Trending Data [L]

```sql
CREATE TABLE usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'view', 'install_copied', 'search_appeared', 'recommended'
  item_slug TEXT NOT NULL,
  item_type TEXT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_events_slug_time ON usage_events(item_slug, created_at);
```

Instrumentar todas las edge functions para loguear eventos.
`trending_solutions` consulta eventos reales de los últimos 7 días.

---

## Dependency Graph

```
Phase 1.1 (stats)        ──→ independiente
Phase 1.2 (installs)     ──→ independiente
Phase 1.3 (slugs)        ──→ independiente (ANTES de Phase 2)
Phase 1.4 (content)      ──→ independiente
Phase 1.5 (GitHub data)  ──→ independiente

Phase 2.1 (scraper)      ──→ depende de 1.3
Phase 2.2 (sync)         ──→ depende de 2.1
Phase 2.3 (SKILL.md)     ──→ depende de 1.4, 1.5

Phase 3.1 (solve_goal)   ──→ beneficia de 1.2
Phase 3.2 (search FTS)   ──→ independiente
Phase 3.3 (recommend)    ──→ depende de 1.2
Phase 3.4 (validate)     ──→ independiente
Phase 3.5 (errors)       ──→ independiente

Phase 4.1 (quality rank) ──→ depende de 1.2, 1.5
Phase 4.2 (categories)   ──→ depende de 4.1
Phase 4.3 (semantic)     ──→ depende de embeddings existentes

Phase 5.1 (creators)     ──→ depende de 1.5
Phase 5.2 (bundles)      ──→ depende de 4.1
Phase 5.3 (templates)    ──→ independiente
Phase 5.4 (trending)     ──→ independiente
```

---

## Testing Strategy

1. **Regression suite:** Re-correr los 44 tests del audit después de cada sprint
   - Target Sprint 1: 30/44 pass
   - Target Sprint 3: 44/44 pass
2. **Data integrity (pg_cron diario):**
   - No slugs duplicados
   - No clusters de install_count > 5
   - Stats view = live count
3. **Performance:**
   - search_skills < 500ms
   - solve_goal < 10s
   - get_directory_stats < 100ms

---

## Schema Changes Summary

### New Tables
| Table | Phase | Purpose |
|---|---|---|
| `github_metadata` | 1.5 | Cache de datos GitHub |
| `slug_redirects` | 1.3 | Backward compat para slugs renombrados |
| `skills_import_staging` | 2.1 | Staging para bulk imports |
| `sync_log` | 2.2 | Audit trail de imports |
| `creators` | 5.1 | Perfiles de creadores |
| `usage_events` | 5.4 | Tracking de uso real |

### Altered Tables
| Table | Column | Phase |
|---|---|---|
| `skills` | `install_count_source` | 1.2 |
| `skills` | `install_count_verified` | 1.2 |
| `skills` | `skill_md_status` | 1.4 |
| `skills` | `search_vector` (tsvector) | 3.2 |
| `skills` | `quality_rank` | 4.1 |

### Edge Functions to Create/Modify
| Function | Action | Phase |
|---|---|---|
| `get-directory-stats` | Fix: usar materialized view | 1.1 |
| `get-skill-content` | Fix: fetch real SKILL.md | 1.4 |
| `enrich-github-metadata` | NEW | 1.5 |
| `skills-sh-scraper` | NEW | 2.1 |
| `solve-goal` | REWRITE: fallback chain | 3.1 |
| `search-skills` | REWRITE: FTS + trigram | 3.2 |
| `recommend-for-task` | REWRITE: semantic + quality | 3.3 |
| `validate-skill` | Fix: local validation fallback | 3.4 |
| `_shared/error-handler` | NEW: wrapper para las 50 tools | 3.5 |
| `compute-quality-rank` | NEW: periodic computation | 4.1 |
| `get-top-creators` | REWRITE: usar creators table | 5.1 |
| `trending-solutions` | REWRITE: usar usage_events | 5.4 |
