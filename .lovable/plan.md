

## Plan: Reemplazar todas las URLs de Supabase por `https://mcp.pymaia.com`

Ahora que el proxy en Cloudflare está funcionando, voy a reemplazar **todas** las referencias a la URL larga de Supabase por la nueva URL profesional.

### Archivos a modificar (6 archivos, ~12 reemplazos)

| Archivo | Cambio |
|---------|--------|
| `public/.well-known/ai-plugin.json` | `api.url` → `https://mcp.pymaia.com` |
| `public/llms.txt` | 5 URLs → `https://mcp.pymaia.com` |
| `public/llms-full.txt` | 5 URLs → `https://mcp.pymaia.com` |
| `index.html` | meta tag `ai:mcp_server` → `https://mcp.pymaia.com` |
| `src/pages/PrimerosPasos.tsx` | comando de instalación → `https://mcp.pymaia.com` |
| `src/pages/MCP.tsx` | constante `MCP_URL` → `https://mcp.pymaia.com` (ya no necesita `VITE_SUPABASE_URL`) |

### Resultado

Antes:
```
https://zugqvdqactbhzlilwyds.supabase.co/functions/v1/mcp-server/mcp
```

Después:
```
https://mcp.pymaia.com
```

Todos los comandos de instalación, configs JSON, y documentación para LLMs mostrarán la URL profesional.

