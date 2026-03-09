

# Nueva sección "Plugins" en la app

## Contexto

Los plugins de Claude son **paquetes que combinan MCPs, skills y herramientas en una sola descarga**. Son fundamentalmente diferentes de los conectores (MCPs individuales) y de las skills (archivos de conocimiento). Hay ~81 plugins oficiales en `claude.com/plugins`, divididos en dos plataformas: **Claude Code** y **Cowork**.

## Arquitectura de datos

### Nueva tabla `plugins`

Crear una tabla dedicada (no reutilizar `mcp_servers`) con campos específicos:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid PK | |
| slug | text UNIQUE | `frontend-design`, `sales` |
| name | text | Nombre visible |
| name_es | text | Traduccion |
| description | text | Descripcion en ingles |
| description_es | text | Traduccion |
| platform | text | `claude-code`, `cowork`, `both` |
| is_anthropic_verified | boolean | Badge "Anthropic Verified" |
| is_official | boolean | Listado en claude.com/plugins |
| source | text | `official`, `community`, `user-submitted` |
| install_count | integer | Numero de instalaciones |
| category | text | `development`, `productivity`, `sales`, `finance`, `legal`, `marketing`, etc. |
| homepage | text | URL al plugin |
| github_url | text | Repositorio si es open source |
| icon_url | text | Icono |
| security_status | text | `verified`, `needs-review`, `unverified` |
| creator_id | uuid | Para user-submitted |
| status | text | `approved`, `pending`, `rejected` |
| created_at | timestamptz | |

**RLS**: Misma estrategia que `mcp_servers` — lectura publica para aprobados, gestion admin.

### Importacion inicial

Batch INSERT de los ~81 plugins oficiales extraidos de `claude.com/plugins`:
- 55 plugins de **Claude Code** (Frontend Design, Context7, Superpowers, Code Review, GitHub, etc.)
- 26 plugins de **Cowork** (Sales, Productivity, Marketing, Legal, Finance, Design, HR, etc.)
- Los "Anthropic Verified" se marcan con `is_anthropic_verified = true`
- Los que tienen install count se importan con ese numero
- Todos con `source = 'official'`, `status = 'approved'`

## Paginas nuevas

### `/plugins` — Directorio de plugins

Seguir el patron exacto de `/conectores`:
- Header con titulo y subtitulo
- Barra de busqueda + filtros (plataforma: Claude Code/Cowork, verificacion: Todos/Anthropic Verified/Community)
- Grilla de cards con icono, nombre, descripcion, badges (Anthropic Verified, platform, install count)
- Paginacion o scroll infinito

### `/plugin/:slug` — Detalle de plugin

Seguir el patron de `/conector/:slug`:
- Nombre, descripcion, badge de plataforma y verificacion
- Boton de instalacion (link a `claude.com/plugins/{slug}`)
- Link al repositorio GitHub si existe
- Skills compatibles (cross-reference con nuestra tabla de skills)
- Aviso de seguridad para plugins comunitarios

## Navegacion

Agregar "Plugins" al Navbar principal entre "Conectores" y "Teams":
```
Skills | Conectores | Plugins | Teams
```

Actualizar `links` y `mobileLinks` en `Navbar.tsx`.

## Traducciones

Agregar claves en `es.ts` y `en.ts`:
- `nav.plugins`: "Plugins"
- `plugins.title`, `plugins.subtitle`, `plugins.searchPlaceholder`
- `plugins.platformClaudeCode`, `plugins.platformCowork`
- `plugins.anthropicVerified`, `plugins.community`
- `plugins.securityWarning` (aviso para plugins no verificados)

## Rutas

En `App.tsx` agregar:
```
<Route path="/plugins" element={<Plugins />} />
<Route path="/plugin/:slug" element={<PluginDetail />} />
```

## Badges y seguridad

- **Anthropic Verified** (azul con check): Plugin revisado por Anthropic
- **Official** (verde): Listado en claude.com/plugins
- **Community** (gris): Plugins de terceros, con aviso de seguridad
- **Verified** (escudo verde): Paso auditoria de seguridad automatica (para comunitarios)

## Archivos a crear/modificar

1. **Migracion SQL**: Crear tabla `plugins` con RLS
2. **`src/pages/Plugins.tsx`**: Directorio (basado en Conectores.tsx)
3. **`src/pages/PluginDetail.tsx`**: Detalle (basado en ConectorDetail.tsx)
4. **`src/components/Navbar.tsx`**: Agregar link "Plugins"
5. **`src/App.tsx`**: Agregar rutas
6. **`src/i18n/es.ts`** y **`src/i18n/en.ts`**: Traducciones
7. **`src/lib/api.ts`**: Funciones `fetchPlugins`, `fetchPluginBySlug`
8. **INSERT batch**: Los ~81 plugins oficiales

