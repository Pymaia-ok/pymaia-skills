

## Plan: Agregar skills faltantes y conector GoDaddy MCP

### Hallazgos

**GoDaddy MCP**: Sí existe oficialmente en `developer.godaddy.com/mcp`. Permite buscar dominios y verificar disponibilidad desde Claude/ChatGPT. No lo tenemos en nuestra tabla `mcp_servers`.

**Skills faltantes**: De las 3 fuentes analizadas, ya tenemos la gran mayoría (56 de ~70). Faltan ~14 skills relevantes:

```text
Skill faltante               Fuente              GitHub URL
───────────────────────────────────────────────────────────
mcp-builder                  WebReactiva+Composio anthropics/skills
imagen                       Composio            sanjay3290/ai-skills
notebooklm-integration       Composio            PleasePrompto/notebooklm-skill
google-workspace-skills      Composio            sanjay3290/ai-skills
computer-forensics           Composio            mhattingpete/claude-skills-marketplace
file-deletion                Composio            mhattingpete/claude-skills-marketplace
threat-hunting-sigma-rules   Composio            jthack/threat-hunting-with-sigma-rules-skill
family-history-research      Composio            emaynard/claude-family-history-research-skill
jules                        Composio            sanjay3290/ai-skills
claude-code-terminal-title   Composio            bluzername/claude-code-terminal-title
pypict-claude-skill          Composio            omkamal/pypict-claude-skill
move-code-quality-skill      Composio            1NickPappas/move-code-quality-skill
postgres (skill)             Composio            sanjay3290/ai-skills
outline (skill)              Composio            sanjay3290/ai-skills
```

### Lo que haría

**1. Agregar GoDaddy como conector MCP** via SQL INSERT en `mcp_servers` con:
- Nombre: GoDaddy
- Categoría: business
- GitHub URL del servidor comunitario + homepage oficial
- Descripción: buscar dominios y verificar disponibilidad

**2. Insertar las ~14 skills faltantes** via SQL INSERT en `skills` con:
- Slugs, display names, taglines, descriptions
- GitHub URLs correctas
- Categorías inferidas (desarrollo, seguridad, productividad, creatividad)
- Status `approved`

### Archivos a modificar
- Solo SQL (INSERTs en `skills` y `mcp_servers`). Sin cambios de código frontend.

