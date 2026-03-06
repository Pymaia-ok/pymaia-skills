

## Plan: Mejorar UX/UI del Navbar

### Problema
Todo está en una línea plana sin jerarquía visual: logo, 5 links de navegación, selector de idioma, "Publicar", nombre de usuario, y botón de logout — todo junto, mismo peso visual, difícil de escanear.

### Solución
Crear **3 zonas visuales claras** separadas por espaciado y jerarquía:

```text
[Logo]     [Nav principal]                    [Acciones usuario]
Pymaia     Skills · Conectores · Teams        🌐 ES  |  + Publicar  |  👤 Martin ▾
```

**Cambios concretos:**

1. **Reducir links principales a 3**: Sacar "Inicio" (el logo ya lleva a home) y "Primeros pasos" (moverlo al footer o a un dropdown). Dejar solo: **Skills**, **Conectores**, **Teams**.

2. **Separar visualmente** las 3 zonas con un `div` de navegación centrado y acciones a la derecha con un separador sutil (`border-l`).

3. **Mejorar "Publicar"**: Darle un estilo de botón outline/ghost con icono `Plus` para que se distinga de los links de navegación.

4. **Agrupar usuario**: Nombre + avatar inicial en un solo elemento clickeable que lleve a `/mis-skills` o perfil, con el logout como icono secundario más discreto.

5. **Selector de idioma**: Hacerlo más compacto, solo el ícono de globo con el código de idioma.

### Archivos a modificar
- `src/components/Navbar.tsx` — reestructurar layout, reducir links, separar zonas
- `src/components/landing/Footer.tsx` — agregar link a "Primeros pasos" si se quita del nav

