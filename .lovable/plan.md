

## Plan: Importar TODOS los toolkits de Composio eficientemente

### Problema actual
- `sync-composio` tiene `maxScrape = 50` por defecto
- Scrapea cada toolkit individualmente con Firecrawl (1 crédito por toolkit = ~1,000 créditos para todo)
- Solo importó ~50 de los ~1,000 toolkits disponibles

### Solución: Approach híbrido (Map + batch insert)

#### Cambio en `supabase/functions/sync-composio/index.ts`

1. **Fase 1 — Map** (1 crédito): Usar Firecrawl Map API para obtener TODAS las URLs de `composio.dev/toolkits` (ya lo hace, pero luego scrappea individualmente)

2. **Fase 2 — Insert sin scrape**: Para cada URL de toolkit, extraer el nombre directamente de la URL (`/toolkits/{name}`), generar `slug`, `displayName`, `category` y `description` básica — todo sin gastar créditos de scrape

3. **Fase 3 — Enriquecimiento opcional**: Solo scrapear los primeros N toolkits que no tengan `readme_summary` para obtener descripciones ricas (parámetro `enrichTop` opcional, default 0)

4. **Eliminar el límite de 50**: El Map API ya devuelve hasta 5,000 URLs, suficiente para cubrir todo Composio

### Resultado esperado
- ~1,000 toolkits importados con **1 solo crédito de Firecrawl** (Map)
- Datos básicos (nombre, categoría, URL) para todos
- Opción de enriquecer con scrape bajo demanda

### Archivo a modificar
- `supabase/functions/sync-composio/index.ts` — refactorizar para usar Map-only por defecto, scrape opcional

