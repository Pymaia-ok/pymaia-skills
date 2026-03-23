

# Auditoría: Pymaia SkillForge vs Guía Oficial Anthropic

## Resumen ejecutivo

El sistema actual cubre ~75% de los lineamientos de Anthropic. Hay gaps importantes en la estructura del SKILL.md generado, campos YAML faltantes, y la ausencia de soporte para carpetas con scripts/references.

## Comparativa detallada

| Lineamiento Anthropic | Estado Pymaia | Gap |
|---|---|---|
| **Frontmatter YAML con `name` + `description`** | ✅ Implementado | name kebab-case, description keyword-rich |
| **Campo `description` = QUÉ + CUÁNDO + triggers** | ✅ Implementado | GENERATE_PROMPT lo exige explícitamente |
| **Progressive Disclosure (3 niveles)** | ⚠️ Parcial | Generamos SKILL.md (nivel 2) pero no soportamos `references/` ni `scripts/` (nivel 3) |
| **Carpeta con estructura: SKILL.md + scripts/ + references/ + assets/** | ❌ Faltante | Solo generamos un SKILL.md plano, no una carpeta ZIP con subcarpetas |
| **Campos YAML opcionales: `license`, `allowed-tools`, `metadata`** | ❌ Faltante | Solo generamos `name`, `description`, `compatibility`, `metadata.author/version` — faltan `license`, `allowed-tools` |
| **Decision Tree en el body** | ✅ Implementado | GENERATE_PROMPT incluye formato ASCII de decision tree |
| **Workflow paso a paso** | ✅ Implementado | Sección obligatoria en el prompt |
| **Examples con input/output concretos** | ✅ Implementado | Mínimo 2 ejemplos requeridos |
| **Common Pitfalls ❌/✅** | ✅ Implementado | Formato visual exigido |
| **What NOT to Do (NEVER list)** | ✅ Implementado | Sección obligatoria |
| **Best Practices section** | ⚠️ Parcial | Mencionada en el prompt pero no como sección obligatoria separada |
| **Error/Troubleshooting section** | ❌ Faltante | La guía recomienda sección de errores comunes con causa/solución |
| **SKILL.md < 500 líneas** | ✅ Implementado | Regla explícita en el prompt |
| **Nombre kebab-case, sin "claude"/"anthropic"** | ✅ Implementado | `validateSkillFields` lo sanitiza |
| **Description max 1024 chars** | ✅ Implementado | Trunca en `validateSkillFields` |
| **No XML angle brackets en frontmatter** | ❌ No validado | La guía lo marca como restricción de seguridad |
| **No README.md dentro del skill folder** | N/A | No generamos carpetas aún |
| **Testing guidance (trigger/functional/performance)** | ⚠️ Parcial | Tenemos test-skill y auto-improve, pero no test de triggering |
| **Negative triggers en description** | ❌ Faltante | La guía recomienda "Do NOT use for X" en la description |
| **ZIP export con estructura de carpeta** | ❌ Faltante | Solo exportamos SKILL.md plano |
| **MCP Dependencies section** | ✅ Implementado | Para api-connectors |

## Cambios propuestos

### 1. Actualizar GENERATE_PROMPT en `generate-skill/index.ts`
- Agregar sección obligatoria `## Troubleshooting` con formato Error/Cause/Solution
- Agregar sección obligatoria `## Best Practices` separada
- Exigir **negative triggers** en la description YAML ("Do NOT use for...")
- Agregar campos YAML opcionales: `license: MIT`, `allowed-tools` cuando aplique
- Sanitizar XML angle brackets (`<`, `>`) del frontmatter generado

### 2. Actualizar `validateSkillFields` en `generate-skill/index.ts`
- Agregar sanitización de `<` y `>` en el frontmatter del `install_command`
- Validar que la description incluya trigger phrases

### 3. Actualizar JUDGE_PROMPT en `generate-skill/index.ts`
- Agregar criterio de evaluación para Troubleshooting section
- Agregar criterio para negative triggers en description
- Agregar criterio para Best Practices como sección separada

### 4. Actualizar interviewer en `skill-interviewer/index.ts`
- Agregar pregunta sobre troubleshooting: "¿Cuáles son los errores más comunes que ves y cómo los resolvés?"
- Reordenar numeración duplicada (líneas 50-53 tienen números repetidos 10-11)

### 5. Agregar export ZIP con estructura de carpeta (nuevo)
- En `SkillPreview.tsx` o `SkillPublishConfig.tsx`: al descargar, generar un ZIP con:
  ```
  skill-name/
  ├── SKILL.md
  └── (sin README.md)
  ```
- Usar JSZip (ya disponible en el proyecto para EPUB)

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/generate-skill/index.ts` | Actualizar GENERATE_PROMPT, JUDGE_PROMPT, validateSkillFields |
| `supabase/functions/skill-interviewer/index.ts` | Fix numeración duplicada, agregar pregunta troubleshooting |
| `src/components/crear-skill/SkillPreview.tsx` | Agregar export ZIP con estructura de carpeta |

## Lo que NO cambiamos (ya está bien)
- Decision tree, workflow, examples, pitfalls, NEVER list
- Kebab-case validation, description length limit
- MCP Dependencies para api-connectors
- Auto-improve loop con test-skill
- Progressive disclosure < 500 líneas
- Detección automática de tipo de artefacto

