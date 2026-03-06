

## Plan: Curar conectores principales y expandir fuentes

### Problema identificado
Los conectores de marcas conocidas (GitHub, Discord, Zoom, WhatsApp, Docker, etc.) existen en la DB pero con slugs largos como `smithery-ai-github` o `ckreiling-mcp-server-docker`. No hay un conector "canónico" con slug limpio para cada marca principal.

### Paso 1: Crear registros canónicos para ~40 marcas principales

Insertar manualmente (o via SQL batch) registros con slugs limpios para las herramientas más conocidas que ya tienen variantes en la DB pero sin un registro "principal":

```text
Marca           | Slug limpio    | Fuente del mejor registro existente
─────────────────────────────────────────────────────────────────────
GitHub          | github         | smithery-ai-github (ya existe con slug limpio)
Discord         | discord        | barryyip0625-mcp-discord
Jira            | jira           | ai-waystation-jira
Linear          | linear         | (buscar mejor variante)
HubSpot         | hubspot        | kozo93-hubspot-mcp
Salesforce      | salesforce     | ai-cirra-salesforce-mcp
Docker          | docker         | io-github-dave-london-docker
Kubernetes      | kubernetes     | flux159-mcp-server-kubernetes
Zoom            | zoom           | (buscar)
WhatsApp        | whatsapp       | (buscar)
Telegram        | telegram       | chaindead-telegram-mcp
Dropbox         | dropbox        | cindyloo-dropbox-mcp-server
Sentry          | sentry         | getsentry-sentry-mcp
Cloudflare      | cloudflare     | cloudflare-mcp-server-cloudflare
Vercel          | vercel         | (buscar)
WordPress       | wordpress      | (buscar)
Trello          | trello         | (buscar)
Asana           | asana          | (buscar)
Twilio          | twilio         | (buscar)
...etc (~40 total)
```

Cada registro canónico tendría:
- Slug limpio (ej. `discord`)
- Nombre display limpio (ej. `Discord`)
- Icono de Simple Icons CDN
- Homepage oficial
- Mejor comando de instalación disponible
- Source: `"curated"`

### Paso 2: Agregar nueva fuente de sync — mcp.so

Crear una nueva función en `sync-connectors` que importa desde **mcp.so**, que tiene una API pública y es uno de los directorios más completos (~7,000+ servers).

- Endpoint: `https://mcp.so/api/servers` (o scraping via Firecrawl si no hay API)
- Upsert por slug con `ignoreDuplicates: true`

### Paso 3: Agregar nueva fuente — Glama.ai API

Glama.ai ofrece un directorio curado con categorización. Agregar como fuente adicional en `sync-connectors`:

- Endpoint: `https://glama.ai/mcp/servers` (API o scraping)
- Similar al patrón existente de awesome-mcp-servers

### Paso 4: Script de iconos para los nuevos canónicos

Ejecutar `fetch-connector-icons` sobre los nuevos registros, asegurando que todas las marcas principales tengan icono.

### Resultado esperado
- ~40 marcas principales con slugs limpios, iconos y datos curados
- 2 fuentes nuevas de sync para descubrir MCPs futuros
- Total estimado: 8,000-12,000 conectores únicos

### Archivos a modificar
- `supabase/functions/sync-connectors/index.ts` — agregar casos `mcp-so` y `glama-ai`
- `supabase/functions/fetch-connector-icons/index.ts` — ya tiene las marcas principales
- SQL batch para insertar los ~40 registros canónicos

