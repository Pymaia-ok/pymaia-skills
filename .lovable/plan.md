

## Problema: búsqueda de conectores en el MCP server falla con queries de múltiples palabras

### Causa raíz
El filtro `.or()` de PostgREST tiene problemas con queries que contienen espacios. Cuando se busca `meta ads`, el filtro genera:
```
name.ilike.%meta ads%,slug.ilike.%meta ads%,description.ilike.%meta ads%
```
PostgREST puede malinterpretar esto porque los espacios y caracteres especiales dentro del patrón interfieren con el parsing del filtro. Además, queries como `meta,ads` (con coma) romperían completamente la sintaxis.

### Solución

Sanitizar la query para PostgREST y además hacer búsqueda por palabras individuales como fallback. Aplica a las 3 herramientas de búsqueda: `search_connectors`, `search_skills`, y `search_plugins`.

**Archivo: `supabase/functions/mcp-server/index.ts`**

1. Agregar una función helper para sanitizar queries para PostgREST:
```typescript
function sanitizeForPostgrest(query: string): string {
  // Escape characters that break PostgREST filter parsing
  return query.replace(/[,()."\\]/g, "").trim();
}
```

2. En `search_connectors`, `search_skills`, y `search_plugins`:
   - Sanitizar la query antes de usar en `.or()`
   - Si no hay resultados con la frase completa, hacer un segundo intento buscando por cada palabra individual (e.g., buscar `%meta%` AND `%ads%` por separado)
   - Agregar también búsqueda en `description_es` para conectores

3. Para la búsqueda por palabras individuales, construir el filtro dinámicamente:
```typescript
// Si la búsqueda con frase completa no da resultados, 
// intentar con cada palabra por separado
const words = sanitized.split(/\s+/).filter(w => w.length >= 2);
if (results.length === 0 && words.length > 1) {
  // Buscar registros que contengan TODAS las palabras en al menos un campo
  let q = supabase.from("mcp_servers")...
  for (const word of words) {
    q = q.or(`name.ilike.%${word}%,slug.ilike.%${word}%,description.ilike.%${word}%`);
  }
}
```

Esto garantiza que `meta ads`, `facebook ads`, `google sheets`, etc. siempre encuentren resultados.

