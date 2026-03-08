

## Hallazgos de claude.com/skills y docs oficiales

### Lo que ofrece Anthropic oficialmente

1. **Skill Creator Skill**: Claude tiene un "skill-creator skill" nativo en claude.ai/settings/capabilities. El usuario describe lo que quiere y Claude genera la carpeta con SKILL.md + recursos. Es el equivalente oficial de nuestro SkillForge.

2. **Skills ahora funcionan en 3 superficies**: Claude Code (filesystem), Claude.ai (upload ZIP en Settings > Features), y Claude API (upload via /v1/skills). Antes solo era Claude Code.

3. **Pre-built Skills oficiales**: PowerPoint, Excel, Word, PDF -- vienen incluidas.

4. **Estructura SKILL.md actualizada**: Solo requiere `name` (max 64 chars, kebab-case) y `description` (max 1024 chars). Nuestro generador ya cumple esto. El campo `compatibility` y `metadata` que usamos son extras válidos pero no requeridos.

5. **Progressive disclosure**: Las skills se cargan en 3 niveles (metadata siempre, SKILL.md al activarse, recursos bajo demanda). Esto es relevante para nuestra guía.

6. **Limitación importante**: Las skills NO se sincronizan entre superficies. Hay que subirlas por separado a cada una.

---

### Plan de cambios

#### 1. Actualizar Primeros Pasos con info de las 3 superficies

La sección de skills actualmente dice que es solo para Claude Code. La realidad es que las skills ahora funcionan en Claude Code, Claude.ai y la API.

**Cambios en `PrimerosPasos.tsx`**:
- En la sección "¿Qué son las Skills?": agregar un bloque visual "Donde funcionan las skills" con 3 tarjetas (Claude.ai: subir ZIP, Claude Code: carpeta .claude/skills/, API: upload endpoint)
- En la sección de instalación: actualizar para mostrar los 2 métodos (CLI para Claude Code + upload ZIP para Claude.ai)
- Agregar mención a los pre-built skills oficiales (PowerPoint, Excel, Word, PDF) como contexto

#### 2. Actualizar Primeros Pasos con el concepto de "progressive disclosure"

Agregar una mini-sección visual (o expandir la analogía existente) explicando cómo las skills se cargan en 3 niveles: metadata, instrucciones, recursos. Esto ayuda al usuario a entender por qué puede tener muchas skills sin impacto en performance.

#### 3. Mejorar el flujo del Skill Creator (SkillForge)

Nuestro SkillForge ya es superior al skill-creator nativo de Anthropic en varios aspectos (entrevista guiada, tests, playground, scoring). Sin embargo, hay mejoras alineadas con la doc oficial:

- **Validar campos del SKILL.md**: `name` max 64 chars, solo lowercase+hyphens+numbers, sin "anthropic"/"claude". `description` max 1024 chars. Agregar validación en `generate-skill/index.ts`.
- **Agregar soporte para recursos bundled**: La doc oficial muestra que skills pueden tener carpetas con scripts y archivos adicionales. Nuestro generador solo genera un SKILL.md plano. Esto es un feature futuro, no urgente.

#### 4. Agregar opción de descarga como ZIP en SkillPreview

La doc oficial muestra que Claude.ai acepta skills como ZIP. Actualmente solo ofrecemos "copiar SKILL.md". Agregar un botón "Descargar como ZIP" que genere un .zip con la carpeta `nombre-skill/SKILL.md` lista para subir a Claude.ai.

#### 5. Actualizar i18n (es.ts y en.ts)

Agregar las nuevas strings para las secciones de superficies y el botón de descarga ZIP.

---

### Resumen de archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/PrimerosPasos.tsx` | Agregar sección "Donde funcionan" + progressive disclosure + actualizar instalación |
| `src/components/crear-skill/SkillPreview.tsx` | Agregar botón "Descargar como ZIP" |
| `supabase/functions/generate-skill/index.ts` | Validar name (64 chars, kebab) y description (1024 chars) |
| `src/i18n/es.ts` + `src/i18n/en.ts` | Nuevas strings |

### Lo que NO cambia (nuestro SkillForge ya es mejor)

- La entrevista guiada con 8 preguntas especializadas (Anthropic solo dice "describe what you want")
- El scoring de calidad con feedback
- Los tests automatizados
- El Playground interactivo
- El soporte para attachments (docs, URLs, imágenes)

