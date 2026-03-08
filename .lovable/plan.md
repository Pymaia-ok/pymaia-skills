

## Bundles por Rol + Landings de Marketing

### Concepto

Crear una tabla `skill_bundles` con colecciones curadas de 5-8 skills por rol profesional, y una nueva ruta `/para/:roleSlug` que funcione como landing page de marketing por rol (SEO-friendly, shareable, con CTA de instalación masiva).

### 1. Base de datos

**Nueva tabla `skill_bundles`:**
```sql
CREATE TABLE public.skill_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug text NOT NULL UNIQUE,        -- "marketer", "abogado", etc.
  title text NOT NULL,                    -- "Pack Marketer"
  title_es text,
  description text NOT NULL,
  description_es text,
  hero_emoji text DEFAULT '📦',
  skill_slugs text[] NOT NULL DEFAULT '{}', -- ordered list of skill slugs
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.skill_bundles ENABLE ROW LEVEL SECURITY;
-- Public read, admin write
CREATE POLICY "Anyone can view active bundles" ON public.skill_bundles FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage bundles" ON public.skill_bundles FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
```

Luego insertar datos iniciales con los 10 roles existentes, mapeando 5-6 skill slugs curados por rol (usando los mismos slugs que ya tiene `PopularSkills` + los del `taskFilters` del Wizard).

### 2. Nueva ruta `/para/:roleSlug`

**Archivo: `src/pages/RoleLanding.tsx`**

Landing page completa por rol con:
- Hero section personalizado con emoji + título del rol ("Skills para Marketers")
- Descripción del valor para ese rol
- Grid de skills del bundle con `SkillCard`
- Botón "Instalar todo" que genera un ZIP con todos los SKILL.md en una sola descarga (reutilizando JSZip)
- Botón secundario "Instalar una por una" que lleva a `/explorar?roles=marketer`
- Sección de "Otras profesiones" con links a las demás landings
- SEO completo: JSON-LD, meta description, canonical URL
- Footer reutilizado

**Registro de ruta en `App.tsx`:**
```
<Route path="/para/:roleSlug" element={<RoleLanding />} />
```

### 3. API helper

**En `src/lib/api.ts`**, agregar:
```typescript
export async function fetchBundle(roleSlug: string) {
  // 1. Fetch bundle metadata
  // 2. Fetch skills by slugs in skill_slugs array
  // Returns { bundle, skills }
}
```

### 4. Instalación masiva ("Instalar todo")

El botón "Instalar todo" genera un ZIP con la estructura:
```
pymaia-pack-marketer/
  ├── browser-use/SKILL.md
  ├── pdf-toolkit/SKILL.md
  └── ... (one folder per skill)
```

Reutiliza el patrón de JSZip de `SkillDetail.tsx`. Trackea una instalación por cada skill del bundle. Pasa por el email gate si el usuario no está logueado.

### 5. i18n

Agregar en `es.ts` y `en.ts`:
```
roleLanding: {
  heroPrefix: "Skills para",
  installAll: "Instalar todo el pack",
  installAllDesc: "Descargá un ZIP con todas las skills listas para Claude",
  browseIndividual: "Ver una por una",
  otherRoles: "Packs para otras profesiones",
  skillsIncluded: "skills incluidas",
}
```

### 6. Links de entrada

- Agregar links a `/para/{rol}` en el Wizard (paso de resultados: "Ver pack completo")
- Agregar sección "Packs por profesión" en la landing principal entre `PopularSkills` y `ConnectorsSection`
- Cada `RoleCard` del Wizard también podría linkar a `/para/{rol}`

### 7. SEO para marketing

Cada landing `/para/marketer` tendrá:
- Title: "Skills de IA para Marketers — Pymaia Skills"
- Meta description personalizada por rol
- JSON-LD `ItemList` con las skills del bundle
- Canonical URL: `https://pymaiaskills.lovable.app/para/marketer`
- Open Graph tags para compartir en redes

### Resumen de archivos

| Archivo | Acción |
|---|---|
| `supabase/migrations/...` | Crear tabla `skill_bundles` + datos iniciales |
| `src/pages/RoleLanding.tsx` | Nueva página (hero, grid, install-all, SEO) |
| `src/lib/api.ts` | `fetchBundle()` |
| `src/App.tsx` | Ruta `/para/:roleSlug` |
| `src/i18n/es.ts` + `en.ts` | Strings de `roleLanding` |
| `src/components/landing/BundlesSection.tsx` | Nuevo componente para landing principal |
| `src/pages/Index.tsx` | Incluir `BundlesSection` |
| `src/components/landing/WizardSection.tsx` | Link a pack en resultados |

