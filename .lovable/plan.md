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

### Bloque 9: Sprint 2 — PRD Best-in-Class v9.1.0 ✅

#### 9.1 `publish_skill` MCP Tool (P0) ✅
- Full publish flow: visibility (public/unlisted/private), pricing (free/paid/freemium), auto security scan
- Auto-approve si trust_score >= 70, pending_review si 40-69, rejected si < 40
- Duplicate detection, changelog, version 1.0.0 automático

#### 9.2 `report_skill` MCP Tool (P1) ✅
- Reportar skill malicioso/broken/policy_violation desde el agente
- Inserta en `security_reports` para revisión manual

#### 9.3 Semantic Versioning en `update_skill` ✅
- Bumps major/minor/patch con changelog acumulativo

#### 9.4 `get_skill_analytics` MCP Tool (P1) ✅
- Métricas de instalaciones, ratings, eval results
- Creator Tiers: Starter / Builder / Expert

#### 9.5 `install_bundle` MCP Tool (P1) ✅
- Obtener install commands de todos los skills en un bundle

#### 9.6 `scan_skill` MCP Tool (P0) ✅
- Auditoría de seguridad pre-publicación sin publicar

#### 9.7 `run_skill_evals` MCP Tool (P1) ✅
- Ejecutar 5 test cases automatizados contra SKILL.md

#### 9.8 Eval-Verified Badge ✅
- Badge en `SkillCard.tsx` y `SkillSidebar.tsx` para skills con 100% pass rate

#### 9.9 Rising Stars ✅
- Componente `RisingStars.tsx` en Explore — skills nuevos (<30 días) con tracción rápida

#### 9.10 Version + Changelog en SkillDetail ✅
- Badge de versión y desplegable de changelog en la página de detalle

#### 9.11 Enhanced Goal Templates ✅
- `recommended_skills`, `difficulty`, `estimated_time_minutes` en `goal_templates`

#### 9.12 Structured Clarification en `solve_goal` ✅
- Opciones tipificadas (dominio, nivel, presupuesto) para refinamiento

#### 9.13 Visibility Control en `import_skill_from_agent` ✅
- Parámetro `is_public` para skills privados

#### 9.14 Security Dashboard ✅
- Métricas de advisories, críticos, resueltos en `/security-advisories`

### MCP Server v9.1.0 — 48 tools totales
Nuevos tools: `publish_skill`, `report_skill`, `get_skill_analytics`, `install_bundle`, `scan_skill`, `run_skill_evals`

### Pendiente (requiere infra externa):
- Stripe Connect para monetización (P2)
- Behavioral Sandbox (P2)
- SSO / Enterprise Policy Engine (P2)
- Compatibility CI multi-agente (P2)
