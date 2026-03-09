

## Plan: Expandir el MCP Server para incluir Conectores y Plugins

### Alcance actual
Las 10 tools existentes solo consultan la tabla `skills`. No hay ninguna tool que exponga datos de conectores ni plugins.

### Nuevas tools a agregar

**Conectores (tabla `mcp_servers`):**
1. `search_connectors` — Buscar conectores MCP por nombre o categoría
2. `get_connector_details` — Detalle completo de un conector por slug
3. `list_popular_connectors` — Conectores más populares por estrellas de GitHub

**Plugins (tabla `plugins`):**
4. `search_plugins` — Buscar plugins por nombre o categoría
5. `get_plugin_details` — Detalle completo de un plugin por slug
6. `list_popular_plugins` — Plugins más populares por instalaciones

**Utilidad general:**
7. `explore_directory` — Búsqueda unificada que devuelve skills, conectores y plugins relevantes en una sola respuesta

### Cambios técnicos
- **Archivo**: `supabase/functions/mcp-server/index.ts`
- Agregar 7 nuevas `mcp.tool()` registrations siguiendo el patrón existente
- Consultar tablas `mcp_servers` y `plugins` con los campos relevantes (nombre, descripción, slug, categoría, estrellas/installs, URL)
- Actualizar la versión del servidor a `3.0.0`
- Actualizar `llms.txt` y `llms-full.txt` con las nuevas tools (de 10 a 17)
- Actualizar la página `/mcp` para listar las nuevas herramientas disponibles
- Actualizar `ai-plugin.json` description para mencionar conectores y plugins

### Sin cambios de base de datos
Las tablas `mcp_servers` y `plugins` ya existen. Solo se leen datos públicos aprobados.

