

## Estado actual — Qué se corrigió y qué queda

### ✅ Ya corregido

| # | Item | Estado |
|---|------|--------|
| 1 | Doble Navbar en Publicar.tsx | ✅ Eliminado |
| 2 | Doble Navbar en SecurityAdvisories.tsx | ✅ Eliminado |
| 3 | UserProfile.tsx strings hardcodeadas | ✅ Usa i18n |
| 4 | Privacy.tsx sin i18n | ✅ Usa i18n |
| 5 | Terms.tsx sin i18n | ✅ Usa i18n |
| 6 | NotFound bg inconsistente | ✅ Usa `bg-background` |
| 9 | Confirmación al revocar API key | ✅ Dialog con `confirmRevokeId` |
| 14 | useSEO sin meta tags | ✅ Ya maneja description, OG, JSON-LD |
| 16 | llms.txt sin API keys | ✅ Actualizado |

### ❌ Pendiente — ordenado por impacto

#### Prioridad Alta

| # | Item | Esfuerzo |
|---|------|----------|
| 7 | **Password reset en Auth.tsx** — No hay "Olvidé mi contraseña". Fácil: agregar modo `"forgot"` que llame `supabase.auth.resetPasswordForEmail()`. | Bajo |
| 11 | **Error boundary global** — Un crash en cualquier componente rompe toda la app. Crear un `ErrorBoundary` class component y wrappear en App.tsx. | Bajo |
| 6 | **Publicar.tsx es código muerto** — App.tsx redirige `/publicar` → `/crear-skill`, el componente nunca se renderiza. Se puede eliminar. | Bajo |

#### Prioridad Media

| # | Item | Esfuerzo |
|---|------|----------|
| 20 | **HeroSection timer leak** — `useEffect` depende de `visibleLines === 0 ? Date.now() : 0`, lo cual es un antipatrón que recrea timers en cada render cuando `visibleLines === 0`. Solución: usar un ref para controlar el loop. | Bajo |
| 26 | **Accesibilidad (a11y)** — Faltan `aria-label` en botones icon-only en landing, Explore (scroll arrows), y Navbar (lang toggle ya tiene). | Bajo |
| 8 | **Perfil editable** — No hay UI para editar bio/username/avatar. Requiere crear un `/settings` o modal en `/mis-skills`. | Medio |
| 10 | **Empty states en Admin** — Panel admin sin estados vacíos para tabs sin datos. | Bajo |

#### Prioridad Baja (Calidad / DX)

| # | Item | Esfuerzo |
|---|------|----------|
| 17 | **SkillDetail.tsx (599 líneas)** — Refactorizar en sub-componentes. | Medio |
| 18 | **Admin.tsx (806 líneas)** — Dividir en componentes por tab. | Medio |
| 21 | **Debounce manual en Explore.tsx** — Extraer a hook `useDebounce`. | Bajo |
| 15 | **sitemap.xml estático** — No incluye skills dinámicas. Necesitaría edge function que genere el sitemap. | Medio |

#### Nice-to-have

| # | Item |
|---|------|
| 22 | Dark mode toggle (next-themes instalado, sin UI) |
| 23 | Notificaciones in-app (skill aprobada/rechazada) |
| 24 | Paginación en Conectores/Plugins |

### Recomendación

Atacar primero los 3 items de prioridad alta:
1. **Agregar flujo "Olvidé mi contraseña"** en Auth.tsx — un modo `"forgot"` con input email + botón + llamada a `resetPasswordForEmail()`
2. **Crear ErrorBoundary global** — class component con fallback UI, wrappear las Routes en App.tsx
3. **Eliminar Publicar.tsx** — código muerto que nunca se renderiza

Luego los 4 de prioridad media (timer fix, a11y, empty states, perfil editable).

