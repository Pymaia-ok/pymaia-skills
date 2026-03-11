

## Textos de la landing que siguen muy enfocados en "empresas/equipos"

Revisé todos los textos de la landing en español e inglés. Hay bastantes secciones que hablan de "tu empresa", "tu equipo", "empresas como la tuya", etc., cuando el tono que elegiste para el hero es más personal ("tu trabajo", "tu productividad"). Acá va el listado de lo que habría que ajustar para mantener consistencia:

### Secciones a actualizar (ES / EN)

| Sección | Texto actual (ES) | Propuesta (ES) |
|---|---|---|
| **Marquee** título | "Soluciones para cada área de tu empresa" | "Soluciones para cada área de tu trabajo" |
| **Marquee** subtítulo | "...cada desafío de tu negocio" | "...cada desafío profesional" |
| **How it works** paso 1 desc | "...el desafío de tu equipo" | "...tu desafío" |
| **How it works** paso 3 título | "Tu equipo es más productivo" | "Sos más productivo" |
| **Two Paths** subtítulo | "...cada necesidad de tu empresa" | "...cada necesidad" |
| **Two Paths** expert título | "Quiero potenciar mi equipo" | "Quiero ser más productivo" |
| **Two Paths** expert desc | "...probadas por miles de empresas..." | "...probadas por miles de profesionales..." |
| **Two Paths** new desc | "...el conocimiento de tu empresa..." | "...tu conocimiento experto..." |
| **Creator** título | "Creá soluciones para tu empresa" | "Creá tus propias soluciones" |
| **Creator** subtítulo | "...el conocimiento de tu equipo..." | "...tu conocimiento experto..." |
| **Creator** feat1 desc | "...el expertise de tu equipo..." | "...tu expertise..." |
| **Creator** feat2 desc | "...miembros de tu empresa" | "...quienes vos elijas" |
| **Popular** subtítulo | "Las que más usan las empresas como la tuya" | "Las más activadas por profesionales como vos" |
| **Connectors** título | "...que tu equipo ya usa" | "...que ya usás" |
| **Connectors** subtítulo | "...herramientas empresariales..." | "...herramientas profesionales..." |
| **Plugins** título | "...cada área de tu empresa" | "...cada área de tu trabajo" |
| **Before/After** título | "El impacto en tu empresa" | "El impacto en tu productividad" |
| **Before/After** subtítulo | "...productividad de los equipos" | "...la productividad profesional" |
| **MCP** subtítulo | "...qué necesita tu empresa..." | "...qué necesitás..." |
| **Wizard** subtítulo | "...qué necesita tu equipo..." | "...qué necesitás..." |
| **Final CTA** título | "Transformá la productividad de tu equipo" | "Transformá tu productividad" |

Se aplicarán los mismos cambios equivalentes en inglés (reemplazando "your team/company/business" por "you/your work/your productivity").

### Archivos a modificar

- `src/i18n/es.ts` — ~20 keys del namespace `landing`
- `src/i18n/en.ts` — ~20 keys equivalentes

No se tocan componentes, solo traducciones.

