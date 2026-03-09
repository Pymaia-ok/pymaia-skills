

## Diagnóstico: Por qué Claude no pudo usar el MCP de Pymaia

Hay **3 problemas concretos** que explican el error:

### Problema 1: No existe endpoint `/sse`
El archivo `ai-plugin.json` y `llms.txt` apuntan a:
```
https://zugqvdqactbhzlilwyds.supabase.co/functions/v1/mcp-server/sse
```
Pero el servidor MCP solo expone `/mcp` (streamable-http). **No hay ningún endpoint `/sse`** en el código. Claude intentó conectarse a una URL que devuelve 404.

### Problema 2: Configuración inconsistente entre archivos
- **`ai-plugin.json`**: dice `"transport": "sse"` con URL `/sse` — **incorrecto**
- **`llms.txt`**: usa `npx @anthropic-ai/mcp-remote` con URL `/sse` — **URL incorrecta**
- **Página `/mcp`**: muestra `"type": "streamable-http"` con URL `/mcp` — **correcto** pero Claude Desktop no soporta streamable-http nativamente sin wrapper

### Problema 3: Rutas web inexistentes
Claude intentó navegar `/skills` y `/connectors` en el sitio web, pero las rutas reales son `/explorar` y `/conectores`. El `llms.txt` sí lista las rutas correctas, pero Claude no lo leyó o lo ignoró.

---

## Plan de corrección

### 1. Corregir `ai-plugin.json`
Actualizar la URL y transport al endpoint real:
```json
"api": {
  "type": "mcp",
  "url": "https://zugqvdqactbhzlilwyds.supabase.co/functions/v1/mcp-server/mcp",
  "transport": "streamable-http"
}
```

### 2. Corregir `llms.txt` y `llms-full.txt`
Actualizar la configuración de instalación MCP. Ofrecer **dos opciones** para máxima compatibilidad:

**Opción A — Streamable HTTP directo** (Claude Code, Cursor, Windsurf nativos):
```json
{
  "mcpServers": {
    "pymaia-skills": {
      "type": "streamable-http",
      "url": "https://zugqvdqactbhzlilwyds.supabase.co/functions/v1/mcp-server/mcp"
    }
  }
}
```

**Opción B — Via proxy npx** (Claude Desktop y clientes que solo soportan SSE):
```json
{
  "mcpServers": {
    "pymaia-skills": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote", "https://zugqvdqactbhzlilwyds.supabase.co/functions/v1/mcp-server/mcp"]
    }
  }
}
```

### 3. Actualizar página `/mcp`
Mostrar ambas opciones de configuración (streamable-http directo y npx wrapper) para que el usuario elija según su cliente.

### 4. Agregar rutas alternativas en inglés (opcional pero recomendado)
Añadir redirects o aliases para `/skills` → `/explorar` y `/connectors` → `/conectores` en el router, ya que los LLMs tienden a inferir rutas en inglés.

### Archivos a modificar
- `public/.well-known/ai-plugin.json` — fix URL y transport
- `public/llms.txt` — fix config MCP, agregar ambas opciones
- `public/llms-full.txt` — idem
- `src/pages/MCP.tsx` — mostrar ambas configs (streamable-http + npx)
- `src/App.tsx` — agregar redirects `/skills` → `/explorar`, `/connectors` → `/conectores`

