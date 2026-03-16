
Objetivo: arreglar `solve_goal` para que no vuelva a “retornar vacío” en tests reales, priorizando observabilidad + timeout safety + fallback garantizado.

## Lo que confirmé al revisar

1. `solve_goal` ya tiene resultados internos para esos casos:
   - En `agent_analytics` aparecen ejecuciones recientes para:
     - `run Meta Ads campaigns`
     - `manage personal finances and track expenses`
   - Esas ejecuciones guardaron:
     - keywords válidas
     - `option_a_count: 5`
     - `option_b_count: 6`
     - skills/connectors/plugins recomendados

2. O sea: el problema no parece ser “keyword classification vacía”.
   - `detectDomainByKeywords()` sí debería matchear esos goals.
   - En la base hay resultados para ambos dominios:
     - Meta/Ads: hay skills/connectors/plugins
     - Finance/Budget/Expense: también hay matches

3. El hallazgo más fuerte:
   - la última request al edge function `mcp-server` tardó `150394 ms` y devolvió 200.
   - Eso apunta a un problema de latencia/timeout/cliente MCP, no a falta de datos.
   - Si el cliente corta antes de recibir el body completo, el usuario lo percibe como “vacío”.

4. Además, hoy `solve_goal` hace mucho trabajo antes de responder:
   - clasificación LLM
   - `crossCatalogSearch()` sobre hasta 10 keywords expandidas
   - fallback semántico
   - fallback FTS
   - fallback por categoría
   - fallback por domain keywords
   - scoring
   - compatibilidad
   - analytics al final

## Plan de implementación

### 1) Agregar observabilidad real en `solve_goal`
Instrumentar logs estructurados en cada fase crítica:
- entrada del goal
- resultado de `detectDomainByKeywords()`
- resultado de `classifyIntent()`
- keywords finales que recibe `crossCatalogSearch()`
- cantidad de resultados por fase:
  - cross-catalog
  - semantic fallback
  - FTS fallback
  - category fallback
  - domain fallback
- tiempo acumulado por fase
- tamaño final de `optionA` y `optionB`

También mejorar el `catch` de `classifyIntent()` para loguear explícitamente:
- status HTTP
- response body si existe
- timeout/rate-limit/payment-required
- mensaje del error real

Esto valida exactamente los puntos que marcaste.

### 2) Crear modo keyword-only robusto cuando el LLM falle o tarde demasiado
No voy a depender de que el LLM “funcione bien”.
Voy a convertir `classifyIntent()` en:
- intento LLM con timeout corto
- si falla o excede el tiempo:
  - usar `detectDomainByKeywords()`
  - generar keywords limpias desde el goal
  - continuar normal

Para debug, dejaré preparado un flag temporal/log para confirmar si keyword-only resuelve bien esos casos.

### 3) Reducir drásticamente la latencia de `solve_goal`
Este es el fix principal porque hoy el problema parece de timeout.

Cambios planeados:
- limitar cantidad real de keywords buscadas
- evitar expansión excesiva de keywords multi-word
- cortar fases siguientes si ya hubo suficientes resultados en fases tempranas
- hacer búsquedas/fallbacks con presupuesto de tiempo
- mover analytics finales a fire-and-forget
- limitar o degradar el análisis de compatibilidad si ya pasó cierto tiempo
- devolver resultados parciales si ya hay suficientes items rankeados

Meta: que `solve_goal` responda rápido y no llegue a 150s.

### 4) Garantizar “never empty” de verdad
Aunque falle todo, `solve_goal` no debe terminar en respuesta útil-vacía.

Fallback final obligatorio:
1. si no hay resultados rankeados:
   - ejecutar `explore_directory(goal)` internamente o replicar su salida mínima
2. si aun así no hay matches exactos:
   - devolver mejores categorías relacionadas
   - devolver top tools de esas categorías
   - devolver mensaje explícito con siguiente acción

Además:
- envolver el texto final con `ensureResponse(...)`
- si `sections.join()` quedara vacío por cualquier razón, devolver un bloque mínimo de rescate

### 5) Endurecer `crossCatalogSearch()`
Revisar y ajustar:
- sanitización de keywords
- descarte de keywords demasiado genéricas
- logging por keyword y por catálogo
- control de keywords vacías
- fallback por palabras individuales solo cuando convenga

Para tus ejemplos:
- “Meta Ads campaigns” debe generar términos útiles tipo `meta`, `ads`, `facebook ads`, `advertising`
- “personal finances” debe generar `finance`, `budget`, `expenses`, `money`

### 6) Agregar una vía de respuesta rápida para goals comunes
Para dominios claramente detectados (`advertising`, `finance`, etc.):
- si keyword detection tiene confianza suficiente, usar directamente una búsqueda optimizada por dominio/categoría
- dejar el LLM como enriquecimiento, no como cuello de botella

Eso hace el flujo más estable para queries típicas.

## Archivos a tocar

- `supabase/functions/mcp-server/index.ts`

## Resultado esperado

Después de implementar esto:
- `run Meta Ads campaigns` debe devolver opciones concretas, no vacío
- `manage personal finances` debe devolver opciones concretas, no vacío
- si el clasificador LLM falla, el sistema sigue funcionando
- si las búsquedas profundas tardan demasiado, el sistema devuelve una versión parcial útil
- `solve_goal` nunca queda en blanco para el cliente

## Prioridad recomendada

1. Observabilidad + logs detallados
2. Timeout corto + keyword-only fallback
3. Reducción de latencia del pipeline
4. Fallback final obligatorio a `explore_directory`
5. Ajustes finos de relevancia

## Nota importante

Con lo que vi, yo no atacaría primero “más keywords”.
La evidencia actual dice que el backend sí encuentra recomendaciones, pero tarda demasiado.
Entonces el arreglo correcto es: hacer `solve_goal` observable, más corto, y con degradación controlada para que siempre responda antes del timeout del cliente.
