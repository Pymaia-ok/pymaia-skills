

# Importar repos principales del Top AI Tools

## Situación actual

Tenemos skills derivadas (templates, sub-skills de monorepos) pero **faltan los repos principales** como entradas de primera clase:

| Repo | Estado actual |
|---|---|
| `open-webui/open-webui` | No existe |
| `infiniflow/ragflow` | No existe |
| `langgenius/dify` | Solo sub-skills del monorepo (component-refactoring, etc.) |
| `langchain-ai/langchain` | Solo skills de langchain-skills, no el repo principal |
| `langflow-ai/langflow` | No existe |
| `crewAIInc/crewAI` | Solo templates, no el framework principal |

## Plan

Insertar 6 registros en la tabla `skills` con status `approved`, usando datos reales de GitHub (estrellas, descripción). El pipeline existente (`enrich-github-metadata`, `bulk-fetch-skill-content`, `generate-embeddings`) se encargará automáticamente de:
- Poblar `github_metadata`
- Extraer SKILL.md si existe
- Generar embeddings y traducciones

### Datos a insertar

| slug | display_name | github_url | category | estrellas aprox |
|---|---|---|---|---|
| `open-webui` | Open WebUI | github.com/open-webui/open-webui | `ai-tools` | ~80k |
| `ragflow` | RAGFlow | github.com/infiniflow/ragflow | `ai-tools` | ~55k |
| `dify-platform` | Dify | github.com/langgenius/dify | `ai-tools` | ~90k |
| `langchain-framework` | LangChain | github.com/langchain-ai/langchain | `ai-tools` | ~105k |
| `langflow-platform` | Langflow | github.com/langflow-ai/langflow | `ai-tools` | ~55k |
| `crewai-framework` | CrewAI | github.com/crewAIInc/crewAI | `ai-tools` | ~30k |

### Ejecución
- 1 INSERT con los 6 registros usando el insert tool de Supabase
- Cada registro incluirá: slug, display_name, github_url, category, status=approved, tagline descriptivo, install_command (link al repo)

No requiere cambios de código ni migraciones.

