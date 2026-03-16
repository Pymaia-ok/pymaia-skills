## Plan: PRD Final Polish — Estado: ✅ Implementado

### Fixes implementados

#### Fix 1: 3 Pipeline Crons ✅
- `generate-embeddings-auto`: cada 5 min, batch 100
- `bulk-fetch-skill-content-auto`: cada 10 min, batch 50
- `enrich-github-metadata-auto`: cada 15 min, batch 400

#### Fix 2: Limpieza de duplicados ✅
- Eliminados 6 crons duplicados: sync-skills (3), sync-connectors (2), discover-trending (1)
- 33 → ~27 crons activos

#### Fix 3: Reducción de timeouts ✅
- auto-approve: 3min → 10min
- verify-security: 10min → 30min
- scan-security: 15min → 30min
- calculate-trust: 15min → 30min
- enrich-skills-ai: 30min → 2h
- translate-skills: 30min → 3h
- MAX_RUNTIME 50s guard en enrich-github-metadata y bulk-fetch-skill-content

#### Fix 4: Filtrado de tools irrelevantes ✅
- Añadidos a SOLVE_GOAL_EXCLUDED_SLUGS: firebase, neverinfamous-memory-journal-mcp, frago
- DOMAIN_CATEGORY_MAP: penalización -5 puntos para tools de categorías no relacionadas al dominio detectado

#### Fix 5: Zero-signal skills marcados ✅
- quality_rank = 0.01 para skills con 0 rating, 0 installs, 0 trust score

#### Fix 6: Quality Rank Distribution
- Se resuelve automáticamente cuando los crons de Fix 1 pueblen github_metadata y ejecuten recompute_quality_ranks()

#### Fix 7: scrape-skills-sh Diagnostic
- Pendiente diagnóstico manual post-deployment
