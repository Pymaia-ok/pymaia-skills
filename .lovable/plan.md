

## Plan: Agregar iconos a Databricks y Amplitude, y verificar sus registros

### Hallazgos

- **Databricks**: Tiene MCP oficial (documentado en docs.databricks.com). Hay 2 registros en la DB, ambos comunitarios y sin icono.
- **Amplitude**: Tiene MCP oficial (amplitude/mcp-server-guide en GitHub). Hay 1 registro (`com-amplitude-mcp-server`), sin icono.

Ninguno tiene `icon_url` asignado, por eso no se ven en la UI con icono.

### Pasos

1. **Actualizar iconos via SQL (insert tool)**
   - Databricks: `https://cdn.simpleicons.org/databricks` para ambos registros
   - Amplitude: `https://cdn.simpleicons.org/amplitude` para el registro existente

2. **Agregar ambas marcas al diccionario de `fetch-connector-icons`**
   - Añadir `databricks: "databricks"` y `amplitude: "amplitude"` al mapa `KNOWN_ICONS` en `supabase/functions/fetch-connector-icons/index.ts` para que futuros conectores similares obtengan icono automáticamente.

### Resultado
Databricks y Amplitude aparecerán con sus iconos oficiales en `/conectores`.

