

## Plan: Importar conectores masivamente desde registros MCP

### Fuente recomendada

**Smithery.ai** es la mejor opción para importación masiva:
- 3,700+ servers con datos estructurados
- API pública documentada: `GET https://registry.smithery.ai/servers?q=&page=1&pageSize=50`
- Devuelve: `qualifiedName`, `displayName`, `description`, `homepage`, `useCount`, `createdAt`
- No requiere API key para lectura

PulseMCP tiene más (6,000+) pero su API es de acceso comercial. El registro oficial de Anthropic es más curado pero no tiene API REST pública clara para bulk fetch.

### Estrategia

1. **Edge function `sync-connectors`** que haga fetch paginado a la API de Smithery
2. Mapear cada server a nuestra tabla `mcp_servers` con deduplicación por `slug`
3. Categorizar automáticamente usando keywords del nombre/descripción (gmail → communication, postgres → databases, etc.)
4. Importar en batches (50 por página, ~75 páginas)

### Cambios técnicos

| Cambio | Archivo |
|--------|---------|
| Nueva edge function de sync | `supabase/functions/sync-connectors/index.ts` |
| Agregar campos a `mcp_servers` | Migración SQL: `homepage`, `source`, `external_use_count` |
| Botón de sync en Admin | `src/pages/Admin.tsx` |

### Categorización automática

Mapeo por keywords:
- `gmail, email, outlook, smtp` → communication
- `github, gitlab, git, bitbucket` → development
- `postgres, mysql, mongodb, redis, supabase` → databases
- `slack, discord, teams` → communication
- `notion, obsidian, google docs` → productivity
- `brave, google, search, exa` → search
- `puppeteer, playwright, browser` → automation
- `stripe, shopify, payment` → apis
- Resto → general

### Resultado esperado

Pasar de 12 conectores a ~3,000+ conectores con datos reales, categorizados y con links a documentación.

