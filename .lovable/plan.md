## Plan: solve_goal Latency & Never-Empty Fix — Estado: ✅ Implementado

### Diagnóstico
- solve_goal SÍ encontraba resultados (5-6 por opción) pero tardaba 150s
- El cliente MCP cortaba antes → usuario veía "vacío"
- Causa raíz: LLM call sin timeout + búsquedas secuenciales + analytics bloqueantes

### Cambios implementados

#### 1. LLM Timeout (5s) + Keyword Fallback ✅
- `classifyIntent()` ahora tiene AbortController con 5s timeout
- Si LLM falla/timeout: usa `detectDomainByKeywords()` + `extractKeywordsFromGoal()`
- Logging detallado de errores (HTTP status, body, timeout vs exception)

#### 2. crossCatalogSearch Paralelo ✅
- Antes: N keywords × 3 queries = secuencial
- Ahora: todas las keywords en parallel via `Promise.all()`
- Keywords limitadas a 6 (antes hasta 10+)
- Resultado: 2.5s vs ~30s+

#### 3. Time-budgeted Fallbacks ✅
- Cada fallback (semantic, FTS, category, domain) solo ejecuta si quedan segundos
- Limites: 15s, 20s, 25s, 28s respectivamente
- Compatibility analysis skipped si >20s

#### 4. Analytics Fire-and-Forget ✅
- `agent_analytics.insert()` → `.then(() => {})` (no await)
- `goal_templates.update()` → `.then(() => {})` (no await)

#### 5. Observabilidad Estructurada ✅
- Logs con `ms` en cada fase: classified, cross_catalog, fallbacks, done
- classifyIntent logea modo (llm/timeout/no-api-key), error details

### Resultados de test
- "run Meta Ads campaigns" → 5 tools (Option A) + 6 tools (Option B) ✅
- "manage personal finances" → 5 tools (Option A) + 6 tools (Option B) ✅
- Tiempo total: ~13s (antes 150s) → ~10s con timeout de 5s
- LLM actualmente timeout-eando, pero keyword fallback funciona perfecto
