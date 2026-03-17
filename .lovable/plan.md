

# PRD Audit Pendientes — 5 Fixes Incompletos

Confirmé contra el código actual que los 5 fixes están efectivamente pendientes:

| # | Fix | Estado actual verificado |
|---|---|---|
| 1 | error-helpers import | ✅ Pendiente — `error-helpers.ts` existe pero ninguna función lo importa. `poll-vt-pending` ya logea manualmente pero no usa el helper. `send-email`, `refresh-catalog-data` tienen catches silenciosos. |
| 2 | CORS restringido | ✅ Pendiente — `manage-api-keys` y `enroll-sequence` usan `"*"` |
| 3 | Rate limiting | ✅ Pendiente — `scan-security` y `regen-blog-covers` no tienen rate limit |
| 4 | SkillFromDB campos | ✅ Pendiente — Faltan `readme_raw`, `readme_summary`, `readme_summary_es`, `changelog`, `required_mcps`. Hay 11+ `as any` en SkillDetail.tsx |
| 5 | Console.logs + catches vacíos | ✅ Pendiente — 10 `[ScreenRec]` console.logs en SkillChat.tsx, 8 `.catch(() => {})` en SkillDetail, RoleLanding, useAuth, BlogPost |

---

## Implementación

### Fix 1: Import error-helpers en 4 funciones
- **`send-email/index.ts`**: Import `errorResponse` from shared helpers, use for error responses
- **`refresh-catalog-data/index.ts`**: Replace 3 silent catches (lines 156, 164, 222) with `console.error` (no supabase client in those scopes, so just log to console — the function already has its own `log()` helper for automation_logs)
- **`rescan-security/index.ts`**: Already logs to automation_logs manually — just import and use `errorResponse` for the final catch
- **`poll-vt-pending/index.ts`**: Already logs errors — import `errorResponse` for standardized response format

### Fix 2: CORS restringido en manage-api-keys y enroll-sequence
- Add `getRestrictedCorsHeaders(req)` helper inline in both files
- Allowed origins: `pymaiaskills.lovable.app`, preview URL, `localhost:5173`, `localhost:8080`
- Replace all `corsHeaders` references with the restricted version

### Fix 3: Rate limiting en scan-security y regen-blog-covers
- **`scan-security/index.ts`**: Add 60/hour limit check at handler start using `automation_logs` count
- **`regen-blog-covers/index.ts`**: Add 5/hour limit check at handler start

### Fix 4: SkillFromDB + remove `as any`
- Add 5 fields to `SkillFromDB` interface in `src/lib/api.ts`: `readme_raw`, `readme_summary`, `readme_summary_es`, `changelog`, `required_mcps`
- Remove all `(skill as any).` casts in `SkillDetail.tsx` for these fields

### Fix 5: Frontend cleanup
- **`SkillChat.tsx`**: Wrap all `[ScreenRec]` console.logs with `import.meta.env.DEV` guard
- **`SkillDetail.tsx`** (5 catches), **`RoleLanding.tsx`** (1), **`useAuth.tsx`** (1), **`BlogPost.tsx`** (1): Replace `.catch(() => {})` with `.catch(e => console.error("[Component]", e))`

### Files to edit (8 total)
| File | Fixes |
|---|---|
| `supabase/functions/send-email/index.ts` | Fix 1 |
| `supabase/functions/refresh-catalog-data/index.ts` | Fix 1 |
| `supabase/functions/manage-api-keys/index.ts` | Fix 2 |
| `supabase/functions/enroll-sequence/index.ts` | Fix 2 |
| `supabase/functions/scan-security/index.ts` | Fix 3 |
| `supabase/functions/regen-blog-covers/index.ts` | Fix 3 |
| `src/lib/api.ts` | Fix 4 |
| `src/pages/SkillDetail.tsx` | Fix 4 |
| `src/components/crear-skill/SkillChat.tsx` | Fix 5 |
| `src/pages/RoleLanding.tsx` | Fix 5 |
| `src/hooks/useAuth.tsx` | Fix 5 |
| `src/pages/BlogPost.tsx` | Fix 5 |

No SQL migrations needed.

