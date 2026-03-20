

# Plan: Hardening de Seguridad Pre-Publicación

## Estado actual vs PRD

| ID | Hallazgo | Estado | Acción necesaria |
|----|----------|--------|-----------------|
| S1 | `.env` commiteado | ✅ RESUELTO — repo nuevo, historial limpio | Ninguna |
| S2 | `.gitignore` incompleto | ❌ PENDIENTE — falta `.env`, `.lovable/`, `.env.*` | Actualizar |
| S3 | JWT en migraciones SQL | ✅ RESUELTO — cron jobs ya usan `get_edge_headers()` (vault) | Ninguna |
| S4 | 13 PRDs estratégicos en `.lovable/` | ❌ PENDIENTE — tracked por git | Agregar a `.gitignore` + eliminar del tracking |
| S5 | Admin auth fallback inseguro | ❌ PENDIENTE — permite acceso si no hay secret | Cambiar a denegar |
| S6 | Functions sensibles sin auth | ❌ PENDIENTE — 7 funciones sin protección | Agregar admin auth |
| S7 | CORS con localhost hardcodeado | ⚠️ PARCIAL — `_shared/cors.ts` es correcto pero `manage-api-keys` y `enroll-sequence` tienen CORS inline con localhost | Migrar a shared CORS |

## Implementación

### 1. Actualizar `.gitignore` + eliminar `.lovable/` del tracking (S2 + S4)
- Agregar: `.env`, `.env.*`, `.env.local`, `.env.production`, `.lovable/`, `*.pem`, `*.key`, `secrets/`
- Los 13 archivos `.lovable/*.md` dejarán de ser tracked en el próximo push

### 2. Fix admin auth fallback (S5)
- Archivo: `supabase/functions/_shared/admin-auth.ts`
- Cambiar: si `ADMIN_FUNCTION_SECRET` no está configurado → denegar acceso (no permitir)
- Eliminar: fallback de anon key (líneas 35-39) — ya no necesario porque cron jobs usan service role key

### 3. Proteger funciones sensibles sin auth (S6)
Agregar `validateAdminRequest` a estas funciones que hoy NO tienen protección:

| Función | Auth actual | Acción |
|---------|------------|--------|
| `send-email` | Ninguna | Agregar admin auth |
| `process-email-queue` | Ninguna | Agregar admin auth |
| `import-skills-csv` | Ninguna | Agregar admin auth |
| `generate-blog-post` | Ninguna | Agregar admin auth |
| `generate-course` | Ninguna | Agregar admin auth |
| `regen-blog-covers` | Ninguna | Agregar admin auth |

Nota: `manage-api-keys` ya valida JWT del usuario (línea 49-55), OK.

### 4. Migrar CORS inline a shared (S7)
- `manage-api-keys/index.ts`: eliminar CORS local (líneas 4-19), usar import de `_shared/cors.ts`
- `enroll-sequence/index.ts`: eliminar CORS local (líneas 5-20), usar import de `_shared/cors.ts`

### Funciones que correctamente NO necesitan cambio
- `mcp-server` — API pública con API keys propias
- `trust-score-api`, `plugin-registry`, `skill-raw` — APIs públicas de consulta
- `semantic-search`, `smart-search`, `fetch-readme` — búsqueda pública
- `sync-*`, `discover-*`, `enrich-*` — llamados por cron con service role key
- `auto-approve-skills`, `security-incident`, `rescan-security`, `quality-maintenance` — ya tienen `validateAdminRequest`

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `.gitignore` | Agregar exclusiones de `.env`, `.lovable/`, etc. |
| `_shared/admin-auth.ts` | Denegar si no hay secret; eliminar fallback anon key |
| `send-email/index.ts` | Agregar admin auth guard |
| `process-email-queue/index.ts` | Agregar admin auth guard |
| `import-skills-csv/index.ts` | Agregar admin auth guard |
| `generate-blog-post/index.ts` | Agregar admin auth guard |
| `generate-course/index.ts` | Agregar admin auth guard |
| `regen-blog-covers/index.ts` | Agregar admin auth guard |
| `manage-api-keys/index.ts` | Eliminar CORS inline, usar shared |
| `enroll-sequence/index.ts` | Eliminar CORS inline, usar shared |

