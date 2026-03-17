

# PRD logFailure Final — Verificación

Claude tiene razón. Los 6 catches vacíos siguen exactamente como describe el PRD:

| Función | Catches vacíos encontrados |
|---|---|
| `poll-vt-pending` | L158: `.catch(() => {})`, L171: `catch { /* fire-and-forget */ }` |
| `rescan-security` | L92: `.catch(() => {})`, L104: `catch { /* non-critical */ }`, L114: `catch { /* fire-and-forget */ }` |
| `refresh-catalog-data` | L57: `catch { /* fire-and-forget */ }` |

Ninguna importa `logFailure` del helper existente.

## Plan: 3 archivos, 6 catches

### 1. `supabase/functions/poll-vt-pending/index.ts`
- Agregar `import { logFailure } from "../_shared/error-helpers.ts";`
- L158: `.catch(() => {})` → `.catch((err) => logFailure(supabase, "poll-vt-pending", (err as Error).message, { step: "automation_log_insert" }))`
- L171: `catch { /* fire-and-forget */ }` → `catch (err) { await logFailure(supabase, "poll-vt-pending", (err as Error).message, { step: "main_catch" }); }`

### 2. `supabase/functions/refresh-catalog-data/index.ts`
- Agregar import de `logFailure`
- L57: `catch { /* fire-and-forget */ }` → `catch (err) { await logFailure(sb, "refresh-catalog-data", (err as Error).message, { step: "top_level_log" }); }`

### 3. `supabase/functions/rescan-security/index.ts`
- Agregar `import { logFailure } from "../_shared/error-helpers.ts";`
- L92: `.catch(() => {})` → `.catch((err) => logFailure(supabase, "rescan-security", (err as Error).message, { step: "automation_log_insert" }))`
- L104: `catch { /* non-critical */ }` → `catch (err) { await logFailure(supabase, "rescan-security", (err as Error).message, { step: "trust_score_recalc" }); }`
- L114: `catch { /* fire-and-forget */ }` → `catch (err) { await logFailure(supabase, "rescan-security", (err as Error).message, { step: "main_catch" }); }`

### Nota sobre la firma de `logFailure`
El helper actual acepta `(supabase, functionName, reason: string, metadata?)`. El PRD pasa `err as Error` pero la firma espera un string. Usaremos `(err as Error).message` para que coincida con la firma existente.

### Deploy
Redesplegar las 3 funciones después de editar.

