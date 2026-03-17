

# PRD Calidad, Confianza y Seguridad — Análisis

## Verificación contra datos reales

| # | Fix | ¿Real? | Evidencia |
|---|---|---|---|
| 1 | error-helpers import | ⚠️ **Parcialmente hecho** | `poll-vt-pending` y `rescan-security` YA logean a `automation_logs` manualmente (líneas 154-158 y 88-92). No importan el helper pero el efecto es el mismo. `refresh-catalog-data` sí tiene catches con solo `console.error` |
| 2 | No mostrar items sin scan | ✅ **Válido y grave** | **1,796 skills aprobadas sin security_scan_result**. Un usuario puede instalar algo no escaneado |
| 3 | Plugins auto-approved sin escaneo | ✅ **Válido y grave** | Confirmado: `sync-plugins` línea 91 usa `status: "approved"` + `security_status: "unverified"`. **226 plugins afectados** |
| 4 | Auto-rechazar repos archivados | ✅ **Válido** | `refresh-catalog-data` línea 218-222: detecta `data.archived` pero solo logea, no cambia status |
| 5 | Trust score mínimo | ❌ **No aplica** | Query muestra **0 items con trust_score NULL**. Todos ya tienen score calculado |
| 6 | Forzar scan antes de auto-approve | ✅ **Válido** | Complementa Fix 3 — previene que items pasen a approved sin scan |
| 7 | Priorizar scan de items nuevos | ✅ **Válido** | Si implementamos Fix 2+3, items nuevos quedan invisibles hasta scan. Priorizar reduce el delay |
| 8 | Badge "Sin evaluar" | ❌ **No necesario** | Con 0 items con trust_score NULL y Fix 2 filtrando unscanned, el estado "sin evaluar" no se mostrará |

## Plan: 5 fixes reales

### Fix 2: Filtrar items sin scan en queries (P0)
- **`src/lib/api.ts` → `fetchSkills`/`fetchAllSkills`**: Agregar `.or("security_scan_result.not.is.null,trust_score.gte.60")` después de `.eq("status", "approved")`
- Esto permite items de publishers confiables (trust_score ≥ 60) sin scan, pero bloquea desconocidos sin escanear

### Fix 3: Plugins importados como "pending" (P0)
- **`supabase/functions/sync-plugins/index.ts`**: Cambiar `status: "approved"` → `status: "pending"` en las 2 funciones de sync (líneas 91 y ~160)
- Plugins nuevos solo se aprueban después del pipeline de security scan + trust score + auto-approve

### Fix 4: Auto-rechazar repos archivados (P1)
- **`supabase/functions/refresh-catalog-data/index.ts`**: En líneas 218-222, además de logear, hacer `update({ status: "rejected", security_status: "flagged", security_notes: "Repository archived..." })`

### Fix 6: Scan requerido para auto-approve (P1)
- **`supabase/functions/calculate-trust-score/index.ts`** o **`auto-approve-skills/index.ts`**: Agregar check `if (!item.security_scan_result) continue;` antes de auto-aprobar

### Fix 7: Priorizar scan de items nuevos (P2)
- **`supabase/functions/scan-security/index.ts`**: Cambiar query para buscar primero `status = 'pending' AND security_scan_result IS NULL`, y solo si no hay pendientes, continuar con rescan normal

### Fix 1: Solo `refresh-catalog-data` (menor)
- Las otras 2 funciones ya logean. Solo falta importar `logFailure` en `refresh-catalog-data` para los catches con `console.error`

### No implementar
- **Fix 5**: 0 items con trust_score NULL — no hay gap real
- **Fix 8**: Sin Fix 5 activo, el badge "Sin evaluar" no se necesita

### Archivos a editar (7)
| Archivo | Fix |
|---|---|
| `src/lib/api.ts` | Fix 2 |
| `supabase/functions/sync-plugins/index.ts` | Fix 3 |
| `supabase/functions/refresh-catalog-data/index.ts` | Fix 4 + Fix 1 |
| `supabase/functions/auto-approve-skills/index.ts` | Fix 6 |
| `supabase/functions/scan-security/index.ts` | Fix 7 |
| `supabase/functions/calculate-trust-score/index.ts` | Fix 6 (verificar dónde está la lógica de auto-approve) |

No requiere migraciones SQL.

