

## Plan: Nuevo tagline + decisión sobre navegación Skills/Conectores

### 1. Nuevo tagline

Cambiar el hero title de `"Tu expertise,\nescalado con IA."` a **`"Trabajá como un\nexperto en minutos."`** en `es.ts` y su equivalente en `en.ts` (`"Work like an\nexpert in minutes."`).

### 2. Skills y Conectores: ¿juntos o separados?

**Recomendación: mantenerlos separados, pero con cross-links visibles.**

Razones:
- **Son cosas distintas conceptualmente**: una skill es conocimiento que instalás, un conector es una herramienta que conectás. Mezclarlos en una grilla con un filtro tipo/conector agrega fricción cognitiva ("¿qué estoy mirando?").
- **El flujo de uso es diferente**: buscás una skill por lo que querés hacer → la instalás → te dice qué conector necesita. No al revés.
- **La confusión mata la conversión**: si un usuario nuevo llega a Explorar y ve cards de skills mezcladas con cards de conectores (que se ven distinto, tienen datos distintos), se pierde.

**Lo que sí tiene sentido agregar:**
- En `/explorar`, una **banner o sección chica** al final o arriba que diga "¿Tu skill necesita conectarse a herramientas? → Ver Conectores" con link a `/conectores`.
- En cada **card de skill** que tenga `required_mcps`, mostrar un **chip/badge** sutil con los conectores que usa (ej: "Gmail · GitHub") que linkee al conector.
- En `/conectores`, mostrar **"Skills que usan este conector"** (ya existe en el detalle).

### Cambios técnicos

| Cambio | Archivos |
|--------|----------|
| Actualizar hero title ES | `src/i18n/es.ts` |
| Actualizar hero title EN | `src/i18n/en.ts` |
| Agregar banner de cross-link en Explore | `src/pages/Explore.tsx` |

Son cambios menores de copy y un componente visual pequeño.

