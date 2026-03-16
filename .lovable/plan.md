

# Revisión de los 3 puntos de Claude

## 1. GITHUB_TOKEN — Ya existe

El secret `GITHUB_TOKEN` **ya está configurado** en tu proyecto. Aparece en la lista de secrets. Los pipelines de GitHub metadata, stars y SKILL.md ya lo usan con autenticación (5,000 req/hora). No hay acción pendiente aquí.

## 2. Dashboard de pipelines — Ya tenés visibilidad parcial

Tu `/admin` ya tiene la pestaña "Automatización" con estado de crons y progress bars. Pero el dato concreto que Claude pide (contadores exactos de pipelines) no está consolidado en un solo lugar. Números actuales:

- **Embeddings**: 5,118 / 36,812 (13.9%)
- **SKILL.md**: 1,150 fetched
- **GitHub metadata**: 1,606 entries
- **Usage events 24h**: 0

Propongo agregar una sección "Pipeline Health" en la pestaña Overview del admin con estos 4 contadores en tiempo real. Es un cambio pequeño en `AdminOverviewTab.tsx`.

## 3. Scraper de skills.sh — Cambiarlo a diario

El cron `sync-skills-sh-weekly` corre `0 2 * * 0` (solo domingos a las 2 AM UTC). Claude tiene razón: el pipeline tiene dedup, no hay riesgo de duplicados. Lo cambio a `0 2 * * *` (todos los días).

---

## Cambios concretos

1. **SQL (insert tool)**: Actualizar el cron `sync-skills-sh-weekly` de `0 2 * * 0` a `0 2 * * *`
2. **`AdminOverviewTab.tsx`**: Agregar sección "Pipeline Health" con 4 métricas (embeddings, SKILL.md, github_metadata, usage_events 24h)
3. **`Admin.tsx`**: Agregar query para pipeline health data y pasarla al componente

