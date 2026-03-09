

# Problemas con los conectores recién agregados

Los 44 conectores que insertamos tienen 2 problemas importantes que afectan cómo se ven en la app:

## 1. Iconos incorrectos
Todos tienen `icon_url` apuntando a `https://www.google.com/s2/favicons?domain=claude.ai&sz=64`, que muestra el favicon de Claude, no el logo de cada marca. En la grilla de `/conectores` y en `/conector/{slug}` todos se ven con el mismo icono genérico de Claude.

**Fix**: Actualizar los `icon_url` de los 44 registros para usar el favicon real de cada marca. Por ejemplo:
- Gamma → `https://www.google.com/s2/favicons?domain=gamma.app&sz=64`
- Fireflies → `https://www.google.com/s2/favicons?domain=fireflies.ai&sz=64`
- Indeed → `https://www.google.com/s2/favicons?domain=indeed.com&sz=64`
- Harvey → `https://www.google.com/s2/favicons?domain=harvey.ai&sz=64`
- etc.

Esto se hace con un solo `UPDATE` SQL por cada conector con el dominio correcto.

## 2. `is_official` está en `false`
Estos son plugins oficiales de Claude pero los insertamos como `is_official = false`, así que aparecen como "Community" en vez de "Official" en los badges. Deberían ser `is_official = true`.

**Fix**: `UPDATE mcp_servers SET is_official = true WHERE slug IN ('gamma', 'fireflies', ...)` para los 44 slugs.

## Plan de ejecución

1. **Migración SQL** con ~44 `UPDATE` statements para corregir `icon_url` con el dominio real de cada marca y `is_official = true` en batch.
2. **Sin cambios de código** — la app ya renderiza correctamente si los datos son buenos.

## Resultado esperado
- Cada conector muestra su logo de marca real en la grilla
- Badge "Official" con el check azul en vez de "Community"
- Página de detalle con icono y badge correctos

