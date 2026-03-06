

## Plan: Ampliar importación de Skills confiables desde GitHub — ✅ COMPLETADO

### Lo que se hizo

**1. Nueva source `github-code-search` en `sync-skills`**
- Busca repos con `filename:SKILL.md path:/` y `filename:.cursorrules path:/` via GitHub Code Search API
- Descubre skills legítimos que no usan los topics convencionales

**2. Topics de dominio ampliados en `github-search`**
- Agregados: `cursor-rules`, `claude-rules`, `ai-rules`, `ai-agent`, `ai-assistant`, `llm-tool`, `prompt-engineering`, `ai-workflow`, `autocad`, `cad`, `bim`, `revit`

**3. Skill de AutoCAD insertado**
- `autocad-drafting` (puran-water/autocad-mcp, 159⭐) insertado como approved

### Cómo ejecutar
```
# Buscar repos con SKILL.md
POST sync-skills { "source": "github-code-search" }

# Buscar por topic específico
POST sync-skills { "source": "github-search", "topic": "autocad" }

# Ejecutar github-search con TODOS los topics (incluidos los nuevos)
POST sync-skills { "source": "github-search" }
```
