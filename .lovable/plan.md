## Plan: PRD Final V2 — Estado: ✅ Implementado

### Fixes implementados

#### Fix 1: generate-embeddings batch 25 + error logging ✅
- Default `batch_size` reducido de 100 a **25**
- Error logging agregado al sync_log en caso de fallo
- Cron rescheduled a `*/3` (offset +1)

#### Fix 2: scrape-skills-sh slug collisions ✅
- Import cambiado de batch insert a **individual upserts** con error handling por fila
- Siempre usa prefixed slug: `{owner}-{repo}-{skill_folder}`
- Columna `error_message` agregada a `skills_import_staging`

#### Fix 3: Tools irrelevantes — Exclusiones expandidas + Penalización más fuerte ✅
- Nuevos slugs excluidos: `claude-code-cwd-tracker`, `avisangle-calculator-server`, `multi-mcp`, `ui-ticket-mcp`
- `DOMAIN_CATEGORY_MAP` actualizado con categorías españolas del catálogo real
- Penalización domain-category aumentada de -5 a `score *= 0.2` (80%)
- Penalización de connectors sin overlap de palabras del goal: `score *= 0.1` (90%)

#### Fix 4: Limpieza de crons duplicados ✅
- Eliminado `monorepo-scan-3d` duplicado (jobid 72)
- 30 → 29 crons

#### Fix 5: enrich-github-metadata parallelizado ✅
- Batch reducido de 400 a **150**
- Procesamiento en paralelo (batches de 5)
- Cron: `*/10` (staggered a offset +2)

#### Fix 6: bulk-fetch-skill-content acelerado ✅
- Cron: `*/10` → `*/5` (staggered a offset +3)

#### Fix 7: Crons staggered ✅
- `calculate-trust-score`: `5,35 * * * *`
- `scan-security`: `10,40 * * * *`
- `verify-security`: `15,45 * * * *`
- `generate-embeddings`: offset +1 cada 3 min
- `bulk-fetch-skill-content`: offset +3 cada 5 min
- `enrich-github-metadata`: offset +2 cada 10 min

### Estado final: 29 crons activos, todos staggered
