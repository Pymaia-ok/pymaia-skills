

## Diagnóstico: Los crons avanzan pero son demasiado lentos

### Estado actual del catálogo (39,519 skills aprobados)

| Proceso | Completado | Pendiente | Batch | Intervalo | ETA actual |
|---------|-----------|-----------|-------|-----------|------------|
| README + Summary | 7,746 | 31,509 | 10 c/3min | ~200/hr | **~6.5 días** |
| Traducción ES | 1,638 | 37,881 | 15 c/10min | ~90/hr | **~17 días** |
| GitHub Stars | 28,611 | 10,822 | 80 c/1min | ~4,800/hr | **~2 horas** |
| Traducción Conectores | corriendo | - | 20 c/3min | OK | - |

**Problema**: Los crons ejecutan con éxito (`succeeded`) pero los batch sizes e intervalos son ridículamente bajos para el volumen. La traducción a este ritmo tardaría 17 días más.

### Plan: Acelerar los 2 crons lentos

**1. Traducción de skills** — De 17 días a ~1 día
- Subir batchSize de 15 → 50
- Bajar intervalo de cada 10 min → cada 2 min
- Resultado: ~1,500/hr → termina en ~25 horas

**2. Fetch README** — De 6.5 días a ~2 días
- Subir batchSize de 10 → 25
- Bajar intervalo de cada 3 min → cada 2 min
- Resultado: ~750/hr → termina en ~42 horas

### Implementación

1. **Eliminar los crons viejos** vía SQL (`cron.unschedule`)
2. **Crear crons nuevos** con batchSize y frecuencia aumentados
3. **Actualizar las edge functions** `translate-skills` y `fetch-readme` para manejar los lotes más grandes sin timeout (ya deberían soportarlo, pero verificar)

### Detalle técnico

- Los crons se actualizan via `cron.unschedule` + `cron.schedule` (SQL directo, no migration)
- Las edge functions no necesitan cambios de código — el batchSize se pasa como parámetro en el body del cron
- Stars está bien, terminará solo en ~2 horas

