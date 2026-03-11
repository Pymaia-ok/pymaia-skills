

## Búsqueda Vectorial con Embeddings

### Situación actual
- **Full-text search** (`tsvector` + GIN index) como filtro primario
- **Trigramas** (`pg_trgm`) como fallback fuzzy
- **Smart search** usa IA para extraer keywords y luego re-rankea con otra llamada a IA (2 llamadas LLM por búsqueda)
- 36k+ skills, ~600 conectores, ~200 plugins

El approach actual tiene dos problemas: (1) la búsqueda semántica depende de que la IA extraiga las keywords correctas, y (2) hace 2+ llamadas LLM por búsqueda (lento y costoso).

### Propuesta: pgvector + embeddings pre-computados

Lovable Cloud (Supabase) soporta la extensión `pgvector`. La idea es:

1. **Habilitar pgvector** y agregar una columna `embedding vector(768)` a las tablas `skills`, `mcp_servers` y `plugins`
2. **Pre-computar embeddings** con un edge function batch que genera embeddings para cada registro usando el texto concatenado (nombre + tagline + descripción)
3. **Buscar por similaridad coseno** en vez de keywords

### Arquitectura

```text
Usuario escribe query
        │
        ▼
  Edge Function "semantic-search"
        │
        ├─ 1. Genera embedding del query (1 llamada LLM)
        │
        ├─ 2. SELECT ... ORDER BY embedding <=> query_embedding LIMIT 24
        │     (búsqueda vectorial ~50ms)
        │
        └─ Devuelve resultados rankeados por similitud semántica
```

vs. actual:
```text
  smart-search actual: 2 llamadas LLM + N queries paralelas = ~2-4s
  semantic-search:     1 llamada embedding + 1 query SQL    = ~500ms
```

### Plan de implementación

| Paso | Cambio |
|------|--------|
| 1. Migración SQL | `CREATE EXTENSION vector; ALTER TABLE skills ADD COLUMN embedding vector(768);` + índice HNSW. Lo mismo para `mcp_servers` y `plugins` |
| 2. Edge function `generate-embeddings` | Batch function que recorre registros sin embedding, genera con Lovable AI (Gemini embedding), y los guarda. Se ejecuta con cron o manualmente |
| 3. Edge function `semantic-search` | Recibe query text, genera embedding, ejecuta `ORDER BY embedding <=> query_embedding`, devuelve top N |
| 4. Actualizar `GlobalSearch.tsx` y `/explorar` | Usar `semantic-search` para queries de intención (>3 palabras), mantener trigram para queries cortas/exactas |
| 5. Trigger para nuevos registros | Al insertar/actualizar un skill, encolar generación de embedding |

### Consideraciones

- **Modelo de embeddings**: Lovable AI Gateway soporta Gemini, que tiene endpoint de embeddings. Si no está disponible via el gateway, alternativa es usar las tool calls existentes para generar una representación textual y buscar con ella.
- **Dimensiones**: Gemini embeddings son 768d. Con pgvector e índice HNSW, la búsqueda sobre 36k vectores es <50ms.
- **Costo**: Un solo embedding por query vs. 2 llamadas LLM completas actuales = significativamente más barato y rápido.
- **Fallback**: Si un registro no tiene embedding aún, se usa el search_skills actual como fallback.

### Limitación a investigar

El Lovable AI Gateway (`ai.gateway.lovable.dev`) expone `/v1/chat/completions` (completions API). Los embeddings normalmente usan `/v1/embeddings`. Necesito verificar si el gateway soporta embeddings directamente. Si no, la alternativa es usar Gemini tool calling para generar una representación semántica compacta (más costoso pero funcional), o pedir al usuario una API key de OpenAI/Voyage para embeddings dedicados.

### Pregunta clave antes de implementar

Necesitamos confirmar si el gateway de Lovable AI soporta el endpoint `/v1/embeddings`. Si no lo soporta, hay dos caminos:
- **A)** Usar el chat completion para generar un "pseudo-embedding" (array de floats via tool call) -- hack pero funciona
- **B)** Conectar una API key de embeddings dedicada (OpenAI, Voyage, o Cohere)

