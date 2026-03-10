

## Plan: Agregar sección "Skill Creator" en la Landing

### Problema
La landing no menciona que los usuarios pueden **crear sus propias skills** y compartirlas pública o privadamente. Esta es una funcionalidad core (SkillForge en `/crear-skill`) que no tiene visibilidad en la página principal.

### Solución
Crear una nueva sección `SkillCreatorSection` que se ubique entre **TwoPathsSection** y **BundlesSection** (posición 10 en el flujo). Visualmente será un bloque destacado que muestre:

1. **Headline**: "Creá tus propias skills" / "Build your own skills"
2. **3 feature cards** en fila:
   - **Entrevista conversacional**: El AI te guía paso a paso para empaquetar tu expertise
   - **Publicá o compartí en privado**: Elegí si tu skill es pública para todos o privada con link secreto
   - **Playground integrado**: Probá tu skill antes de publicarla con tests automáticos
3. **CTA principal** → `/crear-skill` ("Crear mi primera skill")
4. **Mini mockup visual**: Terminal/chat simplificado mostrando 2-3 líneas de la entrevista AI (similar al hero terminal pero más compacto)

### Archivos a modificar/crear

| Archivo | Cambio |
|---------|--------|
| `src/components/landing/SkillCreatorSection.tsx` | **Nuevo** — Componente con 3 feature cards + CTA + mini mockup |
| `src/pages/Index.tsx` | Importar y colocar entre TwoPathsSection y BundlesSection |
| `src/i18n/es.ts` | Agregar ~8 keys bajo `landing.creator*` |
| `src/i18n/en.ts` | Agregar traducciones en inglés correspondientes |

### Diseño visual
- Fondo alternado (bg-secondary/30) para mantener el ritmo visual de la landing
- Animaciones framer-motion consistentes con las demás secciones (fade-in + staggered cards)
- Iconos: `MessageSquare` (entrevista), `Lock`/`Globe` (visibilidad), `Play` (playground)
- Estilo Apple-clean consistente con el resto de la landing

