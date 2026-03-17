

# PRD Pendientes Finales — Verificación contra código actual

## Resultado: 2 de 3 fixes son reales

| # | Fix | ¿Real? | Evidencia |
|---|---|---|---|
| 1 | Imports auto-aprueban sin scan | ✅ **Confirmado** | `scrape-skills-sh` línea 399, `sync-antigravity` línea 182, `import-skills-csv` línea 154 — todos usan `status: "approved"` |
| 2 | MCP server sin filtro de scan | ✅ **Confirmado** | `crossCatalogSearch()` líneas 1165-1188: queries de skills, connectors y plugins solo filtran `status.eq.approved` sin `.or("security_scan_result.not.is.null,trust_score.gte.60")` |
| 3 | logFailure no se usa | ⚠️ **Parcialmente falso** | `poll-vt-pending` y `rescan-security` YA importan `errorResponse` y logean a `automation_logs` manualmente con catches detallados. Solo `refresh-catalog-data` no importa nada de error-helpers. Los "catches vacíos" del PRD son `.catch(() => {})` internos para fire-and-forget de automation_logs, lo cual es aceptable |

---

## Plan: 2 fixes reales + 1 menor

### Fix 1: Imports como "pending" (P0)
3 cambios de una línea:
- **`scrape-skills-sh/index.ts`** línea 399: `status: "approved"` → `status: "pending"`
- **`sync-antigravity-skills/index.ts`** línea 182: `status: "approved"` → `status: "pending"`
- **`import-skills-csv/index.ts`** línea 154: `status: "approved"` → `status: "pending"`

### Fix 2: MCP server filtra por scan (P0)
En `crossCatalogSearch()` (líneas 1165-1188), agregar `.or("security_scan_result.not.is.null,trust_score.gte.60")` a las 3 queries:
- Skills query (línea 1172)
- MCP servers query (línea 1179)
- Plugins query (línea 1186)

### Fix 3: refresh-catalog-data error logging (P1 — menor)
Solo `refresh-catalog-data` carece de `logFailure`. Agregar import y reemplazar los `console.error` catches con `logFailure`. Las otras 2 funciones ya logean correctamente.

### Archivos a editar (5)
| Archivo | Fix |
|---|---|
| `supabase/functions/scrape-skills-sh/index.ts` | Fix 1 |
| `supabase/functions/sync-antigravity-skills/index.ts` | Fix 1 |
| `supabase/functions/import-skills-csv/index.ts` | Fix 1 |
| `supabase/functions/mcp-server/index.ts` | Fix 2 |
| `supabase/functions/refresh-catalog-data/index.ts` | Fix 3 |

No requiere migraciones SQL.

