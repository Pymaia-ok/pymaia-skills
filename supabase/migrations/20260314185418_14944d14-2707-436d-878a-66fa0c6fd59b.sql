
-- Update existing Canva connector with official data
UPDATE public.mcp_servers SET
  name = 'Canva',
  description = 'Official Canva AI Connector — create designs, autofill templates, find existing designs, and export as PDF or images. Uses remote MCP transport via https://mcp.canva.com/mcp. Requires a Canva account (any plan). Some features like autofill require Canva Pro or Enterprise.',
  description_es = 'Conector oficial de Canva con IA — crea diseños, autorellena plantillas, busca diseños existentes y exporta como PDF o imágenes. Usa transporte MCP remoto vía https://mcp.canva.com/mcp. Requiere cuenta de Canva (cualquier plan). Algunas funciones como autorelleno requieren Canva Pro o Enterprise.',
  install_command = 'npx -y mcp-remote@latest https://mcp.canva.com/mcp',
  homepage = 'https://www.canva.dev/docs/connect/canva-mcp-server-setup/',
  category = 'design',
  is_official = true,
  source = 'curated',
  updated_at = now()
WHERE slug = 'canva';

-- Also add the Canva Dev MCP (for app developers)
INSERT INTO public.mcp_servers (slug, name, description, description_es, install_command, homepage, category, status, source, is_official, credentials_needed, install_count, external_use_count)
VALUES (
  'canva-dev',
  'Canva Dev',
  'Official Canva Dev MCP server for AI-assisted Canva app and integration development. Provides tools and documentation for building Canva apps. Separate from the Canva AI Connector for design workflows.',
  'Servidor MCP oficial de desarrollo de Canva para asistencia IA en el desarrollo de apps e integraciones de Canva. Proporciona herramientas y documentación para construir apps de Canva. Separado del Conector IA de Canva para flujos de diseño.',
  'npx -y @canva/cli@latest mcp',
  'https://www.canva.dev/docs/apps/mcp-server/',
  'development',
  'approved',
  'curated',
  true,
  '{}',
  0,
  0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  description_es = EXCLUDED.description_es,
  install_command = EXCLUDED.install_command,
  homepage = EXCLUDED.homepage,
  category = EXCLUDED.category,
  is_official = EXCLUDED.is_official,
  source = EXCLUDED.source,
  updated_at = now();
