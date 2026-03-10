

## Plan: Eliminar Template Selector — El agente decide automáticamente

Tenés razón. El selector de templates es fricción innecesaria. El agente conversacional ya tiene la capacidad de entender qué quiere el usuario y debería decidir automáticamente qué tipo de artefacto generar (skill simple, API connector, workflow, slash command, subagente).

### Cambios

**1. `src/pages/CrearSkill.tsx`**
- Eliminar el step `"template"` y `"mcp-wizard"` del flujo inicial
- El estado inicial pasa directo a `"chat"` (sin pasar por template selector)
- Eliminar `selectedTemplate`, `handleTemplateSelect`, `handleMcpWizardComplete` y el bloque de render del template/mcp-wizard
- Mantener `mcpContext` por si el agente decide que necesita un MCP (se resuelve en el backend)

**2. `supabase/functions/skill-interviewer/index.ts`**
- Actualizar el system prompt para que el agente:
  - Detecte automáticamente qué tipo de artefacto conviene (skill, workflow, API connector, slash command, subagente)
  - Si detecta que necesita una API externa, pregunte los detalles de la API durante la entrevista (reemplaza al MCP wizard)
  - Al emitir `[ENTREVISTA_COMPLETA]`, incluya un tag `[TIPO:workflow]` o `[TIPO:api-connector]` etc. para que el generador sepa qué producir

**3. `supabase/functions/generate-skill/index.ts`**
- Parsear el tag `[TIPO:xxx]` de la conversación para decidir qué artefactos generar (SKILL.md solo, plugin.json + MCP server, etc.)
- Si no hay tag, inferir del contenido (fallback a skill simple)

**4. Limpieza**
- `src/components/crear-skill/PluginTemplateSelector.tsx` — se puede eliminar o dejar como componente legacy
- `src/components/crear-skill/McpApiWizard.tsx` — la lógica de preguntas de API se absorbe en el entrevistador
- Limpiar i18n keys no usadas del template selector

### Resultado
El usuario entra a `/crear-skill`, ve directo el chat, describe lo que quiere, y el agente decide qué construir. Cero fricción.

