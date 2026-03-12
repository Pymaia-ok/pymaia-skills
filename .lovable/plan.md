

## Optimización: Frecuencia de crons de monorepo

### Cambio propuesto

Subir la frecuencia de los crons:

| Cron | Actual | Propuesto | Razón |
|------|--------|-----------|-------|
| `monorepo_scan` | Semanal (dom 4AM) | **Cada 3 días** (lun/jue/sáb 4AM) | Detectar monorepos nuevos más rápido |
| `monorepo_sync` | Semanal (dom 5AM) | **Diario** (5AM UTC) | Indexar skills pendientes sin demora |

### Implementación

Un solo SQL para actualizar los dos cron jobs existentes:

```sql
SELECT cron.unschedule('monorepo-scan-weekly');
SELECT cron.unschedule('monorepo-sync-weekly');

-- Scan cada 3 días
SELECT cron.schedule('monorepo-scan-3d', '0 4 */3 * *', $$ ... $$);

-- Sync diario
SELECT cron.schedule('monorepo-sync-daily', '0 5 * * *', $$ ... $$);
```

### Sin cambios de código

Solo se actualizan las frecuencias de los cron jobs en la base de datos. Los edge functions `discover-trending-skills` y `sync-skills` no necesitan modificaciones.

