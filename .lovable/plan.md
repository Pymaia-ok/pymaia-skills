

## Plan: Ampliar importación de Skills confiables desde GitHub

### Contexto

La sugerencia de `puran-water/autocad-drafting` vino de una búsqueda manual en GitHub, **no de una fuente automatizada**. El sistema actual tiene **39,128 skills aprobados**, la mayoría importados via skills.sh y GitHub Search con los topics `mcp-server`, `claude-skill`, `agent-skill`, `mcp`, `model-context-protocol`.

El problema: esos topics cubren bien el ecosistema MCP pero **no cubren skills de nicho** como AutoCAD, ingeniería, medicina, etc. Hay miles de repos en GitHub con archivos `SKILL.md` o que usan el patrón `npx skills add` que no están indexados porque no usan esos topics.

### Lo que haría

**1. Ampliar GitHub Search con más topics de dominio**

Agregar búsquedas por topics adicionales relevantes:
- `autocad`, `cad`, `bim`, `revit` (ingeniería/arquitectura)
- `cursor-rules`, `claude-rules`, `ai-rules` (skills de configuración)
- `ai-agent`, `ai-assistant`, `llm-tool`
- `prompt-engineering`, `ai-workflow`

Esto se hace invocando `sync-skills` con `source: "github-search"` y `topic: "autocad"` etc.

**2. Búsqueda directa de repos con SKILL.md**

Usar GitHub Code Search API para encontrar repos que contengan archivos `SKILL.md` (el estándar de Agent Skills). Agregar una nueva source `github-code-search` en `sync-skills/index.ts` que busque:
```
filename:SKILL.md path:/
```
Esto descubriría skills legítimos que no usan los topics convencionales.

**3. Importar el skill de AutoCAD específico**

Insertar manualmente `puran-water/autocad-drafting` como skill aprobado si la búsqueda no lo captura automáticamente.

### Archivos a modificar

- `supabase/functions/sync-skills/index.ts` — agregar source `github-code-search` que busca repos con `SKILL.md`
- SQL insert para el skill de AutoCAD si no se captura automáticamente

### Resultado esperado
- Descubrir cientos de skills de nicho que no usan los topics estándar
- Cubrir dominios como CAD, medicina, legal, etc. que hoy están subrepresentados
- El skill de AutoCAD disponible en el catálogo

