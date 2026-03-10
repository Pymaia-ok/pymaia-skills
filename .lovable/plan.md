

## Plan: Importar agency-agents + Nuevo pipeline de descubrimiento de repos populares

### Problema raíz

El repo `msitarzewski/agency-agents` (19k stars, 60+ agentes especializados, MIT license, actualizado ayer) no fue detectado porque:
- No usa GitHub Topics estándar (`mcp-server`, `claude-skill`, etc.)
- No tiene `SKILL.md` ni `.cursorrules` en la raíz
- No está listado en ningún registry (skills.sh, smithery, etc.)
- No aparece en las awesome-lists que rastreamos

Hay un gap en el pipeline: **repos populares con contenido de agentes/skills que usan convenciones propias**.

### Solución: 2 partes

#### Parte 1: Importar agency-agents ahora
- Importar como 1 skill "monorepo" apuntando al repo completo (no 60 skills individuales, ya que son agentes dentro de un mismo proyecto)
- Slug: `agency-agents`, source: `manual`, github_url: `https://github.com/msitarzewski/agency-agents`
- Categoría: `ia`, roles: `developer, founder, marketer, disenador, consultor`
- Las 19k stars se sincronizarán automáticamente via `sync-skill-stars`

#### Parte 2: Nueva fuente — GitHub Popular Repos Search
Agregar una **SOURCE 14** al `sync-skills` function que busque repos populares por keywords de contenido (no topics), filtrando por stars > 500:

```text
Queries de búsqueda:
- "ai agent" stars:>500
- "agent skills" stars:>500  
- "claude agent" stars:>500
- "cursor rules" stars:>500
- "AI workflow" stars:>500
- "prompt engineering" stars:>500
```

Esto usa la GitHub Search API estándar (`search/repositories`) con `q=` en vez de `topic:`, lo que captura repos por nombre/descripción sin depender de que el autor configure topics.

**Cron**: Diario a las 7 AM UTC (antes del sync por topics de las 6 AM), para maximizar cobertura.

### Cambios técnicos

1. **DB**: Insert manual de agency-agents via SQL
2. **Edge Function** `sync-skills/index.ts`: 
   - Nueva función `fetchGitHubPopularSearch()` (~40 líneas)
   - Nuevo case `"github-popular"` en el switch
3. **Cron**: Nuevo job `sync-skills-github-popular` diario a 7 AM UTC
4. **Awesome list**: Agregar `msitarzewski/agency-agents` a la lista de awesome repos para que sus links internos también se descubran

### Resultado esperado
- agency-agents aparece inmediatamente en el catálogo
- Repos populares (>500 stars) con contenido de agentes se descubren automáticamente cada día
- Se cierra el gap de descubrimiento para proyectos que no siguen convenciones estándar

