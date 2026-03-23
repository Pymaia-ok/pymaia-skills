

# Revisión del PRD: Experience Layer v2.0

## Veredicto: Implementable. Buen PRD.

Es uno de los PRDs más buildable que he visto para este proyecto. El contexto técnico es preciso, los snippets de código son funcionales, y el orden de implementación es correcto. Hay algunos ajustes menores necesarios.

---

## Lo que está bien

- **Contexto técnico correcto**: Stack, scoring actual (líneas 1484-1550), tablas existentes — todo matchea con el código real
- **Backwards compatible**: Agregar `execution_id` como HTML comment no rompe callers. Correcto.
- **Orden de implementación sensato**: DB → logging → config → outcome tool → dynamic scoring → rate limiting. Cada paso es deployable solo.
- **Privacidad resuelta**: SHA-256 con salt para IPs, sin FK a usuarios
- **Rate limiting pragmático**: Tabla propia con upsert atómico en Postgres, sin dependencias externas
- **Fase 2 separada**: La inferencia pasiva está documentada pero no bloquea

## Ajustes necesarios antes de implementar

### 1. El scoring actual es más complejo que lo documentado
El PRD muestra las líneas 1484-1550 simplificadas. En realidad hay:
- Quality guards adicionales (corrupted taglines: -15, tagline/name mismatch: -5, zero-signal: -8)
- Connector-specific penalty (90% si zero goal-word overlap)
- Install count bonuses (+3 si >100, +1 si >10)
- Rating bonus (+2 si avg_rating >= 4.0)
- A/B variant "reranked" con shuffle de tiers

La tabla `scoring_config` necesita ~8 keys más para cubrir todo esto. Sin impacto en arquitectura, solo más rows.

### 2. Materialized View: no hay pg_cron nativo
Lovable Cloud no expone `pg_cron`. La alternativa es un cron job de Supabase (edge function invocada periódicamente) que ejecute `REFRESH MATERIALIZED VIEW experience_tool_scores` vía RPC. Ya tenemos el patrón con `refresh_directory_stats`.

### 3. HASH_SALT como secret
El PRD lo menciona como env var. Se debe agregar como secret de Supabase. Ya tenemos el tool `add_secret` para esto.

### 4. RLS policies faltantes
El PRD no especifica RLS para las nuevas tablas. Necesitamos:
- `experience_executions`: INSERT para anon/service_role, SELECT para admins y service_role
- `experience_outcomes`: igual
- `rate_limit_log`: ALL para service_role solamente
- `scoring_config`: SELECT para service_role (el MCP corre con service_role key), ALL para admins

### 5. Cleanup job para rate_limit_log
La tabla crece indefinidamente. Agregar un DELETE de rows con `window_start < now() - interval '24 hours'` en el cron de refresh.

## Estimación de implementación

| Step | PRD dice | Mi estimación |
|---|---|---|
| DB setup | 1-2h | 1 mensaje (migración SQL) |
| Logging solve_goal | 2-3h | 1 mensaje |
| Scoring config from DB | 1-2h | 1 mensaje |
| report_goal_outcome tool | 3-4h | 1-2 mensajes |
| Dynamic scoring | 2-3h | 1 mensaje |
| Rate limiting | 1h | 1 mensaje |
| **Total** | **10-15h** | **5-7 mensajes** |

## Plan de implementación

### Mensaje 1: DB Setup
- Crear las 4 tablas (`experience_executions`, `experience_outcomes`, `scoring_config`, `rate_limit_log`)
- Crear la materialized view `experience_tool_scores`
- Crear funciones `upsert_rate_limit` y `refresh_experience_scores` (RPC)
- RLS policies para todas las tablas
- Agregar `HASH_SALT` como secret

### Mensaje 2: Logging + Config
- Helper `hashSHA256` en el MCP server
- Loader de `scoring_config` con cache de 5 min
- Reemplazar constantes hardcodeadas por valores del config (con fallback)
- Generar `execution_id` y loguearlo async en solve_goal
- Agregar HTML comment `<!-- execution_id: ... -->` al response

### Mensaje 3: report_goal_outcome + Rate Limiting
- Registrar `report_goal_outcome` como tool MCP
- Implementar `checkRateLimit` usando `upsert_rate_limit`
- Aplicar rate limit en `report_goal_outcome` (20/hora) y `solve_goal` (100/hora)
- Aplicar rate limit global en middleware Hono (500/hora)

### Mensaje 4: Dynamic Scoring
- Implementar `getDynamicScores` con query a la materialized view (timeout 200ms)
- Integrar en el loop de scoring de solve_goal
- Agregar `experience_backed` y `outcomes_count` al response
- Crear edge function cron para refresh de la materialized view cada hora

