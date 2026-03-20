

# Mejorar descubrimiento por agentes de IA — Fase 2

## Contexto
Ya tenemos llms.txt, ai-plugin.json, JSON-LD y robots.txt optimizados. Falta cubrir 3 vectores de descubrimiento clave.

## Plan

### 1. Sitemap dinámico con las 43k+ skills y conectores
El sitemap actual tiene 10 URLs estáticas. Los crawlers de IA no pueden descubrir las páginas individuales. Crear una edge function que genere un sitemap-index con sub-sitemaps paginados.

**Archivo:** `supabase/functions/skills-sitemap/index.ts`
- Genera un sitemap-index que apunta a sub-sitemaps de ~1000 URLs cada uno
- Sub-sitemaps para: `/skill/{slug}`, `/conector/{slug}`, `/plugin/{slug}`
- Cachea respuesta por 6 horas
- Actualizar `robots.txt` para incluir este nuevo sitemap

### 2. OpenAPI spec para agentes no-MCP
Crear un `openapi.json` que describa los endpoints REST del catálogo (search, detail, stats). Esto permite que GPT plugins, Perplexity y otros agentes no-MCP descubran y usen la API.

**Archivo:** `public/.well-known/openapi.json`
- Endpoints: search skills, get skill detail, get stats, search connectors
- Apunta a las edge functions existentes (`smart-search`, `skill-raw`, etc.)
- Registrar en `ai-plugin.json` como API alternativa

### 3. Meta tags `<link>` para descubrimiento automático
Agregar headers estándar que los crawlers de IA buscan para auto-descubrimiento.

**Archivo:** `index.html`
- `<link rel="api" type="application/json" href="/.well-known/openapi.json">`
- `<link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml">`

### 4. OpenSearch descriptor
Permite que navegadores y agentes ofrezcan búsqueda directa en Pymaia.

**Archivo:** `public/opensearch.xml`
- Template URL apuntando a `/explorar?q={searchTerms}`

### Recomendación manual (no requiere código)
**Registrar pymaia-skills en directorios de MCP servers:**
- glama.ai
- mcp.so  
- smithery.ai
- mcpservers.org
- awesome-mcp-servers (GitHub)

Esto es lo más impactante porque es donde los agentes y humanos buscan MCP servers activamente.

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `supabase/functions/skills-sitemap/index.ts` | Crear — sitemap dinámico paginado |
| `public/.well-known/openapi.json` | Crear — spec REST para agentes no-MCP |
| `public/opensearch.xml` | Crear — descriptor de búsqueda |
| `public/robots.txt` | Modificar — agregar sitemap dinámico |
| `index.html` | Modificar — agregar link tags de descubrimiento |
| `public/.well-known/ai-plugin.json` | Modificar — referenciar openapi.json |

