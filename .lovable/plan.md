

## Reporte de testing y puntos de mejora de Pymaia Skills

### Estado general
La app funciona correctamente en sus flujos principales: landing, explorar skills, detalle de skill, primeros pasos, términos y privacidad. No hay errores críticos que bloqueen la navegación.

---

### Bugs encontrados

1. **Logo no se muestra en header ni footer** — En el navbar y footer se muestra texto "Pymaia Skills" en vez de la imagen del logo. El código importa `logoImg` y usa `<img>`, pero la imagen aparece como texto plano. Probablemente el archivo `src/assets/logo.png` no se copió correctamente o está corrupto. Hay que verificar y resubir el asset.

2. **Traducción inconsistente en hero (EN)** — La versión en inglés (`en.ts`) todavía dice "No terminal, no code" en `heroSubtitle` (línea 30), pero se pidió sacarlo solo del español. Si se quiere consistencia, habría que actualizarlo también en inglés.

3. **Warnings de React en consola** — Hay errores de `forwardRef` en los componentes `Navbar`, `Footer` y `SkillCard`. Esto ocurre porque `framer-motion` pasa refs a componentes funcionales que no usan `forwardRef`. No es bloqueante pero ensucia la consola.

4. **Categorías duplicadas en Explore** — Aparecen "All" y "AI" como categorías separadas, lo que sugiere que hay datos con categorías duplicadas o inconsistentes.

---

### Puntos de mejora sugeridos

1. **SEO y metadata** — Agregar meta tags dinámicos por página (especialmente en `/skill/:slug`), Open Graph images, y structured data (JSON-LD) para mejor posicionamiento.

2. **Loading states** — No hay skeletons ni spinners visibles mientras cargan los skills. Agregar estados de carga mejoraría la percepción de velocidad.

3. **Paginación en Explore** — Aunque el código soporta paginación, no se ve un control de "cargar más" o paginación en la UI de Explore.

4. **Footer: links legales no traducidos** — Los textos "Términos y Condiciones" y "Política de Privacidad" en el footer están hardcodeados en español. Deberían usar el sistema de i18n.

5. **Perfil de usuario vacío** — Si un usuario se loguea, no hay onboarding para completar perfil (username, bio, etc.).

6. **Mobile: menú hamburguesa** — Funciona pero no tiene animación de apertura/cierre. Una transición suave mejoraría la experiencia.

7. **Accesibilidad** — Falta `aria-label` en varios botones (toggle idioma, menú mobile, sign out). Los botones de iconos deberían tener labels accesibles.

8. **Performance** — La landing hace múltiples queries a la base de datos (`skills-all`, `skills-stats`, `skills-popular-landing`) que podrían consolidarse o cachearse mejor.

---

### Prioridad recomendada
1. Arreglar el logo (bug visual)
2. Arreglar warnings de forwardRef
3. Agregar loading states
4. Internacionalizar textos hardcodeados del footer
5. Mejoras de SEO

