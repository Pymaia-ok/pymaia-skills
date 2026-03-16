## Plan: 11 Fixes Post-Audit — Estado: ✅ Implementado

### Fix 1: generate-embeddings ✅
- batch_size default: 20 → 100
- Retry con backoff (2 intentos, 5s delay)
- sync_log al inicio y final
- Error logging mejorado

### Fix 2: bulk-fetch-skill-content ✅
- batch_size default: 100 → 50
- Delay 1s cada 10 requests
- Manejo de 403/429 con break + rateLimited flag
- sync_log integrado

### Fix 3: enrich-github-metadata ✅
- Paginación completa (eliminado limit(1000))
- Set-difference: solo fetch repos sin metadata fresca (<7 días)
- sync_log integrado

### Fix 4: Install counts inflados ✅
- Migración SQL: reset install_count=0 donde source != 'tracked'

### Fix 5: Slug collisions ✅
- Migración SQL con DO block: 55 colisiones resueltas
- Slugs renombrados a formato org-repo con suffix dedup
- Redirects insertados en slug_redirects

### Fix 6: Usage events + MCP instrumentation ✅
- RLS ya existía (INSERT para anon+authenticated)
- logUsageEvent/logUsageEvents: .catch(() => {}) → .catch(e => console.error(...))
- Nuevo helper logToolCall() para agent_analytics
- search_skills instrumentado con logToolCall

### Fix 7: scrape-skills-sh ✅
- Fallback multi-URL: sitemap.xml → sitemap-skills.xml → sitemap-0.xml
- Error handling mejorado con consume body

### Fix 8: Bundles incompletos ✅
- 10 nuevos roles agregados a ROLE_CONFIG: teacher, doctor, consultant, accountant, writer, researcher, customer-support, ecommerce-manager, content-creator, project-manager
- Total: 20 roles (de 10 a 20)

### Fix 9: Quality rank sin GitHub data ✅
- recompute_quality_ranks() con fórmula adaptativa
- Con github_metadata: pesos originales (25% stars, 10% recency)
- Sin github_metadata: redistribuye a rating (30%), trust (25%), docs (20%), installs (15%), engagement (10%)

### Fix 10: sync_log en pipelines ✅
- Agregado a: generate-embeddings, bulk-fetch-skill-content, enrich-github-metadata
- scrape-skills-sh ya lo tenía

### Fix 11: Crons duplicados ✅
- Eliminados: generate-embeddings-6h, recompute-quality-ranks, refresh-directory-stats, bulk-fetch-skill-content-daily, bulk-skillmd-imports, enrich-github-metadata-daily
- Actualizado generate-embeddings-auto con batch_size=100

### Pendiente para siguiente mensaje:
- Instrumentar logToolCall() en los ~40 tools restantes del MCP server (Fix 6 parcial)
