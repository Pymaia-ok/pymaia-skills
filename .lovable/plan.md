

## Plan: Importar skills de CAD/BIM reales + scraper de awesome-lists + nuevas industrias

### Fase 1: Insertar 5 skills reales de CAD/BIM

Crear una migración SQL que inserte los 5 repositorios verificados de GitHub con datos reales extraidos de sus READMEs:

| Skill | Repo | Industry | Target Roles |
|-------|------|----------|-------------|
| AutoCAD MCP | ngk0/autocad-mcp | arquitectura, ingeniería | arquitecto, ingeniero civil |
| Revit MCP | SamllPigYanDong/revit_mcp | arquitectura, ingeniería | arquitecto, ingeniero civil |
| Revit MCP Commandset | revit-mcp/revit-mcp-commandset | arquitectura, ingeniería | arquitecto, ingeniero civil |
| Revit Automation (Autodesk) | autodesk-platform-services/aps-sample-mcp-server-revit-automation | arquitectura, ingeniería | arquitecto, ingeniero civil |
| Artifex (FreeCAD) | islamnurdin/Artifex | arquitectura, diseño | arquitecto, diseñador 3D |

Antes de insertar, se consultará el README de cada repo via GitHub API para obtener descripciones reales (tagline y description_human).

### Fase 2: Agregar awesome-lists grandes como fuente de sync

Actualizar `sync-skills/index.ts` para agregar dos nuevas fuentes:

1. **`voltagent-awesome`**: Parsea `VoltAgent/awesome-agent-skills` README
2. **`travisvn-awesome`**: Parsea `travisvn/awesome-claude-skills` README

Reutiliza la misma lógica de `fetchAwesomeLists()` existente (SOURCE 10), simplemente agregando estos dos repos a la lista. Luego se agrega un case en el switch para invocarlos individualmente o todos juntos.

### Fase 3: Expandir industrias en la UI

Actualizar `SKILL_CATEGORIES` en `src/lib/api.ts` o agregar un filtro de industria visible en `/explorar` con las nuevas opciones:
- arquitectura
- ingeniería
- construcción
- medicina
- educación

Esto permite que usuarios busquen skills por profesión, no solo por categoría técnica.

### Archivos a modificar

1. **Nueva migración SQL** — INSERT de los 5 skills CAD/BIM con datos reales de sus READMEs
2. **`supabase/functions/sync-skills/index.ts`** — Agregar `VoltAgent/awesome-agent-skills` y `travisvn/awesome-claude-skills` a la lista de awesome-lists en `fetchAwesomeLists()`
3. **`src/lib/api.ts`** — Agregar industrias nuevas al array de categorías o crear un array de industrias para filtro
4. **`src/pages/Explore.tsx`** — Agregar filtro de industria si no existe

### Orden de ejecución

1. Fetch de los READMEs de los 5 repos CAD/BIM para obtener descripciones reales
2. Migración SQL con los INSERTs
3. Actualizar sync-skills con las nuevas awesome-lists
4. Actualizar UI con filtros de industria

