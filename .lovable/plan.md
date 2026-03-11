

## Plan: Reorientar la landing hacia empresas/negocios

La landing actual tiene un tono demasiado técnico (terminal con `$ claude`, "Claude Code", jerga dev). El objetivo es reposicionar todo el messaging hacia profesionales de empresa, empleados y negocios, destacando también conectores y plugins como parte central de la propuesta.

### Cambios principales

#### 1. Hero Section — Tono business, no dev
- **Título**: Cambiar de "Trabajá como un experto en minutos" a algo como "Potenciá tu equipo\ncon inteligencia artificial."
- **Subtítulo**: Enfocado en resultados de negocio, no en "instalar skills en agentes"
- **Badge**: "35,000+ herramientas profesionales" (en vez de "skills profesionales")
- **Terminal demo**: Reemplazar la terminal (muy dev) por un **demo visual tipo chat/asistente** que muestre un caso de negocio (ej: "Necesito un análisis competitivo" → resultado en segundos). Sin `$`, sin comandos.
- **CTAs**: "Explorar soluciones" + "Ver cómo funciona" (en vez de "Explorar skills" y "Cómo funciona")
- **Agent strip**: Cambiar copy de "Compatible con Claude, Manus..." a "Funciona con las herramientas de IA más populares"

#### 2. Marquee Section — Roles empresariales + casos de uso
- Reordenar roles priorizando los business: Marketing, Ventas, Legal, Finanzas, RRHH, Consultoría, Operaciones, etc.
- Skills marquee: Cambiar textos a outcomes de negocio ("Automatizar reportes", "Revisar contratos", "Analizar competencia", "Onboarding de empleados")

#### 3. StatsBar — Agregar contexto empresarial
- Agregar un 4to stat: "industrias cubiertas" o "áreas de negocio"
- Cambiar labels: "soluciones" en vez de "skills", "integraciones" en vez de "conectores"

#### 4. Before/After Section — Más roles business
- Ya tiene marketer, abogado, founder — está bien. Mantener pero ajustar copy para que sea menos "indie" y más "empresa"

#### 5. TwoPathsSection — Reframing empresarial
- En vez de "Ya uso Claude Code" vs "Todavía no lo uso", cambiar a:
  - Path 1: "Quiero potenciar mi equipo" → explorar soluciones
  - Path 2: "Quiero crear soluciones para mi empresa" → crear skills privadas

#### 6. ConnectorsSection — Mayor protagonismo
- Mover más arriba en el orden de la landing (antes de Bundles)
- Agregar subtítulo más business: "Conectá Slack, Gmail, Notion, Salesforce y 100+ herramientas que tu equipo ya usa"
- Priorizar conectores empresariales en FEATURED_SLUGS (Slack, Gmail, Notion, Google Sheets, Salesforce, etc.)

#### 7. PluginsSection — Enfoque áreas de empresa
- Ya tiene buen enfoque ("Herramientas para cada área de tu empresa"). Mantener y mover más arriba en el orden.

#### 8. FinalCTA — Tono corporativo
- "Transformá la productividad\nde tu equipo." en vez de "Empezá a trabajar como un experto"
- Subtítulo orientado a ROI y tiempo ahorrado

#### 9. Index.tsx — Reordenar secciones
Nuevo orden optimizado para decisores de negocio:
1. Hero (business)
2. StatsBar (credibilidad)
3. Marquee (amplitud)
4. HowItWorks (claridad)
5. BeforeAfter (deseo)
6. **ConnectorsSection** (integraciones — subir)
7. **PluginsSection** (herramientas — subir)
8. PopularSkills
9. WizardSection
10. BundlesSection
11. TwoPathsSection (reframed)
12. SkillCreatorSection
13. McpBanner
14. FinalCTA + Footer

#### 10. Traducciones (es.ts + en.ts)
- Actualizar todos los strings afectados con tono business/enterprise
- Evitar jerga técnica: "skill" → "solución", "instalar" → "activar", "agente AI" → "asistente de IA", "terminal" → eliminar

### Archivos a modificar
- `src/components/landing/HeroSection.tsx` — rediseño del demo + copy
- `src/components/landing/MarqueeSection.tsx` — roles y skills business
- `src/components/landing/StatsBar.tsx` — 4to stat
- `src/components/landing/TwoPathsSection.tsx` — reframing
- `src/components/landing/FinalCTA.tsx` — copy
- `src/pages/Index.tsx` — reordenar secciones
- `src/i18n/es.ts` — todos los strings landing
- `src/i18n/en.ts` — mirror en inglés

