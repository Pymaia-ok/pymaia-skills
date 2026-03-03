

## Plan: Pre-cargar skills reales del ecosistema Agent Skills

### Contexto

Actualmente hay 12 skills ficticias en la DB. Vamos a reemplazarlas con ~30 skills reales extraídas de los directorios que compartiste (skills.sh, skillsmp.com, claude-plugins.dev). Estas son Agent Skills reales del ecosistema open-source basado en el estándar SKILL.md.

### Fuentes de datos usadas

Los directorios comparten el mismo ecosistema. Las skills más populares vienen de:
- **Anthropic** (anthropics/skills): frontend-design, pdf, docx, xlsx, pptx, mcp-builder, skill-creator, canvas-design, webapp-testing
- **Vercel** (vercel-labs): find-skills, react-best-practices, web-design-guidelines, agent-browser, composition-patterns
- **Obra** (obra/superpowers): brainstorming, systematic-debugging, test-driven-development, writing-plans
- **Marketing** (coreyhaines31/marketingskills): seo-audit, copywriting, content-strategy, marketing-psychology, social-content, pricing-strategy, email-sequence
- **Microsoft** (microsoft/github-copilot-for-azure): azure-ai, azure-deploy, azure-postgres
- **Otros populares**: remotion-best-practices, supabase-postgres-best-practices, better-auth-best-practices, ui-ux-pro-max, senior-architect, browser-use, expo/building-native-ui

### Cambios a implementar

#### 1. Eliminar las 12 skills ficticias actuales
Una operación DELETE para limpiar los datos de prueba (junto con reviews e installations asociadas).

#### 2. Insertar ~30 skills reales con datos verificados
Cada skill tendrá:
- `slug`: basado en el nombre real (ej: `frontend-design`)
- `display_name`: nombre real (ej: "Frontend Design")
- `tagline`: descripción corta real extraída de los directorios
- `description_human`: descripción más detallada
- `install_command`: comando real `npx skills add owner/repo/skill-name`
- `github_url`: URL real del repositorio (ej: `https://github.com/anthropics/skills`)
- `target_roles`: mapeados a los roles existentes del sistema (marketer, founder, consultor, abogado, disenador, otro)
- `industry`: categorías relevantes
- `install_count`: datos reales de skills.sh (redondeados)
- `avg_rating`: valores realistas (4.5-4.9)
- `status`: 'approved'
- `creator_id`: NULL (no tienen creador en nuestro sistema)

#### 3. Actualizar el archivo `src/data/skills.ts`
Actualizar los datos estáticos de fallback para que coincidan con las skills reales, en caso de que se usen como referencia.

### Skills seleccionadas (30)

| Skill | Autor | Installs | Rol target |
|---|---|---|---|
| Frontend Design | anthropics/skills | 117K | disenador, founder |
| Brainstorming | obra/superpowers | 38K | founder, consultor, otro |
| Systematic Debugging | obra/superpowers | 21K | founder, otro |
| PDF Toolkit | anthropics/skills | 26K | abogado, consultor |
| DOCX Creator | anthropics/skills | 20K | abogado, consultor, otro |
| XLSX Spreadsheets | anthropics/skills | 19K | consultor, marketer |
| PPTX Presentations | anthropics/skills | 22K | consultor, founder |
| MCP Builder | anthropics/skills | 15K | founder, otro |
| Skill Creator | anthropics/skills | 58K | founder, otro |
| Canvas Design | anthropics/skills | 13K | disenador |
| Webapp Testing | anthropics/skills | 17K | founder, otro |
| Find Skills | vercel-labs/skills | 388K | otro |
| React Best Practices | vercel-labs/agent-skills | 186K | disenador, founder |
| Web Design Guidelines | vercel-labs/agent-skills | 144K | disenador |
| Agent Browser | vercel-labs/agent-browser | 71K | founder, otro |
| SEO Audit | coreyhaines31/marketingskills | 31K | marketer |
| Copywriting | coreyhaines31/marketingskills | 24K | marketer, consultor |
| Content Strategy | coreyhaines31/marketingskills | 15K | marketer |
| Marketing Psychology | coreyhaines31/marketingskills | 18K | marketer |
| Social Content | coreyhaines31/marketingskills | 14K | marketer |
| Pricing Strategy | coreyhaines31/marketingskills | 13K | founder, consultor |
| Email Sequence | coreyhaines31/marketingskills | 11K | marketer |
| Remotion Best Practices | remotion-dev/skills | 122K | disenador, founder |
| Supabase Best Practices | supabase/agent-skills | 27K | founder, otro |
| Better Auth | better-auth/skills | 18K | founder, otro |
| UI/UX Pro Max | nextlevelbuilder | 45K | disenador |
| Senior Architect | alirezarezvani | 752 | consultor, founder |
| Browser Use | browser-use | 44K | founder, otro |
| Writing Plans | obra/superpowers | 19K | consultor, founder |
| Test Driven Development | obra/superpowers | 17K | founder, otro |

### Ejecución

Se usará el **insert tool** (no migraciones) para DELETE + INSERT ya que son operaciones de datos, no de esquema.

### Impacto en el frontend

No se necesitan cambios en el código del frontend: las páginas `/explorar` y `/skill/:slug` ya leen de la tabla `skills` via API. Los nuevos datos se mostrarán automáticamente.

