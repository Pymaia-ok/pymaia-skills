

## Plan: Expansión del catálogo + Rediseño de páginas de detalle

Este plan combina dos iniciativas: (A) importar más skills/MCPs de skills.sh, Composio y agentskill.sh, y (B) rediseñar las páginas de detalle con layout de 2 columnas y datos más ricos.

---

### Parte A: Expansión del catálogo (~36k → 80-100k)

#### A1. Mejorar sync de skills.sh en `sync-skills/index.ts`
- Agregar nuevo source `"skillssh-categories"` que crawlee skills.sh por categoría (`/categories/development`, `/categories/design`, etc.) en lugar de solo por letra
- Subir el limit de Firecrawl map de 5,000 a 10,000 para capturar más URLs por categoría
- Parsear el mismo patrón de URL `@owner/repo/skill-name`

#### A2. Nueva fuente: agentskill.sh en `sync-skills/index.ts`
- Agregar source `"agentskill"` usando Firecrawl map en `agentskill.sh/skills`
- Parsear URLs con patrón `agentskill.sh/skills/{owner}/{repo}/{name}`
- Insertar como skills con source `"agentskill.sh"`

#### A3. Nuevo edge function `sync-composio/index.ts`
- Crawlear `composio.dev/toolkits` con Firecrawl map para descubrir todas las URLs de toolkits
- Para cada toolkit URL, scrape con formato markdown para extraer: nombre, descripción, categoría, tools/triggers soportados
- Insertar en `mcp_servers` con source `"composio"`, category inferida, y descripción rica
- Agregar a `supabase/config.toml` con `verify_jwt = false`

#### A4. Enriquecer sync-connectors con más datos
- En `sync-connectors/index.ts`, agregar source `"composio"` que llame al nuevo `sync-composio`
- Deduplicar contra conectores existentes por nombre normalizado

---

### Parte B: Rediseño de páginas de detalle

#### B1. Migración SQL
- Agregar `readme_raw TEXT` y `readme_summary TEXT` a tablas `mcp_servers` y `plugins`
- Esto permite almacenar documentación enriquecida para conectores y plugins (skills ya los tiene)

#### B2. Utilidad `src/lib/parseSkillMd.ts`
- Parsear SKILL.md (contenido del `install_command`) extrayendo secciones:
  - Prerequisites → checklist
  - Tools → lista con descripción
  - Common Patterns → code snippets
  - Known Pitfalls → warnings
  - Quick Reference → tabla
- Retorna un objeto tipado con las secciones encontradas

#### B3. Rediseño `SkillDetail.tsx` — Layout 2 columnas
- Cambiar de `max-w-4xl` a `max-w-6xl` con `lg:grid-cols-[1fr_340px]`
- **Columna principal**: hero (nombre, tagline, badges), descripción, secciones parseadas del SKILL.md (prerequisites, tools, workflows, pitfalls), README expandible, reviews
- **Sidebar derecha**: botón install + ZIP, stats compactos (stars, installs, rating, tiempo), security panel, metadata (categoría, industria, roles, autor, links), FAQ contextual
- En mobile: sidebar se apila debajo (single column)

#### B4. Rediseño `ConectorDetail.tsx` — Layout 2 columnas
- Mismo patrón: `max-w-6xl` con grid 2 columnas
- **Columna principal**: hero, descripción, JSON config expandible, README (si hay `readme_raw`), compatible skills
- **Sidebar**: install command CLI (1-liner), stats (stars, downloads), credentials, security panel, links externos, FAQ

#### B5. Rediseño `PluginDetail.tsx` — Layout 2 columnas
- Mismo patrón de 2 columnas
- **Columna principal**: hero, descripción, README, reviews
- **Sidebar**: install command, stats, security panel, metadata, FAQ

#### B6. FAQ automática contextual
- Componente `DetailFAQ` que genera 4-5 preguntas según el tipo de item:
  - "¿Qué es [nombre]?" / "¿Es seguro?" / "¿Cómo instalo esto?" / "¿Necesito API key?"
- Respuestas generadas dinámicamente desde los datos del item
- Schema markup `FAQPage` para SEO

#### B7. Traducciones
- Agregar keys en `es.ts` y `en.ts` para las nuevas secciones: prerequisites, tools, workflows, pitfalls, FAQ labels

---

### Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `supabase/functions/sync-skills/index.ts` | Agregar sources `skillssh-categories` y `agentskill` |
| `supabase/functions/sync-composio/index.ts` | **Nuevo** — importar toolkits de Composio como conectores |
| `supabase/config.toml` | Agregar `[functions.sync-composio]` |
| Migración SQL | Agregar `readme_raw`, `readme_summary` a `mcp_servers` y `plugins` |
| `src/lib/parseSkillMd.ts` | **Nuevo** — parser de SKILL.md |
| `src/pages/SkillDetail.tsx` | Layout 2 columnas + secciones parseadas |
| `src/pages/ConectorDetail.tsx` | Layout 2 columnas + sidebar |
| `src/pages/PluginDetail.tsx` | Layout 2 columnas + sidebar |
| `src/components/DetailFAQ.tsx` | **Nuevo** — FAQ contextual con schema markup |
| `src/i18n/es.ts` | Traducciones nuevas |
| `src/i18n/en.ts` | Traducciones nuevas |

