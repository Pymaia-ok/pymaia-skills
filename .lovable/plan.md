

## Plan: Arreglar traducción del menú y mover Enterprise al dropdown

### Problemas detectados
1. **"nav.switchLang" sin traducir** — la key `nav.switchLang` no existe en ninguno de los archivos de traducción (`es.ts` / `en.ts`), por eso se muestra el key literal.
2. **Faltan más keys** — `nav.darkMode`, `nav.lightMode`, `nav.mySkills`, `notifications.title` tampoco están definidas.
3. **Enterprise en el header** — debería sacarse del nav principal y moverse al dropdown del usuario logueado.

### Cambios

**`src/i18n/es.ts`** — agregar keys faltantes al bloque `nav`:
- `switchLang: "Cambiar a {{lang}}"`
- `darkMode: "Modo oscuro"`
- `lightMode: "Modo claro"`
- `mySkills: "Mis soluciones"`
- `notifications: "Notificaciones"`

**`src/i18n/en.ts`** — agregar las mismas keys:
- `switchLang: "Switch to {{lang}}"`
- `darkMode: "Dark mode"`
- `lightMode: "Light mode"`
- `mySkills: "My solutions"`
- `notifications: "Notifications"`

**`src/components/Navbar.tsx`**:
- Quitar `{ to: "/enterprise", label: "Enterprise" }` del array `links` (desktop nav) y de `mobileLinks`
- Agregar un `DropdownMenuItem` para Enterprise (con icono `Building2`) en el dropdown del usuario, después de "Mis soluciones"
- Actualizar la referencia de notificaciones para usar `t("nav.notifications")` en vez de `t("notifications.title")`

### Archivos a modificar
- `src/i18n/es.ts`
- `src/i18n/en.ts`
- `src/components/Navbar.tsx`

