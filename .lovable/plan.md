

## Blog / Artículos SEO Auto-generados

### Concepto
Agregar un sistema de blog con artículos generados automáticamente por IA sobre seguridad de agentes IA, productividad con IA, y temas del ecosistema MCP. Un cron diario genera 2-3 artículos de alta calidad con keywords SEO y geo-targeting, publicándolos automáticamente.

### Arquitectura

**Base de datos**: Nueva tabla `blog_posts` con campos para SEO (meta_description, keywords, slug, canonical), contenido bilingüe (ES/EN), y estado de publicación.

**Edge Function `generate-blog-post`**: Ejecutada por cron 3x/día. Usa Gemini 2.5 Flash para generar artículos de ~1500 palabras con:
- Keywords SEO pre-definidos por categoría (seguridad IA, MCP, productividad, industrias)
- Geo-targeting (LATAM, España, global)
- Links internos a skills/conectores/plugins relevantes del catálogo
- Estructura optimizada (H2/H3, listas, FAQ schema markup)

**Frontend**:
- Sección en landing (`BlogSection`) mostrando los 3 artículos más recientes
- Página `/blog` con listado paginado y filtros por categoría
- Página `/blog/:slug` con artículo completo, SEO meta tags, JSON-LD Article schema
- Sidebar con skills relacionados del catálogo

### Tabla `blog_posts`

```sql
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  title_es text,
  excerpt text NOT NULL,
  excerpt_es text,
  content text NOT NULL,        -- markdown
  content_es text,
  meta_description text,
  meta_description_es text,
  keywords text[] DEFAULT '{}',
  category text DEFAULT 'security',  -- security, productivity, mcp, industry
  geo_target text DEFAULT 'global',  -- latam, spain, global
  related_skill_slugs text[] DEFAULT '{}',
  related_connector_slugs text[] DEFAULT '{}',
  cover_image_prompt text,      -- para generar con IA si se quiere
  status text DEFAULT 'published',
  reading_time_minutes int DEFAULT 5,
  view_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

RLS: lectura pública para `status = 'published'`, escritura solo service_role.

### Edge Function `generate-blog-post`

1. Consulta un pool de ~50 topic templates con keywords SEO rotativas
2. Verifica que no se repitan temas recientes (últimos 30 días)
3. Genera artículo con Gemini 2.5 Flash incluyendo:
   - Título optimizado para CTR
   - Meta description < 160 chars
   - Contenido con headers, listas, ejemplos prácticos
   - Links internos a `/skill/`, `/conector/`, `/plugin/` relevantes
   - FAQ section (para featured snippets de Google)
4. Genera versión en español e inglés
5. Inserta en `blog_posts` con status `published`

**Cron**: 3 ejecuciones diarias (09:00, 14:00, 19:00 UTC)

### Páginas Frontend

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| Landing section | `BlogSection` | 3 cards con últimos artículos |
| `/blog` | `Blog.tsx` | Listado paginado + filtros categoría |
| `/blog/:slug` | `BlogPost.tsx` | Artículo completo con SEO |

### SEO Features
- JSON-LD `Article` schema en cada post
- `og:type = article` meta tags
- Sitemap dinámico actualizado
- Internal linking automático al catálogo
- FAQ schema para featured snippets
- Breadcrumbs structured data

### Cambios

| Archivo | Cambio |
|---------|--------|
| DB migration | Crear tabla `blog_posts` |
| `supabase/functions/generate-blog-post/index.ts` | Edge function de generación |
| Cron job SQL | 3 ejecuciones diarias |
| `src/pages/Blog.tsx` | Listado de artículos |
| `src/pages/BlogPost.tsx` | Artículo individual |
| `src/components/landing/BlogSection.tsx` | Sección en landing |
| `src/pages/Index.tsx` | Agregar BlogSection |
| `src/App.tsx` | Rutas `/blog` y `/blog/:slug` |
| `src/i18n/es.ts` + `en.ts` | Traducciones |
| `src/lib/api.ts` | Funciones fetch blog |

