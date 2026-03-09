

# Corregir terminología: "Extensiones" → "Plugins"

## Hallazgo

Claude oficialmente usa **"Plugins"** en [claude.com/plugins](https://claude.com/plugins). La definición oficial es: *"Browse plugins that bundle tools, skills, and integrations for one-click installation."*

Nuestra página `/primeros-pasos` usa "Extensiones/Extensions" en 10+ lugares, lo cual no coincide con el branding oficial de Anthropic.

## Cambios en `src/pages/PrimerosPasos.tsx`

Reemplazar todas las referencias a "Extensiones"/"Extensions" por "Plugins":

1. **Tabla de contenidos** (línea 70): "Skills, Conectores y Extensiones" → "Skills, Conectores y Plugins" / "Skills, Connectors & Plugins"

2. **Section badge** (línea 368): "Extensiones" → "Plugins"

3. **Título de sección** (líneas 369-371): "Skills, Conectores y Extensiones" → "Skills, Conectores y Plugins"

4. **Tercer concepto** (líneas 403-411): Renombrar de "Extensión/Extension" a "Plugin" y actualizar la descripción para alinearse con la definición oficial: plugins son paquetes que combinan tools, skills e integraciones para instalación en un click.

5. **Resumen visual** (líneas 448-451): "🧩 Extensiones" → "🧩 Plugins" y actualizar el texto descriptivo.

6. **Comentario HTML** (línea 365): `Ecosistema de extensiones` → `Ecosistema de plugins`

## Actualización de contenido del tercer concepto

La descripción actual habla de "extensiones oficiales" genéricamente. La nueva debe reflejar la definición real de Anthropic:

- **ES**: "Los plugins son paquetes que combinan tools, skills e integraciones en una instalación de un click. Se instalan desde claude.com/plugins. Ejemplo: el plugin de Frontend Design combina skills de diseño con herramientas para generar código listo para producción."
- **EN**: "Plugins are packages that bundle tools, skills, and integrations for one-click installation. Install them from claude.com/plugins. Example: the Frontend Design plugin combines design skills with tools to generate production-ready code."

## También actualizar la memory

Actualizar la terminología en la memory `claude-terminology-standard-v2` para reflejar "Plugins" en vez de "Extensiones".

