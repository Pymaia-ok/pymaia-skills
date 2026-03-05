

## Análisis del repositorio `anthropics/skills`

### Qué es

Es el **repositorio oficial de Anthropic** (84K+ stars) que define el estándar **Agent Skills** -- el formato que Claude usa para cargar skills dinámicamente. Contiene:

1. **La especificación oficial** del formato `SKILL.md` (frontmatter YAML + markdown)
2. **~15 skills de ejemplo** (algorithmic-art, brand-guidelines, canvas-design, claude-api, doc-coauthoring, frontend-design, internal-comms, mcp-builder, pdf, pptx, docx, xlsx, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing)
3. **Un template** básico para crear skills nuevas
4. **Las document skills** que potencian las capacidades de documentos de Claude.ai

### El formato oficial SKILL.md

```text
---
name: skill-name              # kebab-case, max 64 chars
description: Qué hace y cuándo usarla  # max 1024 chars
license: Apache-2.0           # opcional
compatibility: claude-code    # opcional
metadata:                     # opcional
  author: org-name
  version: "1.0"
---

# Instrucciones en Markdown

## Examples
## Guidelines
```

### Nos sirve? SI, mucho

Nuestro proyecto genera skills con un formato propietario (`install_command` como string). Podemos alinearnos al estándar oficial de Anthropic para que las skills generadas en PyMaia sean **directamente compatibles** con Claude Code, Claude.ai y la API de Claude.

### Plan: Alinear generación de skills al estándar Agent Skills

**Cambios principales:**

1. **Actualizar el prompt de `generate-skill`** para que el `install_command` genere un SKILL.md con frontmatter YAML válido según la spec (name en kebab-case, description max 1024 chars, body en markdown con instrucciones, ejemplos y guidelines)

2. **Mejorar la preview** para mostrar el SKILL.md renderizado con su frontmatter, y agregar un botón de "Copiar SKILL.md" que copie el contenido listo para pegar en un proyecto

3. **Agregar instrucciones de instalación** en la UI post-publicación que expliquen cómo usar la skill en Claude Code (`/plugin install`) y Claude.ai (subir archivo)

4. **Importar skills de ejemplo** del repo de Anthropic como skills "oficiales" en el catálogo de PyMaia, dando contenido real al marketplace

### Archivos a modificar

- `supabase/functions/generate-skill/index.ts` -- actualizar `GENERATE_PROMPT` para que genere SKILL.md con frontmatter YAML según spec oficial
- `src/components/crear-skill/SkillPreview.tsx` -- mostrar preview del SKILL.md formateado + botón copiar
- `src/components/crear-skill/SkillPublishConfig.tsx` -- agregar instrucciones de instalación para Claude Code/Claude.ai
- Opcionalmente: edge function para importar skills del repo de Anthropic al catálogo

