

## Plan: Optimizar y racionalizar todos los cron jobs

### Problemas a resolver

1. **3 duplicados de scan-security para skills** (`bulk-scan-skills-a/b/c`) — eliminar 2
2. **2 duplicados de calculate-trust-score** — eliminar el de */10
3. **7 jobs a */1 min** — excesivo; reducir a */3-5 min una vez que el backlog esté procesado
4. **Nuevas fuentes semanales inconsistentes** — skills.sh categories y agentskill deberían ser diarias (como las demás fuentes de sync), Composio semanal está bien

### Cambios propuestos (solo SQL contra `cron.job`)

| Acción | Job | De → A |
|---|---|---|
| **Eliminar** | `bulk-scan-skills-b` (jobid 51) | Duplicado |
| **Eliminar** | `bulk-scan-skills-c` (jobid 52) | Duplicado |
| **Eliminar** | `calculate-trust-scores` (jobid 36) | Solapado con fast |
| **Cambiar freq** | `sync-skills-categories-weekly` | Semanal → **Diario 8AM** |
| **Cambiar freq** | `sync-skills-agentskill-weekly` | Semanal → **Diario 9AM** |
| **Cambiar freq** | `bulk-scan-skills-a` | */1 → ***/3 min** |
| **Cambiar freq** | `bulk-scan-connectors-a` | */1 → ***/3 min** |
| **Cambiar freq** | `bulk-scan-plugins-a` | */1 → ***/3 min** |
| **Cambiar freq** | `translate-skills-fast` | */1 → ***/2 min** |
| **Cambiar freq** | `sync-skill-stars-auto` | */1 → ***/3 min** |
| **Cambiar freq** | `bulk-mark-no-mcp-auto` | */1 → ***/5 min** |

### Resultado

- De **36 jobs** a **33 jobs** (3 eliminados)
- De **7 jobs a */1 min** a **1 job a */2 min** — reducción de ~70% en invocaciones por minuto
- Todas las fuentes de sync de skills son diarias (consistente)
- Composio sigue semanal (catálogo estático, bajo cambio)
- Sin cambios en edge functions, solo en schedules de cron

### Resumen de frecuencias final

```text
SYNC (descubrimiento):     Diario 6-10AM
ENRIQUECIMIENTO:           */2-4 min
TRADUCCIÓN:                */2-3 min  
SEGURIDAD (scan inicial):  */3 min
SEGURIDAD (rescan):        Semanal
TRUST SCORES:              */5 min
MANTENIMIENTO:             */10 min
MONITOREO:                 */6h - */15 min
```

