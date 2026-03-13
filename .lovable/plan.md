

## Problemas detectados y plan de corrección

### Problema 1: Contenido mixto español/inglés en blog posts

**Causa raíz**: Muchos posts tienen `content_es` incompleto (30-40% del largo del inglés). Son traducciones truncadas de posts antiguos. La lógica actual `content_es || content` muestra el español truncado en lugar de caer al inglés completo.

Posts afectados (10 con ratio < 50%):
- `connect-like-a-pro...` — 221 chars ES vs 27,421 EN (0.8%)
- `10-ways-ai-agents...` — 1,096 vs 3,803 (28.8%)
- 8 posts más entre 30-40%

**Solución**: En `BlogPost.tsx`, agregar validación de calidad: si `content_es` tiene menos del 50% del largo de `content`, usar `content` (inglés) como fallback. Lo mismo para `title_es` y `meta_description_es`.

### Problema 2: Títulos de página (browser tab) no traducidos

Varias páginas tienen el `<title>` hardcodeado en un solo idioma:

| Página | Título actual | Problema |
|--------|--------------|----------|
| Index | "Potenciá tu equipo..." | Solo español |
| Explore | "Explore Skills" | Solo inglés |
| ConectorDetail | "Conectores" | Solo español |
| Enterprise | "Portal Empresarial" | Solo español |
| Blog | "Blog — Pymaia Skills" | OK (neutro) |
| Conectores | Sin verificar | Probable |

**Solución**: Agregar lógica `isEs` en el `useSEO` de cada página para mostrar título y descripción en el idioma correcto.

### Cambios a implementar

1. **`src/pages/BlogPost.tsx`** — Agregar validación de calidad de traducción antes de elegir contenido ES/EN
2. **`src/pages/Index.tsx`** — Título/descripción bilingüe en useSEO
3. **`src/pages/Explore.tsx`** — Título/descripción bilingüe
4. **`src/pages/ConectorDetail.tsx`** — Título/descripción bilingüe
5. **`src/pages/Enterprise.tsx`** — Título/descripción bilingüe
6. **`src/pages/Plugins.tsx`** — Ya tiene i18n, verificar
7. **`src/pages/SkillDetail.tsx`** — Ya usa datos dinámicos, verificar

Adicionalmente: corregir en DB los posts con traducciones truncadas regenerando `content_es` via la edge function `translate-skills` o `generate-blog-post`.

