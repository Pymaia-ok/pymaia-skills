

## Diagnóstico: Por qué Claude no pudo instalar Polynod

### Lo que funciona bien
- El conector "Polynod" existe en la base de datos con slug `polynod` y nombre `Polynod`
- La búsqueda ILIKE `%polynod%` debería encontrarlo sin problemas
- `get_connector_details("polynod")` devuelve el install command correctamente

### Los problemas reales

**1. Error Cloudflare 1105 (transitorio)**
Claude reportó que el servidor MCP no respondía. Esto impidió que cualquier herramienta funcionara durante esa sesión. Es un problema del proxy, no de la búsqueda.

**2. `search_connectors` no muestra el install command en los resultados**
La respuesta incluye nombre, categoría, estrellas, descripción y GitHub URL, pero **omite el `install_command`**. Esto obliga a Claude a hacer una segunda llamada a `get_connector_details` para obtener el comando de instalación.

**3. `get_install_command` solo busca en skills, no en conectores ni plugins**
Si Claude usa esta herramienta con "polynod", no lo encuentra porque solo busca en la tabla `skills`. Debería buscar también en `mcp_servers` y `plugins`.

### Plan de cambios

| Cambio | Archivo |
|--------|---------|
| Agregar `install_command` al output de `search_connectors` | `mcp-server/index.ts` línea ~559 |
| Agregar `install_command` al output de `search_plugins` | `mcp-server/index.ts` (handler equivalente) |
| Expandir `get_install_command` para buscar en `mcp_servers` y `plugins` además de `skills` | `mcp-server/index.ts` líneas 2125-2163 |

### Detalle de cambios

**search_connectors output** — agregar el install command al formato de respuesta:
```
**Polynod** [ai] ✅ Official (⭐ 45 GitHub stars)
AI-powered product photography...
Install: `npx @anthropic-ai/mcp-remote https://...`
```

**get_install_command** — después de buscar en skills sin resultado, buscar en `mcp_servers` por slug y luego por nombre, y después en `plugins`. Esto permite que `get_install_command("polynod")` devuelva directamente el comando de instalación del conector.

