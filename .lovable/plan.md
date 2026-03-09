

## Buscador Global en el Navbar

### Enfoque
Usar `CommandDialog` (cmdk) como un buscador global estilo Spotlight/⌘K que busca en paralelo en las 3 tablas: skills, conectores (mcp_servers) y plugins.

### Componente nuevo: `src/components/GlobalSearch.tsx`
- Botón en el navbar con icono Search + shortcut hint "⌘K"
- Al hacer click o presionar ⌘K / Ctrl+K, abre un `CommandDialog` (ya existe el componente cmdk en el proyecto)
- Input con debounce de 300ms
- Busca en paralelo en 3 tablas usando Supabase:
  - `skills` → filtra `status = approved`, busca en `display_name`, `display_name_es`, `tagline`, `tagline_es` con `ilike`
  - `mcp_servers` → filtra `status = approved`, busca en `name`, `description`, `description_es`
  - `plugins` → filtra `status = approved`, busca en `name`, `name_es`, `description`, `description_es`
- Resultados agrupados en 3 secciones: Skills, Conectores, Plugins (max 5 por grupo)
- Al seleccionar un resultado, navega a `/skill/:slug`, `/conector/:slug`, o `/plugin/:slug`
- Estado vacío muestra sugerencias rápidas (categorías populares)
- Loading state con skeleton

### Cambios en `src/components/Navbar.tsx`
- Importar `GlobalSearch`
- En desktop (Zone 3): agregar botón de búsqueda antes del language toggle
- En mobile: agregar botón de búsqueda al lado del hamburger menu
- El botón muestra icono Search + "⌘K" en desktop, solo icono en mobile

### UX
- Keyboard shortcut ⌘K (Mac) / Ctrl+K (Windows) abre el dialog desde cualquier página
- Los resultados muestran: icono de tipo (Zap para skills, Plug para conectores, Package para plugins), nombre, tagline truncado, y categoría como badge
- ESC cierra el dialog
- Click fuera cierra el dialog

### i18n
- Agregar keys en `src/i18n/es.ts` y `src/i18n/en.ts`: `search.placeholder`, `search.skills`, `search.connectors`, `search.plugins`, `search.noResults`, `search.hint`

