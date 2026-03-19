

# Agregar Freepik MCP al catálogo de conectores

## Qué es
Freepik ofrece un servidor MCP oficial con capacidades de generación de imágenes/iconos/video, búsqueda de stock, y clasificación IA. Tiene dos versiones: remota (`api.freepik.com/mcp` con HTTP-stream) y open-source local (stdio vía `uv`).

## Cambio
Insertar un registro curado en `mcp_servers` con:

| Campo | Valor |
|---|---|
| name | Freepik |
| slug | freepik |
| category | design |
| description | AI image generation, icon creation, video generation, stock content search, and AI classification via the Freepik API. |
| description_es | Generación de imágenes con IA, creación de iconos, generación de video, búsqueda de contenido stock y clasificación con IA vía la API de Freepik. |
| install_command | `npx -y mcp-remote https://api.freepik.com/mcp --header "x-freepik-api-key:YOUR_FREEPIK_API_KEY"` |
| github_url | https://github.com/freepik-company/freepik-mcp |
| homepage | https://docs.freepik.com/modelcontextprotocol |
| docs_url | https://docs.freepik.com/modelcontextprotocol |
| credentials_needed | `["FREEPIK_API_KEY"]` |
| is_official | true |
| source | curated |
| status | approved |

## Archivo
SQL migration via database tool — single INSERT into `mcp_servers`.

