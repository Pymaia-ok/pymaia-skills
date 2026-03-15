

## Estado Actual y Brechas por Cerrar

Hice una auditoría completa. Aquí está el resumen de cobertura:

```text
Pipeline                    | Hecho      | Total     | %     | Estado
────────────────────────────┼────────────┼───────────┼───────┼────────────
Traducción skills           | 36,497     | 36,822    | 99.1% | ✅ Cron activo
Traducción conectores       | 6,360      | 6,360     | 100%  | ✅ Completo
Traducción plugins          | 480        | 480       | 100%  | ✅ Completo
Traducción readme_summary_es| 13,400     | 17,692    | 75.7% | ⚠️ Cron activo, lento
Security scan skills        | 36,529     | 36,822    | 99.2% | ✅ Casi completo
Security scan conectores    | 6,123      | 6,360     | 96.3% | ⚠️ Cron activo
Security scan plugins       | 433        | 480       | 90.2% | ⚠️ Cron activo
Trust score skills          | 35,913     | 36,822    | 97.5% | ⚠️ 909 faltan
Trust score conectores      | 107        | 6,360     | 1.7%  | ❌ CRÍTICO
Trust score plugins         | 125        | 480       | 26.0% | ❌ CRÍTICO
README fetch (skills)       | 17,692     | 36,564    | 48.4% | ⚠️ Cron activo, 19K faltan
Embeddings (semántica)      | 0          | 36,822    | 0%    | ❌ Sin cron
Skills pending              | 6,183      | —         | —     | ⚠️ Backlog
Install cmd conectores      | 2,586      | 6,360     | 40.7% | ⚠️ 3,774 sin cmd
```

### Problemas Críticos (no al 100%)

1. **Trust Score conectores/plugins**: El cron `calculate-trust-scores-fast` envía `batch_size: 50` y `table: "all"`, pero procesa skills primero (ordenado por `updated_at ASC`), dejando conectores y plugins sin procesar. Con 6,253 conectores sin score, a 50/15min tardaría ~31 horas solo para llegar a ellos.

2. **Embeddings 0%**: No hay cron de `generate-embeddings`. La búsqueda semántica está inactiva.

3. **README fetch**: 19,130 skills sin README. El cron `fetch-readme-auto` procesa 10/ejecución. A ese ritmo ~1,913 ejecuciones = ~4 días continuos.

4. **readme_summary_es**: 4,292 skills tienen summary en inglés pero no en español.

5. **Conectores sin install_command**: 3,774 conectores (59%) no tienen comando de instalación.

---

### Plan de Acción

#### 1. Acelerar Trust Score para conectores y plugins
- Crear 2 crons adicionales dedicados:
  - `calculate-trust-connectors` cada 5 min, `body: {"batch_size":100,"table":"mcp_servers"}`
  - `calculate-trust-plugins` cada 10 min, `body: {"batch_size":100,"table":"plugins"}`
- ETA: conectores ~5.2 horas, plugins ~35 min

#### 2. Activar cron de embeddings
- Crear cron `generate-embeddings-auto` cada 3 min, batch 20
- ETA: ~36,822 / 20 = 1,841 ejecuciones ÷ 20/hora = ~92 horas (gradual, no urgente)

#### 3. Acelerar README fetch
- Aumentar batch del cron existente de 10 a 30
- Actualizar el cron `fetch-readme-auto` con `batchSize: 30`
- ETA: 19,130 / 30 = 638 ejecuciones. A */3 min = ~32 horas

#### 4. Traducción readme_summary_es
- Verificar que el cron de `translate-skills` ya procesa `readme_summary_es`. Si no, agregar.
- 4,292 pendientes deberían resolverse con el cron existente de traducción.

#### 5. Install commands conectores
- El cron `generate-install-commands` ya existe pero solo procesa skills. Extenderlo para procesar también `mcp_servers` sin install_command.

#### 6. Procesar backlog de 6,183 pending
- El cron `auto-approve-skills` ya corre cada 3 min con batch 100. ETA: ~3 horas para procesar todo el backlog.

---

### Cambios Técnicos

**Solo SQL (crons nuevos)** — 3 inserts en `cron.schedule`:
1. `calculate-trust-connectors` — cada 5 min
2. `calculate-trust-plugins` — cada 10 min  
3. `generate-embeddings-auto` — cada 3 min

**Actualizar cron existente** — 1 update:
4. `fetch-readme-auto` batch 10 → 30

**Modificar edge function** (1 archivo):
5. `generate-install-commands/index.ts` — agregar soporte para tabla `mcp_servers`

Total: 4 operaciones de base de datos + 1 edición de edge function.

