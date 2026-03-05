

## Plan: Evolucionar Pymaia Skills a plataforma integral de "expertise instalable"

### Visión

La misión es **"Convertir a cualquier profesional en experto con IA en 2 minutos"**, y la segunda cara de la moneda: **"Compartir tu conocimiento con miles de profesionales"**. Las Skills son conocimiento experto; los MCPs son las herramientas que las potencian. No se venden por separado sino como un ecosistema integrado.

### Cambios propuestos

#### 1. Repositorio de MCPs (nuevo)

Crear una sección `/conectores` (no "MCPs" -- lenguaje amigable) con un directorio de conectores/herramientas que las skills pueden usar.

- **Nueva tabla `mcp_servers`**: `id`, `name`, `slug`, `description`, `description_es`, `category` (gmail, github, slack, databases, etc.), `install_command`, `config_json`, `credentials_needed[]`, `docs_url`, `icon_url`, `install_count`, `status`.
- **Nueva página `/conectores`**: Directorio visual con cards, búsqueda, categorías (Comunicación, Datos, APIs, Desarrollo).
- **Detalle `/conector/:slug`**: Instrucciones de instalación, skills compatibles (join con `required_mcps`), qué credenciales necesita.
- **Enlace bidireccional**: En el detalle de skill, los MCPs requeridos linkan a `/conector/:slug`. En el detalle de conector, se listan las skills que lo usan.

#### 2. Actualizar copy/posicionamiento en toda la app

- **Hero**: Cambiar de "Potenciá tu trabajo con Inteligencia Artificial" a algo como **"Tu expertise, escalado con IA."** con subtítulo enfocado en resultados concretos, no en tecnología.
- **Badge del hero**: Cambiar "El directorio #1 de skills para Claude Code" por algo menos técnico como "Conocimiento experto para tu IA".
- **Navbar**: Renombrar "MCP" a "Conectores" (o "Herramientas"). Agregar el link a `/conectores`.
- **Ocultar jerga**: En toda la UI, reemplazar "Claude Code" por "tu IA" donde sea posible, excepto en la página de primeros pasos donde sí es necesario el nombre técnico.
- **CTA principal**: Orientar a resultados -- "Encontrá expertise para tu trabajo" en vez de "Explorar skills".

#### 3. SkillForge: integración de conectores al crear skills

- En el flujo de creación de skill (entrevista SkillChat), cuando el AI detecta que la skill necesita interactuar con herramientas externas (Gmail, Slack, APIs), sugerir automáticamente los conectores disponibles del repositorio.
- Al generar el `SKILL.md`, poblar automáticamente el campo `required_mcps` con los conectores elegidos, incluyendo instrucciones de instalación y credenciales.
- Esto permite crear skills "más completas que hagan cosas" como pedís.

#### 4. Navegación por rol/resultado (mejora Explore)

- Agregar tabs o filtros prominentes por rol ("Soy marketer", "Soy abogado") además de las categorías técnicas actuales.
- Mostrar en cada card de skill un badge con el tiempo ahorrado estimado (cuando esté disponible).

#### 5. Página MCP actual → Redireccionar

- La página `/mcp` actual (instrucciones del MCP Server de Pymaia) se mantiene pero se renombra en la nav como "Auto-recomendaciones" o se mueve a una subsección de `/primeros-pasos`.
- `/conectores` es la nueva sección principal.

### Resumen de cambios técnicos

| Cambio | Archivos afectados |
|--------|-------------------|
| Nueva tabla `mcp_servers` | Migración SQL |
| Nueva página `/conectores` + detalle | `src/pages/Conectores.tsx`, `src/pages/ConectorDetail.tsx`, `App.tsx` |
| Actualizar Navbar | `src/components/Navbar.tsx`, `es.ts`, `en.ts` |
| Actualizar Hero + landing copy | `es.ts`, `en.ts`, `HeroSection.tsx` |
| SkillForge: sugerencia de conectores | `skill-interviewer` edge function, `SkillChat.tsx` |
| Links bidireccionales skill↔conector | `SkillDetail.tsx`, `ConectorDetail.tsx` |
| Seed data de conectores populares | Migración SQL o edge function |

### Orden de implementación sugerido

1. Actualizar copy/posicionamiento (rápido, alto impacto)
2. Crear tabla y página de conectores
3. Enlace bidireccional skill↔conector
4. Integrar conectores en SkillForge
5. Reorganizar navegación por rol

