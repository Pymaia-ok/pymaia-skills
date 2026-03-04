

## Plan: Escalar la captura de skills a cientos de miles

### Situacion actual

- **DB actual**: ~8,690 skills
- **skills.sh**: 84K skills, sin API publica, Firecrawl map capped a 5K URLs
- **skillsmp.com**: 364K skills, API con paginacion (`/api/v1/skills/search`), rate limit 500 req/dia, max 100 por request, **wildcard searches NO soportadas** (requiere `q` con texto)
- **claude-plugins.dev**: 52K skills, NO tiene API REST publica (el endpoint `/api/skills/search` devuelve 404)
- **agentskills.io**: Es solo la especificacion del estandar, no un registry

### Por que no puedo "usar skills para buscar skills"

Las skills como `find-skills` (vercel-labs) y `skills-search` (daymade) son **SKILL.md files** — instrucciones para que Claude Code ejecute comandos como `ccpm search` o `npx skills search` dentro de un terminal local. No son APIs web ni herramientas MCP que yo pueda invocar desde aqui. Solo funcionan dentro de Claude Code CLI corriendo en tu maquina.

### Estrategia para maximizar la captura

#### 1. skillsmp.com — API paginada con queries alfabeticos (hasta ~50K/dia)

La API requiere un `q` no vacio y tiene 500 req/dia. Estrategia:

- **Queries por letra**: "a", "b", "c"... "z" = 26 queries base
- **Queries por bigrama**: "aa", "ab", "ac"... para cubrir mas espacio = cientos de queries
- Cada query pagina hasta que se acaben resultados (max 100/page)
- **Problema**: 500 req/dia. Con ~50 pages promedio por letra y 26 letras = 1,300 requests. Esto toma ~3 dias de ejecucion.
- **Solucion**: Parametrizar la funcion con `letter` para procesar una letra por invocacion. Cada invocacion usa ~20-50 requests. Se ejecuta varias veces al dia.

#### 2. claude-plugins.dev — Firecrawl map con multiples search terms

No tiene API. Firecrawl map devuelve max 5K URLs por llamada, pero acepta un parametro `search` que filtra/ordena resultados:

- Ejecutar un map por cada letra del alfabeto: `search: "a"`, `search: "b"`, etc.
- Cada map devuelve hasta 5K URLs distintas
- 26 maps x 5K = potencialmente 130K URLs (con mucha deduplicacion, pero capturaria las 52K)
- **Parametrizar** con `letter` para hacer un map por invocacion

#### 3. skills.sh — Misma estrategia Firecrawl que claude-plugins.dev

- Maps con search terms alfabeticos
- 26+ maps para cubrir el espacio de 84K skills

### Cambios al edge function `sync-skills`

Reescribir `supabase/functions/sync-skills/index.ts` con estos cambios:

1. **Nuevo parametro `letter`** en el body: permite procesar una sola letra por invocacion
   - `{"source": "skillsmp", "letter": "a"}` — busca "a" en skillsmp paginando todo
   - `{"source": "skillssh", "letter": "a"}` — Firecrawl map con search "a"
   - `{"source": "claudeplugins", "letter": "a"}` — Firecrawl map con search "a"

2. **skillsmp.com**: Paginar profundo (hasta 100 pages por query, no solo 2). Agregar queries por bigrama si una letra devuelve 10K+ resultados (hitting ceiling).

3. **Firecrawl sources**: Hacer map con `search: letter` en vez de un solo map generico.

4. **Batch insert**: Subir de 500 a 2000 por ejecucion, chunks de 100.

5. **Nuevo parametro `offset`** para controlar desde donde insertar los nuevos skills (para no re-procesar).

6. **Progreso tracking**: Guardar en la respuesta cuantos skills se descubrieron vs insertaron y cuantos quedan.

### Flujo de ejecucion

Para capturar todo:

```text
# Dia 1: skillsmp.com (500 req/dia)
POST /sync-skills {"source":"skillsmp","letter":"a"}  # ~50 pages
POST /sync-skills {"source":"skillsmp","letter":"b"}  # ~50 pages
... (hasta agotar rate limit)

# En paralelo: Firecrawl maps
POST /sync-skills {"source":"skillssh","letter":"a"}
POST /sync-skills {"source":"skillssh","letter":"b"}
...
POST /sync-skills {"source":"claudeplugins","letter":"a"}
...

# Repetir dias siguientes hasta cubrir a-z
```

### Estimacion de resultado

| Fuente | Metodo | Skills esperados |
|---|---|---|
| skillsmp.com | API paginada x 26 letras | ~100K-200K (3-5 dias) |
| skills.sh | Firecrawl maps x 26 | ~30K-84K |
| claude-plugins.dev | Firecrawl maps x 26 | ~20K-52K |
| **Total estimado** | | **150K-336K** |

### Archivo a modificar

- `supabase/functions/sync-skills/index.ts` — Reescribir las 3 fuentes con la estrategia por letra

