

# Heredar estrellas del repo padre + aprobar skills de czlonkowski

## Problema
- `sync-skill-stars` hace 1 llamada a la API de GitHub **por skill**, incluso cuando 10 skills apuntan al mismo repo. Desperdicia rate limit.
- 9,420 skills aprobadas tienen 0 estrellas porque la función no las alcanzó todavía.
- 650 sub-skills de monorepos muestran 0★ cuando su repo padre ya tiene miles.
- Las 5 skills pending de czlonkowski necesitan aprobación + mejores descripciones.

## Plan

### 1. Optimizar `sync-skill-stars` para deduplicar por repo
En vez de llamar a GitHub N veces por el mismo repo, agrupar skills por `github_url` base (owner/repo), hacer 1 sola llamada por repo, y actualizar todas las skills que comparten esa URL.

**Archivo:** `supabase/functions/sync-skill-stars/index.ts`
- Fetch batch de skills con `github_stars = 0` primero (priorizar los que faltan)
- Extraer repos únicos del batch
- 1 llamada a GitHub por repo único
- Update masivo a todas las skills con esa URL base
- Esto procesa ~80 repos únicos por ejecución en vez de ~80 skills individuales (mucho más eficiente)

### 2. Aprobar y mejorar las 5 skills pending de czlonkowski
Vía migración SQL directa:
- Aprobar las 5 skills pending
- Copiar las estrellas del repo padre (~3,400★)
- Generar descripciones de calidad basadas en el nombre de cada skill (en vez del auto-generado "N8n Code Python — AI agent skill from...")
- Rechazar los duplicados que ya existen con slugs sin prefijo

### 3. Fix masivo: propagar estrellas entre skills del mismo repo
Un UPDATE SQL que copie `github_stars` del registro que ya tiene estrellas a los que no, cuando comparten la misma `github_url` base. Esto corrige las 650+ skills inmediatamente sin esperar al cron.

## Archivos a modificar
| Archivo | Cambio |
|---|---|
| `supabase/functions/sync-skill-stars/index.ts` | Deduplicar llamadas por repo único, priorizar skills con 0★ |
| Migración SQL | Aprobar czlonkowski skills, propagar estrellas masivamente |

