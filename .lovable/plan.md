## Plan: Mejoras Best-in-Class del PRD — Estado: ✅ 100% Completado

### Bloque 1: MCP Tools (P0) ✅
- `update_skill` — actualizar skill existente con changelog
- `unpublish_skill` — remover skill del directorio (soft delete)
- `report_goal_outcome` — feedback post-implementación
- `rate_skill` — rating desde el agente
- `get_personalized_feed` — feed basado en historial de instalaciones
- `get_top_creators` — leaderboard de creadores

### Bloque 2: Quality Score compuesto (P1) ✅
- Cálculo en `calculate-trust-score`: Trust(25%) + Evals(25%) + Satisfaction(20%) + Docs(15%) + Freshness(15%)
- UI: Quality Score badge en `SkillCard.tsx` y `SkillSidebar.tsx`

### Bloque 3: Decay Detection (P1) ✅
- Lógica en `quality-maintenance/index.ts` — flag `is_stale` para >90 días sin commit
- UI: Warning "Not updated in over 90 days" en `TrustBadge.tsx`

### Bloque 4: Verified Publisher badge (P1) ✅
- Campo `is_verified_publisher` en `profiles`
- Badge ✅ en `SkillSidebar.tsx` y `CreatorLeaderboard.tsx`

### Bloque 5: Duplicate Detection (P0) ✅
- Similarity check en `import_skill_from_agent` — busca nombres/slugs similares antes de insertar

### Bloque 6: Conversational Goal Refinement (P2) ✅
- `solve_goal` retorna `needs_clarification` si el goal tiene <3 palabras

### Bloque 7: Creator Leaderboard (P1) ✅
- Componente `CreatorLeaderboard.tsx` en landing
- MCP tool `get_top_creators`

### Bloque 8: Weekly Digest (P1) ✅
- Edge function `weekly-digest` — recopila nuevos skills, connectors, trending goals
- Registrado en `supabase/config.toml`

### MCP Server v8.6.0 — 43 tools totales
Nuevos tools agregados: `update_skill`, `unpublish_skill`, `report_goal_outcome`, `rate_skill`, `get_personalized_feed`, `get_top_creators`
