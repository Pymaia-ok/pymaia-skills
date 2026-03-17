## Plan: PRD Audit de Mejoras — Estado: ✅ Implementado

### Fixes implementados (8 de 14)

#### Fix 2: API Key Hashing con Salt ✅
- `manage-api-keys/index.ts`: Salt generation + hash con `salt+key`
- Columna `key_salt` agregada a `api_keys`
- Función `validate_api_key_salted()` creada con backward compat para keys legacy sin salt

#### Fix 3: Silent Failures → Error Logging ✅
- `_shared/error-helpers.ts`: Helpers `errorResponse()` y `logFailure()`
- `poll-vt-pending`: Catches ahora logean a `automation_logs`
- `rescan-security`: Catches ahora logean a `automation_logs`

#### Fix 4: CORS Restrictivo — Skip (solo nota)
- El `*` es intencional para MCP/A2A. No se restringe.

#### Fix 6: Indexes faltantes ✅
- `idx_skills_creator_id`
- `idx_mcp_servers_category`
- `idx_plugins_creator_id`
- `idx_course_modules_course_order`

#### Fix 7: Rate Limiting ✅
- `generate-blog-post`: Max 5 posts/hora (verifica automation_logs)

#### Fix 10: Error Responses Estandarizadas ✅
- `_shared/error-helpers.ts` con `errorResponse()` helper

#### Fix 12: Code Splitting ✅
- `App.tsx`: 20+ páginas lazy-loaded con `React.lazy()` + `Suspense`
- Solo Index, Explore, SkillDetail, Auth, NotFound se cargan eagerly

#### Fix 14: Frontend Cleanup ✅
- `SkillCard.tsx`: Wrapped con `React.memo`
- `GlobalSearch.tsx`: Ya tenía debounce (300ms keyword, 500ms intent) — verificado OK

### Fixes descartados
| Fix | Razón |
|---|---|
| 1. SQL Injection | No existe — usa RPC parametrizado |
| 5. RLS tablas | Ya implementado |
| 8. Env var validation | Menor impacto |
| 9. Hardcoded endpoints | Bajo valor |
| 11. TypeScript types | Auto-generado |
| 13. NOT NULL | Riesgoso con 37K+ filas |
