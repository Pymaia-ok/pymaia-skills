

# Seguridad para Publicación de Repo Público

## Resumen

Implementar las 4 partes del PRD de seguridad: gitignore, CORS restrictivo, migración SQL para eliminar JWT hardcodeados, y protección de endpoints admin.

## Plan de implementación

### 1. `.gitignore` + `.env.example`
- Agregar `.env`, `.env.local`, `.env.*.local`, `.supabase`, `supabase/.temp` al gitignore
- Crear `.env.example` con placeholders

### 2. CORS restrictivo en `_shared/cors.ts`
- Reemplazar `*` con lista de orígenes permitidos (`pymaiaskills.lovable.app`, `mcp.pymaia.com`, `localhost:*`)
- Exportar `getCorsHeaders(req)` + mantener `corsHeaders` estático como fallback apuntando al dominio principal
- Actualizar las ~20 funciones que definen CORS inline para importar de `_shared/cors.ts` en vez de definir `*` localmente

**Funciones con CORS inline a migrar** (encontradas 55 archivos): `auto-approve-skills`, `security-incident`, `rescan-security`, `quality-maintenance`, `refresh-catalog-data`, `sync-antigravity-skills`, `sync-plugins`, `translate-skills`, `generate-course`, `sync-creators`, `sync-connectors`, `sync-skills`, `generate-install-commands`, `scan-security`, `smart-search`, `scrape-skills-sh`, `skill-raw`, `check-mcp-health`, `enrich-skills-ai`, `blog-sitemap`, y más.

### 3. Migración SQL — Eliminar JWT hardcodeados
- Crear migración que re-programe los 2 cron jobs:
  - `regen-truncated-blogs` → usar `current_setting('supabase.url')` + `current_setting('supabase.anon_key')`
  - `generate-embeddings-auto` → idem
- Esto no cambia las migraciones viejas (quedan en historial), pero los jobs activos ya no usarán el token literal

### 4. Admin auth helper + protección de funciones admin
- Crear `_shared/admin-auth.ts` con `validateAdminSecret()` y `unauthorizedResponse()`
- Agregar validación en: `auto-approve-skills`, `security-incident`, `rescan-security`, `quality-maintenance`
- Backward compatible: si `ADMIN_FUNCTION_SECRET` no está configurado, permite acceso (para no romper cron jobs existentes)

### 5. Recordatorio de acciones manuales
Al finalizar, listar las acciones que el usuario debe hacer manualmente:
- Configurar secret `ADMIN_FUNCTION_SECRET`
- Rotar anon key antes de publicar
- Limpiar historial git con `git filter-repo`

## Detalle técnico

| Archivo | Acción |
|---|---|
| `.gitignore` | Agregar exclusiones de .env y .supabase |
| `.env.example` | Crear con placeholders |
| `supabase/functions/_shared/cors.ts` | CORS restrictivo con `getCorsHeaders()` |
| `supabase/functions/_shared/admin-auth.ts` | Crear helper de auth admin |
| ~20 edge functions con CORS inline | Reemplazar por import de shared |
| 4 funciones admin | Agregar `validateAdminSecret()` |
| Nueva migración SQL | Re-programar 2 cron jobs sin JWT hardcodeado |

