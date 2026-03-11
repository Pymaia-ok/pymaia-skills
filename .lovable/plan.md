

## Plan: User Menu Dropdown (best practice)

El patrón de mercado (GitHub, Linear, Notion, Vercel) es claro: cuando el usuario está logueado, el header solo muestra el **avatar** como trigger de un **DropdownMenu** que agrupa todas las opciones personales. Esto limpia el header significativamente.

### Estado actual del header (logueado)
```text
[Logo] [Explorar] [Conectores] [Plugins] [Enterprise] [🔍] | [🌙] [EN] [🔔] | [+ Crear] | [Avatar Name] [⎋]
```

### Estado propuesto
```text
[Logo] [Explorar] [Conectores] [Plugins] [Enterprise] [🔍] | [+ Crear] [Avatar ▾]
```

Al hacer click en el avatar se abre un `DropdownMenu` con:

```text
┌─────────────────────────┐
│  Juan García             │
│  juan@empresa.com        │
├─────────────────────────┤
│  📦 Mis soluciones       │
│  🏢 Enterprise           │  ← opcional, ya está en nav
├─────────────────────────┤
│  🔔 Notificaciones (2)   │
│  🌙 Tema oscuro    [◉]   │  ← switch inline
│  🌐 Idioma: ES → EN      │
├─────────────────────────┤
│  ⎋  Cerrar sesión        │
└─────────────────────────┘
```

### Cambios

**`src/components/Navbar.tsx`**
- Sacar del header directo: `ThemeToggle`, botón idioma, `NotificationBell`, link a "Mis Skills", botón logout
- Reemplazar por un solo `<DropdownMenu>` trigger (avatar) que abre el menú
- Usar componentes de `src/components/ui/dropdown-menu.tsx` (ya existe)
- El toggle de tema se hace inline con un `Switch` dentro de un `DropdownMenuItem`
- Notificaciones muestra badge de conteo; al clickear navega o abre popover
- Mobile: el menú hamburguesa ya agrupa todo, solo hay que mover las mismas opciones ahí

**`src/components/Navbar.tsx`** — zona de acciones desktop simplificada:
- Solo queda: `GlobalSearch` | `+ Crear solución` | `Avatar dropdown`
- Si no está logueado: `GlobalSearch` | `Iniciar sesión`

**Sin nuevos archivos** — todo se resuelve con componentes existentes (`DropdownMenu`, `Switch`, `Avatar`).

### Archivos a modificar
- `src/components/Navbar.tsx` — reestructurar zona 3 con DropdownMenu

