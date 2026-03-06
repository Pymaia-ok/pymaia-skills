

## Plan: Agregar conector de Canva al catálogo

### Objetivo
Insertar manualmente el conector de Canva en la tabla `mcp_servers` con los datos correctos y un ícono de alta calidad, y agregarlo a los conectores destacados de la landing.

### Pasos

1. **Insertar registro de Canva en `mcp_servers`**
   - Nombre: "Canva"
   - Slug: "canva"
   - Descripción en inglés y español
   - Categoría: "design"
   - Homepage: `https://www.canva.com`
   - Docs URL: `https://www.canva.dev/blog/developers/canva-dev-mcp-server/`
   - Icon URL: `https://cdn.simpleicons.org/canva`
   - Source: "canva.dev" (oficial)
   - Install command basado en el MCP oficial

2. **Agregar Canva a `FEATURED_SLUGS` en la landing**
   - Actualizar `src/components/landing/ConnectorsSection.tsx` para incluir `"canva"` en el array de slugs destacados (reemplazando uno menos conocido como `tacticlaunch-mcp-linear`).

### Resultado
Canva aparecerá en el catálogo de conectores (`/conectores`) y como conector destacado en la landing page con su ícono oficial.

