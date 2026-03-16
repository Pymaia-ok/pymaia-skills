

# Revisión: Skills de Antigravity Awesome Skills

## Estado actual del catálogo

| Métrica | Valor |
|---------|-------|
| Skills en el repo Antigravity | **1,259+** |
| Skills en nuestro DB con `github_url` apuntando a Antigravity | **562** |
| Skills con `install_command` de Antigravity (sin github_url match) | **442** |
| **Total cobertura directa** | **~1,004** |
| **Gap estimado** | **~255 skills** |
| Repo registrado en `monorepo_registry` | **No** |

## Top Starter Skills — Todas presentes

| Skill | Estado |
|-------|--------|
| `brainstorming` | ✅ |
| `architecture` | ✅ |
| `test-driven-development` | ✅ |
| `doc-coauthoring` | ✅ |
| `lint-and-validate` | ✅ |
| `create-pr` | ✅ |
| `debugging-strategies` | ✅ |
| `api-design-principles` | ✅ (como variante) |
| `frontend-design` | ✅ |
| `security-auditor` | ✅ |
| `copywriting` | ✅ |
| `python-patterns` | ❌ (tenemos `python-typing-patterns`, `python-async-patterns`, etc. pero no el slug exacto) |

Todas las categorías principales están cubiertas: Architecture, Business, Data & AI, Development, General, Infrastructure, Security, Testing, Workflow.

## Gap: ~255 skills faltantes

Antigravity es un agregador que recopila skills de muchas fuentes (Anthropic, Vercel, Obra, Remotion, zebbern, VoltAgent, rmyndharis, etc.). La mayoría de las 1,259 skills ya las tenemos, ya sea atribuidas a Antigravity directamente o a su fuente original. El gap real es de ~255 skills que no están en nuestro catálogo bajo ningún slug.

Además, el repo **no está registrado en `monorepo_registry`**, por lo que no se sincroniza automáticamente cuando agregan nuevas skills.

## Plan para cerrar el gap

### 1. Registrar en monorepo_registry
Insertar `sickn33/antigravity-awesome-skills` en `monorepo_registry` para que el sistema de sincronización automática (monorepo-sync-daily) capture nuevas adiciones.

### 2. Crear edge function `sync-antigravity-skills`
- Fetch `skills_index.json` desde GitHub raw (12,592 líneas, ~1,259 entries con id, path, category, description)
- Comparar cada entry por slug normalizado contra la tabla `skills`
- Insertar las faltantes en `skills_import_staging` con:
  - `github_url` → `https://github.com/sickn33/antigravity-awesome-skills`
  - `install_command` → `npx antigravity-awesome-skills` (global) 
  - Categoría mapeada desde su campo `category`
- Auto-aprobar por trust (24.7k stars, fuente verificada)
- Programar ejecución mensual via cron

### 3. Cambios necesarios

| Tipo | Detalle |
|------|---------|
| DB (insert) | Agregar registro en `monorepo_registry` |
| Edge Function | `sync-antigravity-skills/index.ts` — fetch index + dedup + insert |
| Cron | Mensual para capturar nuevas skills del repo |

Esto cerraría el gap del ~20% faltante y aseguraría sincronización continua.

