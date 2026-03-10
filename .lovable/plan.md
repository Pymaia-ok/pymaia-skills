

## Revisión completa de Pymaia Skills — Áreas de mejora

Después de revisar las 22 páginas, 36+ edge functions, el MCP server, las tablas de DB, la infraestructura de seguridad, i18n y SEO, aquí está el diagnóstico organizado por prioridad.

---

### Prioridad Alta (Bugs / Inconsistencias)

| # | Problema | Detalle |
|---|----------|---------|
| 1 | **Publicar.tsx renderiza doble Navbar** | Importa y renderiza `<Navbar />` manualmente (línea 96), pero `App.tsx` ya lo incluye globalmente. Resultado: dos navbars superpuestas. |
| 2 | **SecurityAdvisories.tsx renderiza doble Navbar** | Mismo problema: importa `<Navbar />` pero ya está en App.tsx. |
| 3 | **UserProfile.tsx tiene strings hardcodeadas en español** | "Usuario no encontrado" y "← Volver" sin i18n (línea 44-45). |
| 4 | **Privacy.tsx no usa i18n** | Todo el contenido legal está hardcodeado en español sin traducciones. |
| 5 | **Terms.tsx importa `useTranslation` pero no lo usa** | El contenido está hardcodeado en español igual que Privacy. |
| 6 | **Publicar.tsx redirige a `/crear-skill`** en App.tsx, pero el componente Publicar.tsx sigue existiendo como código muerto (nunca se renderiza directamente). |

### Prioridad Media (UX / Completitud)

| # | Área | Mejora |
|---|------|--------|
| 7 | **Password reset** | No hay flujo de "Olvidé mi contraseña" en Auth.tsx. |
| 8 | **Perfil editable** | No hay UI para que el usuario edite su bio, username o avatar desde su propia vista. Solo existe `/u/:username` como vista pública. |
| 9 | **Confirmación al revocar API key** | `revokeKey()` en ApiKeysSection.tsx no pide confirmación antes de eliminar. |
| 10 | **Empty states en Admin** | El panel admin (806 líneas) no tiene estados vacíos para cuando no hay skills pendientes o incidentes. |
| 11 | **Error boundaries** | No hay React error boundaries. Un crash en cualquier componente rompe toda la app. |
| 12 | **Loading state en Index.tsx** | La landing no muestra skeleton/loader mientras carga `skills-all`. |
| 13 | **NotFound no usa el mismo layout** | Usa `bg-muted` en vez de `bg-background`, se ve inconsistente con el resto. |

### Prioridad Media (SEO / Discoverability)

| # | Área | Mejora |
|---|------|--------|
| 14 | **Meta tags dinámicos** | `useSEO` solo setea `document.title`. No hay `<meta name="description">` ni Open Graph tags dinámicos (necesitaría react-helmet o similar, o SSR). |
| 15 | **sitemap.xml estático** | El sitemap es estático. No incluye las 38,000+ skills dinámicamente. |
| 16 | **llms.txt no menciona API keys** | El archivo `llms.txt` y `llms-full.txt` no documentan la autenticación opcional para skills privadas. |

### Prioridad Baja (Calidad de código / DX)

| # | Área | Mejora |
|---|------|--------|
| 17 | **SkillDetail.tsx es muy largo** | 599 líneas en un solo archivo. Podría descomponerse en sub-componentes (reviews section, install section, security panel, etc.). |
| 18 | **Admin.tsx es muy largo** | 806 líneas. Debería dividirse en componentes por tab. |
| 19 | **Tipos duplicados** | `SkillFromDB` se define en `api.ts` pero los tipos de Supabase ya existen en `types.ts`. Hay mapeo manual redundante. |
| 20 | **HeroSection timer leak potencial** | El `useEffect` en `TerminalDemo` usa `visibleLines === 0 ? Date.now() : 0` como dependencia, lo cual es un antipatrón que puede causar re-renders infinitos. |
| 21 | **Explore.tsx usa debounce manual** | Podría usar un hook `useDebounce` reutilizable en vez de `setTimeout` con ref. |

### Funcionalidad faltante (nice-to-have)

| # | Feature |
|---|---------|
| 22 | **Dark mode toggle** — `next-themes` está instalado pero no hay toggle en la UI. |
| 23 | **Notificaciones in-app** — No hay sistema de notificaciones para cuando una skill es aprobada/rechazada. |
| 24 | **Paginación en Conectores/Plugins** — Las listas no tienen paginación, cargan todo de golpe. |
| 25 | **Rate limiting visual feedback** — Cuando el MCP rate limit se alcanza, el usuario no recibe feedback en la UI. |
| 26 | **Accesibilidad (a11y)** — Falta `aria-label` en varios botones icon-only (ej: scroll arrows en Explore, language toggle). |

---

### Resumen ejecutivo

- **6 bugs/inconsistencias** a corregir (doble navbar, strings sin i18n, código muerto)
- **7 mejoras de UX** (password reset, perfil editable, confirmación de acciones destructivas, error boundaries)
- **3 mejoras de SEO** (meta tags, sitemap dinámico, llms.txt actualizado)  
- **5 mejoras de código** (refactoring de archivos largos, tipos, antipatrones)
- **5 features nice-to-have** (dark mode toggle, notificaciones, paginación, a11y)

¿Qué grupo querés que ataque primero?

