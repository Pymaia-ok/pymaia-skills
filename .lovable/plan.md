

# Plan: Pymaia Academy — Cursos interactivos por rol profesional

## Concepto

Crear una sección "Pymaia Academy" con cursos interactivos adaptados por rol profesional. Cada curso lleva al usuario de cero a experto en Claude, con lecciones cortas, quizzes inline, y recomendaciones de skills/conectores/plugins del catálogo de Pymaia al final de cada módulo. Todo en ES/EN.

## Arquitectura

### Base de datos: tabla `courses` + `course_modules` + `course_progress`

```text
courses
├── id, slug, title, title_es, description, description_es
├── role_slug (marketer, abogado, etc.)
├── difficulty (beginner | intermediate | advanced)
├── emoji, estimated_minutes, module_count
├── is_active, created_at
│
course_modules
├── id, course_id (FK), sort_order
├── title, title_es, content_md, content_md_es
├── quiz_json (array of {question, options, correct_index})
├── recommended_skill_slugs[], recommended_connector_slugs[]
├── estimated_minutes
│
course_progress (requires auth)
├── id, user_id, course_id, module_id
├── completed_at, quiz_score
```

- RLS: courses y modules son públicos para lectura. Progress requiere auth (`auth.uid() = user_id`).
- El contenido de cada módulo se almacena como Markdown (igual que blog posts), renderizado con la misma clase `.prose`.

### Páginas y rutas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/cursos` | `Courses.tsx` | Listado de cursos con filtros por rol y dificultad |
| `/curso/:slug` | `CourseDetail.tsx` | Vista del curso con módulos colapsables |
| `/curso/:slug/:moduleOrder` | `CourseModule.tsx` | Lección individual con contenido + quiz inline |

Aliases EN: `/courses` → `/cursos`, `/course/:slug` → `/curso/:slug`

### Componentes nuevos

1. **`CourseCard.tsx`** — Card de preview del curso (emoji, título, rol, dificultad badge, progreso del usuario, duración estimada)
2. **`CourseModuleList.tsx`** — Lista de módulos con checkmarks de progreso
3. **`ModuleQuiz.tsx`** — Quiz interactivo inline (radio buttons, feedback inmediato, score)
4. **`ModuleRecommendations.tsx`** — Al final de cada módulo, muestra skills/conectores relacionados del catálogo
5. **`CoursesSection.tsx`** — Sección en la landing page para promover los cursos

### Contenido inicial (generado con AI)

Generar 3-4 cursos iniciales usando una edge function `generate-course` que:
1. Toma un `role_slug` y genera 4-6 módulos
2. Cada módulo tiene contenido Markdown con ejemplos prácticos de Claude
3. Incluye quiz de 3-4 preguntas por módulo
4. Mapea skills/conectores relevantes del catálogo existente

Cursos iniciales sugeridos:
- **Claude para Marketing** (marketer) — Contenido, análisis, campañas
- **Claude para Abogados** (abogado) — Contratos, compliance, jurisprudencia
- **Claude para Founders** (founder) — Pitch, producto, competencia
- **Claude para Consultores** (consultor) — Propuestas, investigación, presentaciones

### Landing integration

Agregar `CoursesSection` en `Index.tsx` después de `BundlesSection`. Muestra 4 course cards con CTA "Ver todos los cursos".

### Navbar

Agregar link "Academy" / "Cursos" al navbar.

### i18n

Agregar strings para ambos idiomas en `es.ts` y `en.ts` (sección `courses`).

## Resumen de cambios

| Tipo | Archivos |
|------|----------|
| DB Migration | 3 tablas nuevas + RLS policies |
| Páginas | `Courses.tsx`, `CourseDetail.tsx`, `CourseModule.tsx` |
| Componentes | `CourseCard`, `CourseModuleList`, `ModuleQuiz`, `ModuleRecommendations`, `CoursesSection` |
| Edge Function | `generate-course` (genera contenido con AI) |
| Editados | `App.tsx` (rutas), `Navbar.tsx` (link), `Index.tsx` (sección), `es.ts`, `en.ts` |

## Orden de implementación

1. Migración DB (3 tablas)
2. Páginas + componentes de UI
3. Edge function para generar contenido
4. Seed de 3-4 cursos iniciales
5. Integración en landing + navbar
6. i18n completo

