

## Plan: Landing page completa y explicativa

### Problema actual
La landing es solo el flujo de onboarding (Rol > Tarea > Resultados). No explica qué es SkillHub, no tiene social proof, no tiene secciones informativas, y no diferencia entre usuarios nuevos (no usan Claude Code) y usuarios existentes.

### Nueva estructura de la landing (scroll vertical, secciones apiladas)

La página pasa de ser un wizard interactivo a una **landing completa con scroll**, manteniendo el wizard como una sección más.

```text
┌─────────────────────────────────────┐
│  HERO                               │
│  Título grande + subtítulo          │
│  2 CTAs: "Explorar skills" /        │
│          "¿Qué es Claude Code?"     │
├─────────────────────────────────────┤
│  HOW IT WORKS (3 pasos visuales)    │
│  1. Elegí una skill                 │
│  2. Copiá un comando                │
│  3. Claude lo sabe hacer            │
├─────────────────────────────────────┤
│  SOCIAL PROOF (stats en vivo)       │
│  X skills · Y instalaciones ·      │
│  Z categorías                       │
├─────────────────────────────────────┤
│  DOS CAMINOS (tabs o cards)         │
│  "Ya uso Claude Code" → Explorar    │
│  "No sé qué es" → Primeros pasos   │
├─────────────────────────────────────┤
│  WIZARD INTERACTIVO (existente)     │
│  "Encontrá la skill ideal"         │
│  Rol > Tarea > Resultados          │
├─────────────────────────────────────┤
│  SKILLS POPULARES (top 6)           │
│  Grid de SkillCards con las más     │
│  instaladas                         │
├─────────────────────────────────────┤
│  TESTIMONIALS / USE CASES           │
│  Antes vs Después por profesión     │
│  (3 cards con datos concretos)      │
├─────────────────────────────────────┤
│  CTA FINAL                          │
│  "Empezá ahora" + link a explorar  │
│  y primeros pasos                   │
├─────────────────────────────────────┤
│  FOOTER (links, etc.)               │
└─────────────────────────────────────┘
```

### Cambios técnicos

1. **Reescribir `src/pages/Index.tsx`** de wizard-only a landing completa con todas las secciones. El wizard se embebe como una sección más con su AnimatePresence interno.

2. **Crear componentes de sección** en `src/components/landing/`:
   - `HeroSection.tsx` — título, subtítulo, 2 CTAs diferenciados
   - `HowItWorks.tsx` — 3 pasos con iconos/ilustraciones numeradas
   - `StatsBar.tsx` — query a DB para contar skills, instalaciones totales
   - `TwoPathsSection.tsx` — cards para usuarios nuevos vs existentes
   - `PopularSkills.tsx` — top 6 skills por instalaciones
   - `BeforeAfterSection.tsx` — 3 ejemplos de transformación por profesión
   - `FinalCTA.tsx` — call to action de cierre
   - `Footer.tsx` — links a explorar, primeros pasos, MCP, teams

3. **Agregar traducciones** en `src/i18n/es.ts` y `src/i18n/en.ts` para todo el contenido nuevo de las secciones.

4. **Animaciones**: Cada sección usa `motion.div` con `whileInView` para animar al hacer scroll (fade-in + slide-up).

5. **Stats en vivo**: Query simple con `supabase.from("skills").select("id, install_count")` para calcular totales.

### Dos tipos de usuario

La sección "Dos caminos" presenta:
- **"Ya uso Claude Code"** → CTA directo a `/explorar` o al wizard más abajo
- **"Todavía no lo uso"** → CTA a `/primeros-pasos` con explicación breve de que es gratis y toma 5 minutos

### Sin cambios de backend
Todo es frontend. Los datos de stats vienen de la query existente de skills.

