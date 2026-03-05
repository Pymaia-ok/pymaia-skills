

## Plan: Sistema de Dependencias MCP para Skills

### Alcance

Dos frentes: (A) soporte en la base de datos + UI de detalle para skills existentes, y (B) integración en SkillForge para que skills nuevas declaren y auto-instalen MCPs.

---

### A. Skills existentes — Campo `required_mcps` + UI

**1. Migración SQL**
- Agregar columna `required_mcps jsonb DEFAULT '[]'::jsonb` a la tabla `skills`
- Sin índices especiales necesarios (es metadata, no se busca por ella)

**2. UI en `SkillDetail.tsx`**
- Nueva sección "Requiere" entre la descripción y los use cases
- Cada MCP como card con: nombre, descripción corta, link al repo, lista de tools requeridas
- Badge visual "Requiere configuración externa" si `required_mcps` no está vacío
- Diferenciación visual entre MCPs obligatorios y opcionales

**3. Tipos**
- Actualizar tipos TS después de la migración (automático)

---

### B. SkillForge — Creación de skills con MCPs

**1. Actualizar `generate-skill` edge function**
- Agregar `required_mcps` al tool schema del skill generator
- Actualizar el prompt `GENERATE_PROMPT` para que:
  - Detecte cuándo la skill necesita interacción con sistemas externos (email, WhatsApp, APIs, bases de datos)
  - Sugiera MCPs conocidos del ecosistema o declare MCPs custom
  - Genere una sección `## Dependencies` en el SKILL.md con instrucciones de auto-setup

**2. Estructura del campo `required_mcps`**
```json
[
  {
    "name": "Gmail MCP",
    "description": "Read and send emails",
    "url": "https://github.com/anthropics/gmail-mcp",
    "install_command": "npx @anthropic/mcp-server-gmail init",
    "required_tools": ["send_email", "search_inbox"],
    "credentials_needed": ["Gmail OAuth"],
    "optional": false
  }
]
```

**3. Sección `## Dependencies` en el SKILL.md generado**
- Auto-detección de MCPs disponibles al arrancar la skill
- Instrucciones de instalación automática si no están presentes
- Guía para configurar credenciales
- Ejemplo del bloque que se agregaría al SKILL.md:

```text
## Dependencies

This skill requires the following MCP servers:

### Gmail MCP (required)
- **Install**: `npx @anthropic/mcp-server-gmail init`
- **Tools used**: send_email, search_inbox
- **Credentials**: Gmail OAuth token

Before executing, verify MCP availability:
1. Check if tools are accessible via `mcp__gmail__send_email`
2. If not found, run the install command above
3. Add to ~/.claude/mcp_servers.json and restart
```

**4. UI en `SkillPublishConfig.tsx`**
- Nueva sección "Dependencias externas" antes del pricing
- Mostrar MCPs sugeridos por la IA (editables)
- Botón para agregar MCPs custom (nombre, URL, tools, credenciales)
- Toggle obligatorio/opcional por cada MCP

**5. UI en `SkillPreview.tsx`**
- Mostrar sección de MCPs requeridos en la preview
- Verificar que la sección Dependencies existe en el SKILL.md generado

**6. Flujo de `CrearSkill.tsx`**
- Pasar `required_mcps` del skill generado al publish config
- Incluirlo en el `submitSkill` call

**7. Actualizar `submitSkill` en `lib/api.ts`**
- Agregar campo `required_mcps` al payload de publicación

---

### Resumen de archivos a modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | Agregar columna `required_mcps` |
| `generate-skill/index.ts` | Prompt + tool schema + sección Dependencies en SKILL.md |
| `SkillDetail.tsx` | Sección "Requiere" con MCPs |
| `SkillPreview.tsx` | Mostrar MCPs detectados |
| `SkillPublishConfig.tsx` | Editor de MCPs requeridos |
| `CrearSkill.tsx` | Pasar `required_mcps` en el flujo |
| `lib/api.ts` | Campo `required_mcps` en submitSkill |
| `i18n/es.ts` + `en.ts` | Traducciones nuevas |

