

# Integrar Plugins Comunitarios de GitHub

## Contexto

Las fuentes que mencionás son valiosas y encajan perfectamente con la infraestructura que ya tenemos. Hay dos topics de GitHub activos (`claude-cowork`, `claude-code-plugin-marketplace`) con plugins comunitarios, y ya tenemos el patrón exacto para descubrirlos, importarlos y auditarlos — lo usamos para skills (`discover-trending-skills`) y conectores (`sync-connectors`).

## Qué aporta esto a la app

- **Catálogo más completo**: Pasar de ~81 plugins oficiales a potencialmente cientos, con descubrimiento automático
- **Diferenciación clara**: Badges de "Anthropic Verified" / "Official" / "Community Verified" / "Community"
- **Confianza**: Auditoría automática de seguridad (misma lógica que `verify-security`) aplicada a plugins comunitarios
- **Actualización continua**: Cron diario que descubre nuevos plugins sin intervención manual

## Plan técnico

### 1. Edge function `sync-plugins` (nueva)

Siguiendo el patrón de `sync-connectors` y `discover-trending-skills`:

- **Fuente 1**: GitHub Topics API — buscar repos con topics `claude-cowork` y `claude-code-plugin-marketplace`
- **Fuente 2**: GitHub Code Search — buscar archivos `plugin.json` en repos con "claude" en el nombre/descripción
- Para cada repo encontrado: extraer nombre, descripción, estrellas, último commit, licencia
- Insertar en tabla `plugins` con `source = 'community'`, `status = 'approved'` (si pasa filtros mínimos), `is_official = false`, `is_anthropic_verified = false`
- Dedup por `slug` con `ON CONFLICT DO NOTHING`
- Inferir `platform` del contenido del repo (buscar "cowork" o "claude-code" en README/topics)
- Inferir `category` con la misma lógica de `inferCategory` que ya usamos

### 2. Edge function `verify-plugin-security` (nueva, o extender `verify-security`)

Extender la función existente `verify-security` para que también procese la tabla `plugins`:
- Verificar licencia, README, actividad reciente
- Marcar `security_status` como `verified` / `unverified` / `flagged`
- Actualizar `github_stars` y `last_commit_at`

### 3. Agregar columnas a tabla `plugins`

Agregar campos que faltan para plugins comunitarios:
- `github_stars` (integer, default 0)
- `last_commit_at` (timestamptz)
- `security_checked_at` (timestamptz)
- `security_notes` (text)

### 4. Cron jobs

- `sync-plugins`: diario (una vez al día, similar a `sync-connectors`)
- `verify-security` extendido: ya corre periódicamente, solo agregar tabla `plugins`

### 5. UI: badges de seguridad en `/plugins`

Ya tenemos los badges de "Anthropic Verified", "Official" y "Community". Agregar:
- **"Verified"** (escudo verde): Plugin comunitario que pasó auditoría de seguridad
- **Aviso amarillo**: Plugin comunitario sin verificar, con warning "Review code before installing"

### 6. Config

Agregar `[functions.sync-plugins]` con `verify_jwt = false` en `config.toml`.

## Archivos a crear/modificar

1. **Migración SQL**: `ALTER TABLE plugins ADD COLUMN github_stars...` (4 columnas)
2. **`supabase/functions/sync-plugins/index.ts`**: Nueva edge function de descubrimiento
3. **`supabase/functions/verify-security/index.ts`**: Extender para incluir tabla `plugins`
4. **`supabase/config.toml`**: Agregar entry para `sync-plugins`
5. **`src/pages/Plugins.tsx`**: Agregar badge "Verified" para comunitarios auditados
6. **`src/pages/PluginDetail.tsx`**: Agregar aviso de seguridad para comunitarios
7. **Cron job SQL**: Programar `sync-plugins` diario

## Resultado

La sección `/plugins` pasa de ser un directorio estático de 81 plugins oficiales a un marketplace vivo con descubrimiento automático, auditoría de seguridad y badges claros de confianza — exactamente como ya funciona para skills y conectores.

