

## Plan: Optimizar SEO y LLM Discovery

### Estado actual

Ya tenés una base sólida:
- `llms.txt` y `llms-full.txt` existen en `/public`
- `<link rel="llms">` en `index.html`
- `robots.txt` referencia ambos archivos
- `useSEO` hook con JSON-LD en Index, Explore, SkillDetail, Conectores, ConectorDetail
- Open Graph y Twitter Cards configurados
- MCP Server funcional con 10 herramientas

### Problemas a corregir

1. **llms.txt desactualizado**: Dice "14,000+ skills" y solo lista 3 tools del MCP (tiene 10). No menciona conectores, smart search, ni las 19 categorías reales.
2. **llms-full.txt incompleto**: Solo lista 10 categorías (hay 19), MCP tools desactualizados, falta info de conectores, falta la API de smart-search.
3. **No hay sitemap.xml**: `robots.txt` lo referencia pero no existe. Crítico para crawlers.
4. **Falta `/.well-known/ai-plugin.json`**: Estándar emergente para descubrimiento por agentes AI.
5. **JSON-LD limitado**: Solo WebSite en Index. Falta SoftwareApplication, ItemList en Explore, Product en SkillDetail.
6. **Sin `<meta>` para AI crawlers**: Faltan hints como `ai:description`, `ai:category`.

### Cambios propuestos

**1. Reescribir `public/llms.txt`** (conciso, actualizado)
- Actualizar conteo de skills (~38K)
- Listar las 19 categorías reales
- Listar las 10 herramientas MCP reales
- Agregar sección de conectores
- Agregar endpoint de smart-search

**2. Reescribir `public/llms-full.txt`** (documentación completa)
- Toda la info de llms.txt expandida
- Ejemplos de uso por rol
- Documentación completa del MCP con las 10 tools y sus schemas
- Sección de conectores con categorías
- API de smart-search documentada
- Before/after cases actualizados

**3. Crear `public/sitemap.xml`** (estático con rutas principales)
- Todas las rutas estáticas del app (/, /explorar, /mcp, /teams, /conectores, /primeros-pasos, /terminos, /privacidad)
- Nota: las rutas dinámicas (/skill/:slug, /conector/:slug) requerirían un sitemap dinámico generado por edge function — se puede hacer en un paso siguiente

**4. Crear `public/.well-known/ai-plugin.json`**
- Manifest estándar OpenAI/agentes para descubrimiento automático
- Apunta al MCP server y a llms.txt

**5. Mejorar JSON-LD en páginas clave**
- `SkillDetail.tsx`: Agregar schema `SoftwareApplication` con rating, installCount, category
- `Explore.tsx`: Agregar schema `CollectionPage`
- `Index.tsx`: Enriquecer con `Organization` + `WebApplication`

**6. Actualizar `index.html`**
- Agregar `<link rel="manifest">` al ai-plugin.json
- Agregar meta tags adicionales para AI discovery

**7. Actualizar `robots.txt`**
- Agregar crawlers AI conocidos (GPTBot, ClaudeBot, PerplexityBot, etc.) con Allow explícito

### Archivos a modificar
- `public/llms.txt` — reescribir completo
- `public/llms-full.txt` — reescribir completo
- `public/sitemap.xml` — crear nuevo
- `public/.well-known/ai-plugin.json` — crear nuevo
- `public/robots.txt` — actualizar con AI crawlers
- `index.html` — agregar meta tags AI
- `src/hooks/useSEO.ts` — sin cambios
- `src/pages/Index.tsx` — enriquecer JSON-LD
- `src/pages/SkillDetail.tsx` — agregar SoftwareApplication JSON-LD
- `src/pages/Explore.tsx` — agregar CollectionPage JSON-LD

