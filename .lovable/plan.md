

# Análisis del PRD Audit de Mejoras — Qué es real vs qué no aplica

## Hallazgos verificados contra el código actual

### ❌ Fix 1: SQL Injection en smart-search — **NO APLICA**
El PRD dice que `topic.category` y `topicKeywords` se interpolan en filtros Postgrest. Pero el código real (líneas 124-133) usa `supabase.rpc("search_skills", { search_query: kw, ... })` — **llamadas parametrizadas a una función RPC**, no interpolación de strings en filtros. No hay SQL injection aquí.

### ✅ Fix 2: API Key Hashing sin Salt — **VÁLIDO**
Confirmado: `manage-api-keys/index.ts` línea 80 usa `sha256(plainKey)` sin salt. Mejora legítima de seguridad.

### ✅ Fix 3: Silent Failures — **VÁLIDO pero bajo impacto**
Correcto que hay catches silenciosos. Crear un helper `logFailure` compartido y usarlo en `poll-vt-pending`, `send-email`, `refresh-catalog-data`, `rescan-security` es buena práctica.

### ⚠️ Fix 4: CORS Restrictivo — **NO RECOMENDADO**
El `*` es **intencional**. El MCP server, trust-score-api, y muchas funciones son APIs públicas consumidas por agentes externos (Claude, Cursor, etc.). Restringir CORS rompería el protocolo MCP y el A2A. Las funciones que SÍ son solo para el frontend (manage-api-keys, enroll-sequence) podrían tener CORS restringido, pero el 80% de las funciones necesitan `*`.

### ❌ Fix 5: RLS en 3 tablas — **YA IMPLEMENTADO**
Verifiqué en la DB: las 3 tablas (`goal_templates`, `monorepo_registry`, `email_unsubscribe_tokens`) ya tienen `rowsecurity = true`. Este fix ya se hizo.

### ✅ Fix 6: Indexes faltantes — **PARCIALMENTE VÁLIDO**
- `idx_skills_creator_id` — **Falta**, vale la pena
- `idx_mcp_servers_category` — **Falta**, vale la pena
- `idx_plugins_creator_id` — **Falta**, vale la pena
- `idx_course_progress_course_user` — Ya existe un unique index `(user_id, module_id)`
- `idx_course_modules_course_order` — **Falta**, vale la pena

### ✅ Fix 7: Rate Limiting — **VÁLIDO**
Funciones costosas como `generate-blog-post` y `regen-blog-covers` no tienen límites. Buena mejora.

### ⚠️ Fix 8: Validación de env vars — **MENOR**
`smart-search` ya valida `LOVABLE_API_KEY` (línea 23). Algunas funciones podrían beneficiarse pero la mayoría ya tienen validación o fallan con error claro.

### ⚠️ Fix 9: Hardcoded API endpoints — **BAJO VALOR**
El endpoint Lovable AI Gateway es estable y gestionado por la plataforma. Extraerlo a env var agrega complejidad sin beneficio real — si cambia, hay que redeploy de todas formas.

### ✅ Fix 10: Error responses estandarizadas — **VÁLIDO**
Un helper `errorResponse` compartido mejoraría consistencia.

### ⚠️ Fix 11: TypeScript types — **NO EDITABLE**
`types.ts` se auto-genera. Los `as any` se resuelven mejor con interfaces locales en `api.ts`.

### ✅ Fix 12: Code splitting — **VÁLIDO y buen impacto**
25+ páginas en un bundle es mejorable. Lazy-load de Admin, CrearSkill, CourseDetail, ApiDocs, BlogPost tiene sentido.

### ⚠️ Fix 13: NOT NULL constraints — **RIESGOSO**
Agregar NOT NULL a columnas existentes con 37K+ filas puede romper imports que no setean esos campos. Mejor dejarlo con `COALESCE` en queries.

### ✅ Fix 14: Frontend cleanup — **VÁLIDO**
Debounce en GlobalSearch, memo en SkillCard, limpiar console.logs — todo bueno.

---

## Resumen: Qué implementar

| Fix | Veredicto | Acción |
|---|---|---|
| 1. SQL Injection | ❌ No existe | Skip |
| 2. API Key salt | ✅ Real | **Implementar** |
| 3. Silent failures | ✅ Real | **Implementar** |
| 4. CORS restrictivo | ⚠️ Rompería MCP | **Solo en 2-3 funciones privadas** |
| 5. RLS tablas | ❌ Ya hecho | Skip |
| 6. Indexes | ✅ Parcial | **Implementar 4 de 5** |
| 7. Rate limiting | ✅ Real | **Implementar** |
| 8. Env var validation | ⚠️ Menor | Skip |
| 9. Hardcoded endpoints | ⚠️ Bajo valor | Skip |
| 10. Error responses | ✅ Real | **Implementar** |
| 11. TypeScript types | ⚠️ Auto-gen | **Solo interfaces locales** |
| 12. Code splitting | ✅ Buen impacto | **Implementar** |
| 13. NOT NULL | ⚠️ Riesgoso | Skip |
| 14. Frontend cleanup | ✅ Real | **Implementar** |

## Plan de implementación (8 fixes reales)

### Migration SQL
- 4 indexes nuevos (creator_id en skills/plugins, category en mcp_servers, course_order en course_modules)
- Columna `key_salt` en api_keys

### Edge Functions
- `manage-api-keys/index.ts`: Agregar salt generation + hash con salt + backward compat para keys existentes
- `_shared/cors.ts`: Agregar función `getCorsHeaders()` para funciones privadas (manage-api-keys, enroll-sequence)
- `_shared/error-helpers.ts`: Crear `errorResponse()` y `logFailure()` helpers
- Actualizar catches en `poll-vt-pending`, `send-email`, `refresh-catalog-data`, `rescan-security`
- Rate limiting en `generate-blog-post`, `scan-security`, `regen-blog-covers`

### Frontend
- `App.tsx`: Lazy-load 6 páginas (Admin, BlogPost, CrearSkill, CourseDetail, CourseModule, ApiDocs)
- `GlobalSearch.tsx`: Agregar debounce 300ms
- `SkillCard.tsx`: Wrap con React.memo
- Limpiar console.logs de debug en producción

