

# Revision de la App -- Perspectiva multi-rol

## Resumen ejecutivo

Revisé la app navegando como distintos perfiles profesionales. La experiencia general es solida -- diseño limpio, navegacion clara, buen SEO. Pero hay **un bug critico** y varios puntos de mejora.

---

## BUG CRITICO: Packs por Rol vacios

**7 de 15 packs muestran "0 skills included"** porque los slugs en `skill_bundles` apuntan a skills que no existen en la DB o no estan `approved`.

Packs rotos (0 skills approved):
- **Marketer** (4 slugs tipo `anthropics/skills/...` -- no existen en DB)
- **Abogado** (3 slugs `anthropics/skills/...`)
- **Consultor** (4 slugs `anthropics/skills/...`)
- **Disenador** (4 slugs mixtos `anthropics/` y `vercel-labs/`)
- **Founder** (4 slugs mixtos)

Packs parcialmente rotos:
- **Medico** (3/6 approved)
- **Profesor** (4/6 approved)
- **Arquitecto** (1/6 approved -- y esta marcado como activo, deberia estar desactivado segun el plan)

Packs OK: DevOps (8/8), Data Analyst (8/8), Product Manager (7/8), Ventas (7/7), RRHH (6/8), Ingeniero (6/6), Productividad (6/8)

**Causa raiz**: Los slugs con formato `anthropics/skills/xxx` y `vercel-labs/skills/xxx` nunca fueron importados a la tabla `skills`. El plan de auditoria v3 los listaba pero la DB no los tiene.

**Fix propuesto**: 
1. Crear las skills faltantes en la DB (o reemplazar los slugs por skills reales que si existan)
2. Desactivar Arquitecto (`is_active = false`)
3. Validar que cada slug en `skill_bundles.skill_slugs` tenga correspondencia en `skills` con status `approved`

---

## Revision por Rol

### 1. Marketer (landing /para/marketer)
- Pagina vacia, 0 skills, boton "Install full pack" no hace nada util
- **Impacto**: Si llega trafico SEO o desde el wizard, rebota inmediatamente

### 2. DevOps (landing /para/devops)  
- Funciona perfecto: 8 skills, cards visibles, ZIP descargable
- Skills relevantes (Docker, Kubernetes, Terraform, AWS)

### 3. Usuario nuevo (landing /)
- Hero claro, marquee de categorias funciona bien
- "Find expertise for your work" lleva al explorador -- correcto
- Popular Skills muestra 6 skills curadas -- bien
- Mobile: se ve bien, responsive correcto

### 4. Explorador (/explorar)
- 35,910 skills, busqueda funciona, categorias scrolleables
- Buscar "marketing" devuelve 540 resultados -- relevantes
- Banner "New to Claude?" con link a getting started -- util

### 5. Skill Detail (/skill/docker-expert)
- Informacion completa: descripcion, install, ZIP, favoritos, repositorio
- Boton "Compartir" presente
- "What this skill does" muestra contenido truncado (podria expandirse)

### 6. Crear Skill (/crear-skill)
- Wizard conversacional funciona, primera pregunta clara
- UI de chat limpia con attachment y URL buttons

### 7. Conectores (/conectores)
- Grid limpio con iconos, badges "Official"/"Community"
- Busqueda presente

### 8. Teams (/teams)
- Pricing claro: Free / Pro $19 / Teams $79
- Pro dice "Coming soon" -- OK si es intencional

### 9. Primeros Pasos (/primeros-pasos)
- Guia completa, tabla de contenidos, bien estructurada
- Mobile: excelente

---

## Plan de correccion (priorizado)

### P0 -- Critico
1. **Arreglar los 7 packs rotos**: Reemplazar slugs `anthropics/skills/*` y `vercel-labs/skills/*` por skills reales que existan en la DB con status `approved`, o crear esas skills
2. **Desactivar pack Arquitecto**: `UPDATE skill_bundles SET is_active = false WHERE role_slug = 'arquitecto'`

### P1 -- Importante  
3. **Agregar validacion en `fetchBundle`**: Si un pack tiene 0 skills resueltas, mostrar un mensaje amigable en lugar de una pagina vacia con boton inutil
4. **Consistencia i18n**: La UI mezcla ingles y espanol (navbar dice "Skills"/"Connectors"/"Teams" pero el contenido esta en espanol). Revisar que el toggle EN/ES aplique consistentemente

### P2 -- Nice to have
5. **Skill detail truncado**: El campo "What this skill does" corta el texto con "...". Agregar "Read more" o expandir
6. **Empty state para packs**: Disenar un estado vacio elegante si un pack no tiene skills, en vez de mostrar "0 skills included" y un boton roto

