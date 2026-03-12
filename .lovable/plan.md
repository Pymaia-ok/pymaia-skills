

# Plan: Implementar mejoras Best-in-Class del PRD

## Estado actual vs PRD

Basado en el analisis exhaustivo del PRD y el codebase actual, estas son las mejoras implementables ahora (sin infraestructura externa como Stripe, SSO, o sandboxes):

---

## Bloque 1: MCP Tools faltantes (P0)

### 1.1 `update_skill` — Actualizar skill existente
- Nuevo tool en `mcp-server/index.ts`
- Requiere auth (API key). Acepta `skill_slug`, `skill_md`, `changelog`
- Verifica que el `creator_id` coincida con el usuario autenticado
- Parsea el nuevo SKILL.md via `generate-skill`, actualiza el registro en DB
- Guarda el changelog en un campo `changelog` (nueva columna en `skills`)

### 1.2 `unpublish_skill` — Remover skill del directorio
- Nuevo tool en `mcp-server/index.ts`
- Requiere auth. Acepta `skill_slug`, `reason`
- Cambia status a `rejected` (soft delete). Solo el creator puede despublicar
- Retorna cuantas instalaciones activas habia

### 1.3 `report_goal_outcome` — Feedback post-implementacion
- Nuevo tool en `mcp-server/index.ts`
- Acepta `goal`, `outcome` (success/partial/failed), `feedback`, `time_spent`, `would_recommend`
- Inserta en `recommendation_feedback` con campo extendido
- Alimenta el recommendation engine

### 1.4 `rate_skill` — Rating desde el agente
- Nuevo tool en `mcp-server/index.ts`
- Requiere auth. Acepta `skill_slug`, `rating` (1-5), `comment`
- Inserta en tabla `reviews`. Trigger existente actualiza `avg_rating`

### 1.5 `get_personalized_feed` — Feed personalizado
- Nuevo tool basado en historial de instalaciones del usuario
- Busca skills populares en las categorias preferidas del usuario
- Excluye skills ya instaladas

**DB migration**: Agregar columna `changelog` (text, nullable) a tabla `skills`

---

## Bloque 2: Quality Score compuesto (P1)

### 2.1 Calculo del Quality Score
- Modificar `calculate-trust-score/index.ts` para calcular un `quality_score` compuesto:
  - Trust Score (25%)
  - Eval Pass Rate (25%) — de `skill_eval_runs`
  - User Satisfaction (20%) — `avg_rating` normalizado
  - Documentation (15%) — tiene description, use_cases, github_url
  - Freshness (15%) — `last_commit_at` reciente
- Almacenar en columna existente `quality_score` de la tabla `skills`

### 2.2 UI: Mostrar Quality Score en listings
- Agregar Quality Score badge en `SkillSidebar.tsx` y `SkillCard.tsx`
- Formato visual con barra o badge: "Quality: 78/100"

**DB migration**: Ninguna (columna `quality_score` ya existe)

---

## Bloque 3: Decay Detection (P1)

### 3.1 Cron `detect-stale-skills`
- Nueva logica dentro de `quality-maintenance/index.ts`
- Skills con `last_commit_at` > 90 dias reciben flag visual
- Agregar columna `is_stale` (boolean, default false) a `skills`
- El cron actualiza `is_stale = true` para skills sin actividad

### 3.2 UI: Badge "Potentially Stale"
- En `TrustBadge.tsx`, mostrar warning si `is_stale = true`
- Texto: "No actualizado en mas de 90 dias"

**DB migration**: Agregar `is_stale boolean default false` a `skills`, `mcp_servers`, `plugins`

---

## Bloque 4: Verified Publisher badge (P1)

### 4.1 Logica de verificacion
- Un publisher es "verificado" si tiene `creator_id` con perfil completo (username, avatar, bio no nulos)
- Agregar `is_verified_publisher boolean default false` a `profiles`
- El admin puede marcar publishers como verificados

### 4.2 UI: Badge en listings y detail
- En `SkillSidebar.tsx` y cards: "✅ Verified Publisher"
- En `TrustBadge.tsx`: ocultar warning "Unverified publisher" si es verificado

**DB migration**: Agregar `is_verified_publisher boolean default false` a `profiles`

---

## Bloque 5: Duplicate Detection en publish (P0)

### 5.1 Similarity check en `import_skill_from_agent`
- Antes de insertar, buscar skills con nombre similar (trigram similarity > 0.6)
- Si encuentra duplicados, retornar warning con los slugs similares
- No bloquear, pero advertir al usuario

---

## Bloque 6: Mejoras al AI Solutions Architect (P2)

### 6.1 Conversational Goal Refinement en `solve_goal`
- Si el goal es muy corto (< 4 palabras) o ambiguo (confidence < 0.3), retornar preguntas de clarificacion en vez de resultados
- Formato: `{ status: "needs_clarification", questions: [...] }`
- El agente puede re-llamar con el goal refinado

### 6.2 `report_goal_outcome` (ya cubierto en Bloque 1)

---

## Bloque 7: Leaderboard de Creadores (P1)

### 7.1 UI: Seccion "Top Creators" en landing
- Nuevo componente `CreatorLeaderboard.tsx`
- Query: profiles con mas skills aprobados + mayor avg_rating combinado
- Mostrar top 10 creadores con avatar, nombre, cantidad de skills, avg rating

### 7.2 MCP Tool: `get_top_creators`
- Nuevo tool que retorna los top creators con sus stats

---

## Bloque 8: Weekly Digest email (P1)

### 8.1 Edge function `weekly-digest`
- Cron semanal (lunes 10 AM UTC)
- Recopila: top 5 skills nuevos, trending goals, catalog growth
- Envia a todos los leads/usuarios con email via `send-email`
- Usa secuencia existente de email

### 8.2 Registrar secuencia en `email_sequences`
- Insertar secuencia "weekly-digest" con un solo paso

**DB migration**: Ninguna

---

## Resumen de cambios

```text
Archivos a modificar:
├── supabase/functions/mcp-server/index.ts  (5 nuevos tools)
├── supabase/functions/calculate-trust-score/index.ts (quality score)
├── supabase/functions/quality-maintenance/index.ts (decay detection)
├── supabase/functions/weekly-digest/index.ts (NUEVO)
├── src/components/TrustBadge.tsx (stale badge, verified publisher)
├── src/components/skill-detail/SkillSidebar.tsx (quality score)
├── src/components/SkillCard.tsx (quality badge)
├── src/components/landing/CreatorLeaderboard.tsx (NUEVO)
├── src/pages/Index.tsx (agregar leaderboard section)
├── src/pages/Admin.tsx (nuevo cron en lista)
└── supabase/config.toml (registrar weekly-digest)

Migraciones DB:
1. ALTER TABLE skills ADD COLUMN changelog text;
2. ALTER TABLE skills ADD COLUMN is_stale boolean DEFAULT false;
3. ALTER TABLE mcp_servers ADD COLUMN is_stale boolean DEFAULT false;
4. ALTER TABLE plugins ADD COLUMN is_stale boolean DEFAULT false;
5. ALTER TABLE profiles ADD COLUMN is_verified_publisher boolean DEFAULT false;
```

## Orden de implementacion sugerido

1. **Sprint 1**: Bloque 1 (MCP tools) + Bloque 5 (duplicate detection) — Funcionalidad core de publish
2. **Sprint 2**: Bloque 2 (Quality Score) + Bloque 3 (Decay) + Bloque 4 (Verified Publisher) — Quality layer
3. **Sprint 3**: Bloque 6 (Conversational refinement) + Bloque 7 (Leaderboard) + Bloque 8 (Weekly Digest) — Engagement

