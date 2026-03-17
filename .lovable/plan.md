

# Diagnóstico de Calidad: Blog Posts y Cursos

## Problemas encontrados

### Blog Posts — 3 tipos de defectos

| Defecto | Posts afectados | Ejemplo |
|---|---|---|
| **Triple quotes** `'''` al inicio/final del contenido | 9 posts | `claude-in-2026`, `ai-agents-for-beginners`, `skills-connectors-and-plugins` |
| **JSON keys filtradas** (`content_es=`, `meta_description_en=`) al final del contenido | 4 posts | `skills-connectors-and-plugins`, `automate-invoice`, `automate-seo`, `connect-like-a-pro` |
| **Contenido truncado** (< 7000 chars, corte abrupto sin conclusión) | 2 posts | `the-15-most-useful-ai-integrations` (5316 chars, corta a mitad de frase), `clawbot` (5683 chars) |

**Causa raíz**: El modelo devuelve `'''content'''` como wrapper de Python strings, y a veces incluye keys del JSON schema en el texto. La función no sanitiza estas anomalías antes de guardar.

### Cursos — 1 defecto

| Defecto | Módulos afectados |
|---|---|
| **Spanish content < 50% del inglés** (no traducciones completas, solo resúmenes) | 13 de 60 módulos (todos en consulting courses) |

**Causa raíz**: `generate-course` usa `gemini-2.5-flash` sin tool calling. El modelo trunca el español cuando el prompt es muy largo. Sin validación post-generación.

---

## Plan: Quality Gate + Cleanup

### 1. Quality gate en `generate-blog-post` (antes de INSERT)
Agregar función `sanitizeArticle()` justo antes de insertar/actualizar que:
- Strip `'''` del inicio y final del contenido (EN y ES)
- Elimine trailing JSON keys (`content_es=`, `meta_description_en=`, etc.) con regex
- Strip H1 headings (`# Title\n`) del inicio del contenido (ya renderizado como título)
- Valide que el contenido no termine abruptamente (mid-sentence sin punto final)

Aplicar en ambas rutas: generación normal (L520) y regeneración (L260).

### 2. Quality gate en `generate-course` (antes de INSERT módulos)
Agregar validación post-AI:
- Si `content_md_es` < 50% de `content_md`, regenerar solo el español con una llamada adicional
- Strip `'''` y code fences del contenido de módulos
- Validar que `quiz_json` tenga al menos 2 preguntas por módulo

### 3. Cleanup de datos existentes (one-time SQL fix)
Ejecutar una migración que limpie los posts y módulos existentes:
- Quitar `'''` de inicio/final de `content` y `content_es` en blog_posts
- Quitar trailing JSON keys filtradas
- Marcar posts truncados (< 5500 chars) para re-generación

### 4. Endpoint de quality-check para cursos
Agregar un modo `mode: "fix-translations"` en `generate-course` que:
- Detecte módulos con español incompleto
- Regenere solo `content_md_es` usando el contenido inglés como referencia

---

## Archivos a editar

| Archivo | Cambio |
|---|---|
| `supabase/functions/generate-blog-post/index.ts` | Agregar `sanitizeArticle()`, aplicar antes de insert y update |
| `supabase/functions/generate-course/index.ts` | Agregar validación de calidad, regeneración de español, sanitización |
| SQL migration | Cleanup one-time de datos existentes (9 posts con `'''`, 4 con JSON keys, 13 módulos con español corto) |

### Detalle técnico de `sanitizeArticle()`

```text
function sanitizeArticle(text: string): string {
  1. Strip leading/trailing ''' (triple single quotes)
  2. Strip trailing ", content_es=" or ", meta_description_en=" patterns
  3. Strip leading "# Title\n" (H1 heading)
  4. Trim whitespace
  return cleaned text
}
```

No se requiere lógica de retry adicional — el blog ya tiene retry para contenido corto. Solo falta la sanitización post-AI.

