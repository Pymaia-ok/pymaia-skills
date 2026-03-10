UPDATE public.mcp_servers
SET 
  description = 'AI Solutions Architect for Claude Code. 28 tools: search and discover 38,000+ skills, 100+ MCP connectors, and plugins. Use solve_goal to describe any professional goal and get two curated solution options with trust scores, compatibility analysis, and install commands. Includes role-based toolkits (get_role_kit), custom skill generation (generate_custom_skill), trending insights, and Agent-to-Agent protocol (a2a_query).',
  description_es = 'Arquitecto de Soluciones IA para Claude Code. 28 herramientas: busca y descubre 38,000+ skills, 100+ conectores MCP y plugins. Usa solve_goal para describir cualquier objetivo profesional y obtener dos opciones de solución curadas con trust scores, análisis de compatibilidad y comandos de instalación. Incluye toolkits por rol (get_role_kit), generación de skills personalizados (generate_custom_skill), tendencias e insights, y protocolo Agent-to-Agent (a2a_query).',
  updated_at = now()
WHERE slug = 'pymaia-skills';
