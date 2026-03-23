

## Plan: Scraper de GitHub Trending + Trendshift + Blog Auto-Generation

### Situación actual
- `discover-trending-repos` solo busca via GitHub Search API con queries fijas (topics: `claude-code`, `ai-agent`, `mcp-server`). No scrappea fuentes externas como Trendshift o GitHub Trending.
- De los 20 repos del trending que compartiste, **ya tenemos 12** (superpowers, everything-claude-code, browser-use, deer-flow, Understand-Anything, gstack, pentagi, agency-agents, gsap-skills, Claude-Code-Game-Studios).
- **Faltan 8**: project-nomad, spec-kit, MiniMax-AI/skills, MoneyPrinterV2, pascalorg/editor, TradingAgents, public-apis, supermemory, MoneyPrinterTurbo, floci.
- No hay pipeline que use trending data para generar posts de blog automáticamente.

### Cambios propuestos

#### 1. Agregar scraping de Trendshift al discover-trending-repos
Ampliar la función existente para también scrapear `https://trendshift.io/repositories` como fuente adicional de repos trending, además de las queries de GitHub Search API.

- Usar Firecrawl (ya conectado) para scrapear la página de Trendshift
- Parsear repos del HTML/markdown resultante
- Resolver cada repo contra GitHub API para obtener metadata completa (stars, description, topics)
- Deduplicar contra catálogo existente e insertar nuevos skills

#### 2. Agregar scraping de GitHub Trending page
Scrapear `https://github.com/trending` (daily/weekly) como tercera fuente:
- Firecrawl scrape de la trending page
- Parsear los repo links del markdown
- Enriquecer con GitHub API
- Mismo pipeline de dedup + insert

#### 3. Nuevo modo `trending_to_blog` en generate-blog-post
Agregar lógica que detecte repos trending de alto impacto y genere automáticamente posts de blog sobre ellos:
- Consultar skills insertados en las últimas 24h con >1000 stars desde `discover-trending-repos`
- Agrupar por tema (ej: "Claude Code skills", "AI agents", "trading bots")
- Generar un post tipo "Top X trending AI tools this week" usando Gemini
- Insertar como draft en `blog_posts` para revisión

#### 4. Cron semanal para blog trending
Agregar un cron job semanal que ejecute el modo `trending_to_blog`.

### Archivos a modificar
- `supabase/functions/discover-trending-repos/index.ts` — agregar fuentes Trendshift + GitHub Trending via Firecrawl
- `supabase/functions/generate-blog-post/index.ts` — agregar topics dinámicos basados en trending data
- Nuevo cron job para blog trending semanal

### Detalles técnicos

```text
Flujo actual:
  GitHub Search API (7 queries) → dedup → insert skills

Flujo propuesto:
  GitHub Search API (7 queries)
  + Trendshift scrape (via Firecrawl)
  + GitHub Trending page scrape (via Firecrawl)
  → merge + dedup → insert skills
  → flag high-impact repos → weekly blog post generation
```

El scraping de Trendshift y GitHub Trending usa Firecrawl que ya está configurado como conector. No requiere API keys adicionales.

