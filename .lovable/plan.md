

# Auditoría de Calidad + Completar Cursos Faltantes

## Estado Actual

| Métrica | Valor |
|---|---|
| Cursos activos | 80 |
| Total módulos | 407 |
| Módulos con skills recomendados | 259/407 (64%) |
| Módulos con conectores recomendados | 263/407 (65%) |
| Skills recomendados verificados | ✅ Todos existen en el catálogo |
| Avg content length | 3,000-6,000 chars ✅ |
| Avg quizzes/módulo | 3 ✅ |

### Problemas Encontrados

**1. 37 cursos faltantes en los 6 nuevos roles**
Los roles nuevos (contabilidad, diseñador, finanzas, operaciones, RRHH, ventas) tienen solo ~5-6 cursos cada uno en vez de 12 (4 tools × 3 levels). Faltan 37 combinaciones específicas, principalmente:
- Casi todos los niveles **advanced** de todas las tools
- Todos los cursos de **OpenClaw** para contabilidad, finanzas, operaciones, ventas
- Todos los cursos de **Lovable** para diseñador, operaciones, RRHH, ventas

**2. 1 módulo muy corto** (claude-legal-beginner módulo 1: 1,393 chars)
Justo por debajo del quality gate de 1,500.

**3. Los skills/conectores recomendados son técnicos/genéricos**
Slugs como `recall-reasoning`, `database-management-operations`, `flow-documenter` son reales pero poco relevantes para roles como ventas o RRHH. Deberían recomendar tools más pertinentes al rol (ej: `social-media-trends-research` para marketing, herramientas de CRM para ventas).

**4. Contenido es correcto pero genérico**
Los módulos de los nuevos roles tienen contenido sólido (~3,000-4,000 chars) pero son más teóricos. Los cursos originales de Claude (marketing/legal/consulting) son más prácticos con prompts copy-paste y casos reales.

## Plan de Implementación

### 1. Generar los 37 cursos faltantes
Llamar `generate-course` para completar las combinaciones tool×rol×difficulty que faltan. Prioridad:
- OpenClaw × 6 roles × niveles faltantes
- Lovable × 6 roles × niveles faltantes  
- Manus × roles con gaps
- Claude × roles con gaps (operaciones advanced, rrhh beginner, ventas advanced)

### 2. Regenerar el módulo thin
`claude-legal-beginner` módulo 1 (1,393 chars) → regenerar con `mode: "regenerate-course"`.

### 3. Mejorar recomendaciones de skills/conectores
Actualizar el prompt de `generate-course` para que incluya skills y conectores **relevantes al rol profesional** en vez de genéricos. Ejemplos:
- **Ventas**: CRM tools, email automation, lead scoring
- **RRHH**: Scheduling, document management, communication tools
- **Contabilidad**: Spreadsheet tools, data analysis, financial reporting
- **Diseñador**: Image generation, prototyping, design system tools

### 4. Ajustar `detectTool()` en Courses.tsx
Algunos slugs de los nuevos roles usan el patrón `claude-para-X` en vez de `claude-X-difficulty`, lo que rompe la detección de herramienta. Normalizar para que el agrupamiento visual funcione correctamente.

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/generate-course/index.ts` | Mejorar prompt para recomendaciones de skills/conectores por rol |
| `src/pages/Courses.tsx` | Fix `detectTool()` para slugs tipo `claude-para-X` |

## Ejecución post-código
- Llamar `generate-course` para los 37 cursos faltantes (en batches)
- Regenerar el módulo thin de claude-legal-beginner
- Verificar que todos los cursos aparecen correctamente agrupados en la UI

