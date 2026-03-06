

## Plan: Recategorizar skills existentes y restaurar todas las categorías

### Situación actual
- 38,699 skills aprobados en solo 10 categorías
- Las categorías eliminadas (Ventas, Producto, Finanzas, RRHH, Soporte, Salud, Educación, E-commerce, Operaciones) tienen **0 skills** porque nunca se categorizaron ahí
- Pero al analizar por keywords, hay suficiente contenido para poblarlas:

```text
Categoría        Skills potenciales
─────────────────────────────────────
Soporte          ~2,078
Operaciones      ~1,877
Educación        ~1,731
Ventas           ~1,019
Finanzas         ~998
Salud            ~900
Producto         ~820
E-commerce       ~799
RRHH             ~531
```

### Lo que haría

**1. Restaurar categorías en el UI** (`src/lib/api.ts`)

Volver a agregar las 9 categorías removidas a `SKILL_CATEGORIES`, quedando 19 en total.

**2. Recategorizar skills existentes vía SQL**

Ejecutar UPDATEs con las mismas regex de la tabla de arriba, priorizando las categorías más específicas primero (Salud, Educación, RRHH, E-commerce) para evitar que skills de nicho queden en categorías genéricas como "negocios" o "automatización".

El orden de prioridad sería:
1. Salud (más específico)
2. Educación
3. RRHH
4. E-commerce
5. Finanzas
6. Ventas
7. Producto
8. Soporte
9. Operaciones

**3. Actualizar `inferCategory` en sync-skills** (`supabase/functions/sync-skills/index.ts` y `supabase/functions/import-skills-csv/index.ts`)

Agregar las 9 nuevas categorías al motor de inferencia para que skills futuros se clasifiquen correctamente.

### Archivos a modificar
- `src/lib/api.ts` — restaurar las 9 categorías en `SKILL_CATEGORIES`
- `supabase/functions/sync-skills/index.ts` — agregar las 9 categorías a `inferCategory()`
- `supabase/functions/import-skills-csv/index.ts` — misma actualización de `inferCategory()`
- SQL data updates — recategorizar ~10K skills existentes

### Categorías que podrían quedar cortas
Todas tienen suficiente contenido (>500 skills). **Creatividad** es la única con solo 12 skills actualmente, pero no está en el scope de este cambio.

