

## Agregar Polar al catálogo de conectores

### Situación actual
Polar (polar.sh) **no existe** como registro curado en `mcp_servers`. Solo hay un registro no relacionado ("Polaralias/personal-context-mcp").

### Acción
Insertar un registro curado con la información oficial de Polar:

```sql
INSERT INTO mcp_servers (slug, name, description, description_es, category, status, source, is_official, homepage, icon_url, install_command, credentials_needed)
VALUES (
  'polar',
  'Polar',
  'Merchant of Record platform with MCP server for managing products, subscriptions, usage-based billing, and customer portals. Handles international sales taxes and compliance.',
  'Plataforma Merchant of Record con servidor MCP para gestionar productos, suscripciones, facturación por uso y portales de clientes. Maneja impuestos internacionales y compliance.',
  'apis',
  'approved',
  'curated',
  true,
  'https://polar.sh/docs/integrate/mcp',
  'https://polar.sh/assets/brand/polar_og.jpg',
  'npx -y @anthropic-ai/mcp-remote https://api.polar.sh/mcp',
  ARRAY['POLAR_ACCESS_TOKEN']
);
```

Datos clave extraídos de la documentación oficial:
- **Endpoint MCP**: `https://api.polar.sh/mcp` (streamable HTTP)
- **Categoría**: `apis` (pagos/suscripciones)
- **Comando de instalación**: usa `@anthropic-ai/mcp-remote` como wrapper para clientes SSE
- **Credenciales**: requiere `POLAR_ACCESS_TOKEN`

No se requieren cambios en el frontend — el registro aparecerá automáticamente en `/conectores` y en el buscador global.

