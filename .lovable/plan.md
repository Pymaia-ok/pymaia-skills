

## Análisis: ¿Dónde falta documentar la funcionalidad de API Keys / Skills Privadas?

### Estado actual

| Página | ¿Menciona API Keys / Skills Privadas? |
|--------|---------------------------------------|
| `/mis-skills` (ApiKeysSection) | ✅ Completo — genera, lista, revoca keys, muestra snippet MCP |
| `/api-docs` (ApiDocs.tsx) | ✅ Completo — sección dedicada con snippets auth vs anon |
| `/mcp` (MCP.tsx) | ❌ **No menciona** — solo muestra config anónima, sin opción auth |
| `/primeros-pasos` (PrimerosPasos.tsx) | ❌ **No menciona** — tips avanzados hablan del MCP pero no de auth/private |
| `/conector/pymaia-skills` (ConectorDetail.tsx) | ❌ **No menciona** — es genérico, no tiene info específica de API keys |
| Landing (Index.tsx / McpBannerSection) | ❌ **No menciona** — CTA lleva a `/conector/pymaia-skills` sin contexto |
| `/publicar` (Publicar.tsx) | No revisado aún, pero probablemente no menciona |
| `public/.well-known/ai-plugin.json` | ✅ OK — `"auth": { "type": "none" }` es correcto (auth es opcional) |

### Plan de cambios

#### 1. Página MCP (`src/pages/MCP.tsx`)
- Agregar una sección **"Skills privadas vía API Key"** después de la config manual JSON
- Mostrar snippet de config con header `Authorization: Bearer`
- Explicar: "Generá tu API key en Mis Skills → las búsquedas incluirán tus skills privadas"
- Link a `/mis-skills` para generar la key

#### 2. Página Primeros Pasos (`src/pages/PrimerosPasos.tsx`)
- En la sección "Tips avanzados", agregar un nuevo tip card:
  - Título: "Accedé a skills privadas"
  - Desc: "Generá una API key para que el MCP Server incluya tus skills privadas en las búsquedas"
  - Link a `/mis-skills`

#### 3. Página del Conector Pymaia Skills (`src/pages/ConectorDetail.tsx`)
- Este es genérico para todos los conectores, **no conviene meter lógica específica acá**
- Alternativa: en la descripción del conector en DB ya se puede actualizar para mencionar la auth opcional, pero eso es contenido de DB, no código

#### 4. i18n
- Agregar las traducciones necesarias en `es.ts` y `en.ts` para las nuevas secciones en MCP y PrimerosPasos

### Resumen: 2 archivos a modificar
1. **`src/pages/MCP.tsx`** — nueva sección de config autenticada con snippet
2. **`src/pages/PrimerosPasos.tsx`** — nuevo tip card sobre API keys y skills privadas
3. **`src/i18n/es.ts`** + **`src/i18n/en.ts`** — traducciones nuevas

