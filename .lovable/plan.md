

# Plan: Comunicar diferenciales en la Landing Page

El PRD propone 8 cambios. Analicé cada uno contra el estado actual del código. Mi recomendación: **implementar 5 de los 8** — los que tienen mayor impacto con menor riesgo de sobrecargar la landing.

---

## Cambios que SÍ vale la pena hacer

### 1. Actualizar Hero badge y subtítulo (Cambio 1 + 8)
El badge dice "35,000+ professional solutions" pero la DB tiene 36,812 skills + 6,360 connectors + 480 plugins = **43,652 tools**. Está subvaluando el catálogo y no comunica que son 3 tipos unificados.

- Cambiar `heroBadge` a usar el total dinámico sumando las 3 queries que ya hace StatsBar, o hardcodear "43,000+" con mención de "Skills, MCPs & Plugins"
- Actualizar `heroSubtitle` para mencionar catálogo unificado y seguridad

**Archivos**: `src/i18n/en.ts`, `src/i18n/es.ts`, posiblemente `HeroSection.tsx` si se hace dinámico

### 2. Agregar sección "Why Pymaia" (Cambio 2)
Es el cambio de mayor impacto. Actualmente no hay ningún lugar que explique por qué Pymaia vs la competencia. 3 columnas: catálogo unificado, goal solver, security-first.

- Nuevo componente `WhyPymaiaSection.tsx`
- Insertar en `Index.tsx` después de StatsBar, antes de MarqueeSection
- Strings en ambos idiomas

**Archivos**: nuevo `src/components/landing/WhyPymaiaSection.tsx`, `src/pages/Index.tsx`, `src/i18n/en.ts`, `src/i18n/es.ts`

### 3. Actualizar StatsBar (Cambio 3)
Reemplazar "15 áreas de negocio" (hardcodeado) por un stat de seguridad o bundles. El PRD sugiere "Security-scanned — Every tool verified".

- Cambiar el 4to stat de `{ value: 15, label: "industries" }` a un conteo dinámico de bundles activos, o un indicador de seguridad
- Opción: agregar 5to stat

**Archivos**: `src/components/landing/StatsBar.tsx`, `src/i18n/en.ts`, `src/i18n/es.ts`

### 4. Actualizar copy de "How It Works" (Cambio 4)
El copy actual es genérico ("Pick a solution" → "Activate" → "You're productive"). El nuevo copy comunica los diferenciales: goal-solving en paso 1, seguridad en paso 2.

- Actualizar strings y iconos (Search → Target, Copy → ShieldCheck)
- No cambia la estructura del componente

**Archivos**: `src/i18n/en.ts`, `src/i18n/es.ts`, `src/components/landing/HowItWorks.tsx` (iconos)

### 5. TrustBadge en SkillCards (Cambio 5)
**Ya está implementado.** El `SkillCard.tsx` ya usa `<TrustBadgeCompact>` en línea 40. No hay nada que hacer.

---

## Cambios que NO recomiendo (por ahora)

### Cambio 6 — Banner AI Solutions Architect
Ya existe `WizardSection` que hace exactamente esto. Agregar otro banner sería redundante y alargaría la landing innecesariamente.

### Cambio 7 — Before/After nuevo escenario
Agregar un 4to escenario rompería el grid de 3 columnas (`md:grid-cols-3`). No justifica el cambio de layout.

---

## Resumen de implementación

| # | Cambio | Esfuerzo |
|---|---|---|
| 1+8 | Hero badge + subtítulo dinámico | Bajo — copy i18n + posible query |
| 2 | Nueva sección "Why Pymaia" | Medio — nuevo componente |
| 3 | StatsBar actualizado | Bajo — 1 stat |
| 4 | How It Works nuevo copy | Bajo — copy i18n + iconos |
| 5 | TrustBadge en cards | Ya hecho |

Total: ~4 archivos editados, 1 nuevo componente. Impacto alto en comunicar diferenciales sin sobrecargar la landing.

