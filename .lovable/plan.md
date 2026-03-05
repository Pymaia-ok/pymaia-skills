

## Problema

Con 16 categorías en una fila horizontal con `overflow-x-auto`, no hay indicación visual de que hay más opciones fuera de la vista. El usuario no sabe que puede scrollear.

## Opciones

1. **Fade gradient + flechas de scroll** — Agregar un degradado semitransparente en el borde derecho (y izquierdo cuando se scrollea) que indica que hay más contenido. Opcionalmente, flechas `<` `>` para navegar.

2. **Wrap en múltiples filas** — Cambiar de scroll horizontal a `flex-wrap` para que todas las categorías sean visibles. Puede ocupar más espacio vertical pero elimina el problema completamente.

3. **Dropdown/Select para categorías** — Reemplazar los chips por un `<Select>` cuando hay muchas opciones. Más compacto pero pierde la visibilidad directa.

## Recomendación: Opción 1 (Fade + flechas)

Es el patrón más usado en apps como Airbnb, YouTube, etc. Mantiene el diseño limpio en una línea y da la pista visual de que hay más.

### Cambios

**`src/pages/Explore.tsx`:**
- Envolver la fila de categorías en un contenedor `relative` con `overflow-hidden`
- Agregar gradientes CSS en los bordes izquierdo/derecho que aparecen/desaparecen según la posición de scroll
- Agregar botones `ChevronLeft`/`ChevronRight` sobre los gradientes para scroll programático
- Usar un `ref` + `onScroll` para detectar si hay contenido a la izquierda/derecha y mostrar/ocultar los indicadores

El resultado: los chips se ven igual, pero con flechas sutiles y un fade que indica claramente que hay más categorías disponibles.

