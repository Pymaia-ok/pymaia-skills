

# Plan: 11 Fixes Post-Audit — Pymaia Skills Pipelines

Este PRD tiene 11 fixes. Voy a agruparlos en bloques implementables. Algunos requieren migraciones SQL, otros son cambios en edge functions, y otros son consolidación de crons.

---

## Bloque A: Migraciones SQL (Fixes 4, 5, 6, 9, 11)

### Fix 4 — Cleanup install counts inflados
- Migración SQL: UPDATE skills que tienen install_count compartido por >1 skill, resetear a 0 con `install_count_source = 'imported'`

### Fix 5 — Resolver 765 slug collisions
- Migración SQL: Generar nuevos slugs para skills que colisionan con mcp_servers, insertar redirects en `slug_redirects`, renombrar skills
- La tabla `slug_redirects` ya existe y el MCP server ya tiene `resolveSlug()` que la consulta

### Fix 6 — Usage events RLS
- Verificar/agregar policy de INSERT para `anon` y `authenticated` en `usage_events`
- El MCP server usa `service_role` key, así que debería funcionar sin RLS issues — pero agregar la policy igual por seguridad

### Fix 9 — Quality rank formula sin GitHub data
- Migración SQL: Reemplazar `recompute_quality_ranks()` con fórmula adaptativa que redistribuye pesos cuando no hay github_metadata

### Fix 11 — Limpiar cron duplicados
- Migración SQL: Consultar `cron.job` y eliminar duplicados, dejar solo 1 cron por pipeline con las frecuencias recomendadas del PRD

---

## Bloque B: Edge Functions (Fixes 1, 2, 3, 6, 10)

### Fix 1 — generate-embeddings
- Aumentar batch_size default de 20 a 100
- Agregar retry con backoff (1 intento, 5s delay)
- Agregar inserción a `sync_log` al final
- Mejorar error logging (console.error ya existe, agregar sync_log)

### Fix 2 — bulk-fetch-skill-content
- Reducir batch default a 50 (actualmente 100)
- Agregar delay de 1s entre requests (ya tiene cada 20, mejorar)
- Manejar 403/429 con break
- Agregar sync_log

### Fix 3 — enrich-github-metadata paginación
- Eliminar `limit(1000)` en las queries de skills/connectors/plugins
- Usar estrategia de set difference: obtener todos los repo_full_names de github_metadata, filtrar los que faltan
- Paginar en batches para no exceder memoria

### Fix 6 — Instrumentar 38+ tools en MCP server
- Agregar `logUsageEvent()` en cada tool handler que no lo tiene
- Cambiar `.catch(() => {})` a `.catch((e) => console.error(...))`

### Fix 10 — sync_log en todos los pipelines
- Agregar INSERT sync_log al inicio (status=running) y UPDATE al final (completed/failed) en: sync-skills, sync-connectors, sync-plugins, sync-creators, enrich-github-metadata, bulk-fetch-skill-content, generate-embeddings, calculate-trust-score, discover-trending-skills

---

## Bloque C: Diagnóstico (Fixes 7, 8)

### Fix 7 — scrape-skills-sh
- Revisar la función, agregar fallback si sitemap no existe, mejorar logging

### Fix 8 — Bundles incompletos
- El `generate-bundles` ya tiene 10 roles con connector/plugin keywords. Los 15 bundles vacíos son roles que no están en `ROLE_CONFIG`
- Agregar los roles faltantes: profesor, medico, consultor, contador, etc.

---

## Orden de ejecución

1. **Bloque A** — Migraciones SQL (5 migraciones)
2. **Bloque B** — Edge functions (5 funciones + MCP server)
3. **Bloque C** — Diagnóstico y bundles

## Limitación importante

El MCP server tiene **4,133 líneas**. Instrumentar 38 tools con `logUsageEvent()` es un cambio masivo en un solo archivo. Lo haré en un paso dedicado, agrupando las tools por sección.

Los cambios totales son ~15 archivos editados. Estimo 3-4 mensajes de implementación para cubrir todo.

