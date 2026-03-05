

## Plan: Unificar filtros y actualizar landing

### 1. Unificar categorias e industrias en una sola fila de filtros

Actualmente hay dos filas: `SKILL_CATEGORIES` (10 items: IA, Desarrollo, Diseño...) y `INDUSTRY_FILTERS` (6 items: Arquitectura, Ingeniería...). Se fusionan en un solo array `SKILL_CATEGORIES` que incluye las industrias como categorias adicionales.

**Cambios en `src/lib/api.ts`:**
- Agregar Arquitectura, Ingeniería, Construcción, Medicina, Educación, Tecnología al array `SKILL_CATEGORIES`
- Eliminar `INDUSTRY_FILTERS`
- En `fetchSkills`, usar solo el filtro `category` (ya no `industry` separado)

**Cambios en `src/pages/Explore.tsx`:**
- Eliminar la segunda fila de filtros de industria
- Eliminar el state `selectedIndustry`
- Quitar la referencia a `INDUSTRY_FILTERS`

### 2. Actualizar la landing con más roles y skills

**Cambios en `src/components/landing/MarqueeSection.tsx`:**
- Agregar roles nuevos que reflejen las industrias expandidas: Ingeniería, Construcción, etc.
- Agregar skills relevantes a las nuevas profesiones: "Planos CAD", "Revisión BIM", "Historia clínica", etc.

**Cambios en `src/data/skills.ts`:**
- Agregar roles nuevos como "ingeniero", "medico", "profesor", "arquitecto"
- Agregar tareas correspondientes en `tasksByRole`

**Cambios en `src/components/landing/WizardSection.tsx`:**
- Incluir los nuevos roleIds y sus tareas en el wizard
- Agregar `taskFilters` para las nuevas tareas

### 3. Ajuste de query en `fetchSkills`

La columna `industry` en la DB se usaba como filtro separado. Ahora las industrias se tratan como categorias, asi que el filtro `industry` se convierte en un OR entre `category` e `industry` columns cuando se selecciona una de las nuevas categorias (Arquitectura, etc.), o simplemente se unifica el filtrado buscando en ambas columnas.

