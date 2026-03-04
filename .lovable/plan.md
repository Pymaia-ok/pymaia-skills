

## Plan: Actualizar tagline y subtítulo del hero

### Cambios

1. **`src/i18n/es.ts`** — Actualizar:
   - `landing.heroTitle`: `"Potenciá tu trabajo\ncon Inteligencia Artificial."`
   - `landing.heroSubtitle`: `"Un directorio con miles de skills profesionales. Elegí uno, instalalo y tu IA se convierte en experta."`

2. **`src/i18n/en.ts`** — Traducción equivalente:
   - `landing.heroTitle`: `"Supercharge your work\nwith Artificial Intelligence."`
   - `landing.heroSubtitle`: `"A directory with thousands of professional skills. Pick one, install it, and your AI becomes an expert."`

3. **`src/hooks/useSEO.ts` / `src/pages/Index.tsx`** — Actualizar el `title` y `description` del SEO de la home para que coincida con el nuevo copy.

4. **`public/llms.txt`** — Actualizar la descripción principal para alinearse con el nuevo messaging.

No se tocan estilos ni estructura, solo copy.

