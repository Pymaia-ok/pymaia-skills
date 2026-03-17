
# Diagnóstico Completo de Cursos + Plan de Mejora

## Estado Actual: 4 cursos buenos, 8 muy deficientes

| Grupo | Cursos | Avg chars/módulo | Quizzes | Párrafos | Calidad |
|---|---|---|---|---|---|
| **Marketing** (3) | beginner, intermediate, advanced | 1700-2100 | ✅ Sí | ✅ Sí | Buena |
| **Consulting** (3) | beginner, intermediate, advanced | 1500-2000 | ✅ Sí | ✅ Sí | Buena |
| **Legal beginner** (1) | beginner | 1540 | ✅ 4/5 | ✅ Sí | OK |
| **Legal int/adv** (2) | intermediate, advanced | 950-1070 | ❌ 0 | ❌ No | Mala |
| **Founders** (3) | beginner, intermediate, advanced | 830-950 | ❌ 0-1 | ❌ No | Mala |

### Problemas específicos en los 8 cursos malos:
1. **Contenido muy corto** (650-1050 chars vs 1700-2100 en los buenos) — solo un prompt envuelto en `:::tryit`, sin explicación pedagógica
2. **Sin párrafos** (`\n\n`) — todo se renderiza como bloque compacto
3. **Sin quizzes** — 30 de 60 módulos tienen 0 preguntas
4. **Sin contexto educativo** — saltan directo a "copia este prompt" sin explicar por qué, cuándo, ni cómo adaptar

### Problemas de UX/Formato:
- Los módulos sin `\n\n` se renderizan como una pared de texto dentro de los bloques interactivos
- No hay filtro por rol en `/cursos` (solo por dificultad)
- No hay agrupación visual por rol — los 12 cursos aparecen en grid plano

---

## Plan de Implementación

### 1. Regenerar los 8 cursos deficientes
Usar `generate-course` con un **prompt mejorado** que exija:
- 400-600 palabras REALES por módulo (no solo prompts)
- Estructura: Intro → Conceptos → Ejemplo práctico → `:::tryit` → `:::tip` → Quiz (3 preguntas)
- Párrafos dobles obligatorios entre secciones
- Al menos 2 bloques interactivos (`:::tryit`, `:::step`, `:::tip`) por módulo

**Cursos a regenerar:**
- `claude-founders-beginner`, `claude-founders-intermediate`, `claude-founders-advanced`
- `claude-legal-intermediate`, `claude-legal-advanced`
- Y validar `claude-legal-beginner` (1 módulo sin quiz)
- `claude-marketing-advanced` (tiene 0 quizzes en los 5 módulos)

### 2. Quality Gate mejorado en `generate-course`
Antes de guardar los módulos, validar:
- `content_md.length >= 1200` chars (mínimo para contenido útil)
- `content_md` contiene al menos 3 `\n\n` (párrafos)
- `quiz_json.length >= 2` preguntas por módulo
- Al menos 1 bloque interactivo (`:::tryit` o `:::step`)
- Si falla → regenerar ese módulo individual con prompt más específico

Agregar un `mode: "regenerate-course"` que:
- Tome un `course_slug` existente
- Regenere solo los módulos que no pasan el quality gate
- Preserve los módulos que ya son buenos

### 3. Mejoras UX en la página `/cursos`
- **Agrupar por rol** con secciones colapsables (Marketing, Legal, Founders, Consultores)
- Dentro de cada rol, mostrar los 3 niveles (beginner → intermediate → advanced) como path visual
- **Agregar filtro por rol** además del filtro de dificultad existente
- Indicar "learning path" visual (flechas entre niveles)

### 4. Fix de formato en `RichModuleContent`
- El parser `proseToHtml` no maneja bien contenido sin `\n\n` — agregar fallback que divida párrafos largos (>500 chars sin break) insertando breaks antes de frases que empiecen con mayúscula tras punto

---

## Archivos a editar

| Archivo | Cambio |
|---|---|
| `supabase/functions/generate-course/index.ts` | Prompt mejorado, quality gate reforzado, modo `regenerate-course` |
| `src/pages/Courses.tsx` | Agrupar por rol, filtro dual (rol + dificultad), learning path visual |
| `src/components/courses/RichModuleContent.tsx` | Fallback para contenido sin párrafos dobles |
| `src/components/courses/CourseCard.tsx` | Indicador de nivel en path (beginner→intermediate→advanced) |

### Ejecución post-código
Llamar `generate-course` con `mode: "regenerate-course"` para los 8 cursos deficientes para regenerar contenido de calidad.
