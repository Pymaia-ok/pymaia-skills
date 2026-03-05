

## Diagnóstico: Por qué la búsqueda es lenta

**No hay búsqueda vectorial ni embeddings.** El motor actual usa exclusivamente `pg_trgm` (similitud por trigramas) sobre 6 columnas de texto (nombre, tagline, descripción × EN/ES).

### El problema concreto

Con 42,117 skills aprobadas y un umbral de similitud muy bajo (`set_limit(0.08)`), una búsqueda como "automation" genera:
- **4,347 candidatos** del índice de `display_name`
- **18,642 candidatos** del índice de `tagline`  
- **20,979 candidatos** del índice de `description_human`
- **20,708 descartados** en el recheck de heap

Resultado: **1.6 segundos** solo para la query SQL, antes de calcular scores de similitud y ordenar.

### Plan de mejora (3 niveles)

#### 1. Quick win: Optimizar la función `search_skills` existente
- Subir el umbral de similitud de `0.08` a `0.25` (reduce candidatos de ~20K a ~2K)
- Eliminar trigram sobre `description_human` (la columna más pesada) — dejar solo `ILIKE` para descripciones
- Filtrar por `status = 'approved'` ANTES del trigram usando un índice parcial
- Crear índice parcial: `CREATE INDEX idx_skills_approved ON skills(id) WHERE status = 'approved'`

**Cambios:**
- Migración SQL: nuevo índice parcial + actualizar función `search_skills`
- Sin cambios en frontend

#### 2. Agregar Full-Text Search (tsvector) como filtro primario
- Crear columna `search_vector tsvector` generada automáticamente desde `display_name`, `tagline`, `description_human` (EN + ES)
- Crear índice GIN sobre `search_vector`
- Usar `@@` (full-text match) como primer filtro rápido, trigram solo como fallback para fuzzy/typos
- FTS con `ts_rank` es ~10x más rápido que trigram para búsquedas por palabras clave

**Cambios:**
- Migración SQL: columna `search_vector`, trigger para mantenerla actualizada, índice GIN, actualizar función `search_skills`
- Sin cambios en frontend

#### 3. (Futuro) Embeddings vectoriales para búsqueda semántica
- Generar embeddings con un modelo (ej: text-embedding de OpenAI o Gemini) para cada skill
- Usar `pgvector` para búsqueda por similitud coseno
- Permite búsquedas semánticas reales ("quiero algo para automatizar mis ventas" → encuentra CRM tools)
- Requiere: extensión `pgvector`, columna `embedding vector(768)`, proceso batch para generar embeddings

Esto es más complejo y se puede hacer después. La combinación de FTS + trigram del nivel 1+2 ya debería bajar los tiempos de <200ms.

### Implementación propuesta (niveles 1 + 2 juntos)

1. **Migración SQL:**
   - Agregar columna generada `search_vector` con `tsvector` combinando los 6 campos de texto
   - Índice GIN sobre `search_vector`
   - Índice parcial sobre `status = 'approved'`
   - Actualizar `search_skills`: usar `search_vector @@ plainto_tsquery(query)` como filtro primario, trigram solo sobre `display_name` como fallback fuzzy, subir threshold a `0.25`

2. **Sin cambios en frontend** — la interfaz sigue llamando a `search_skills` con los mismos parámetros

**Resultado esperado:** De ~1.6s a <200ms por búsqueda.

