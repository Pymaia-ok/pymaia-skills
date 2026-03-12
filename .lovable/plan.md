

## Estado Actual: alirezarezvani/claude-skills

**Repo**: 4,400+ stars, **177 skills** across 9 domains, v2.1.2
**En nuestra base**: Solo **13 skills** indexadas (todas apuntan a `github.com/alirezarezvani/claude-skills` sin path específico)

### Skills que ya tenemos (13):
| Slug | Display Name |
|------|-------------|
| aws-solution-architect | Aws Solution Architect |
| financial-analyst | Financial Analyst |
| information-security-manager-iso27001 | Information Security Manager Iso27001 |
| ms365-tenant-manager | Ms365 Tenant Manager |
| quality-manager-qmr | Quality Manager Qmr |
| sales-engineer | Sales Engineer |
| senior-frontend | Senior Frontend |
| senior-prompt-engineer | Senior Prompt Engineer |
| senior-qa | Senior Qa |
| social-media-analyzer | Social Media Analyzer |
| tdd-guide | Tdd Guide |
| tech-stack-evaluator | Tech Stack Evaluator |
| ui-design-system | Ui Design System |

### Lo que nos falta (~164 skills)

El repo organiza 177 skills en 9 dominios:

| Dominio | Skills | Ejemplos que nos faltan |
|---------|--------|------------------------|
| Engineering Core | 24 | senior-architect, senior-backend, devops, secops, ai-ml-engineer |
| Engineering POWERFUL | 25 | agent-designer, rag-architect, database-designer, mcp-builder, ci-cd-builder |
| Product | 12 | product-manager, ux-researcher, landing-page-generator, saas-scaffolder |
| Marketing | 43 | content-creator, seo-strategist, cro-optimizer, growth-hacker, demand-gen |
| Project Management | 6 | scrum-master, jira-expert, confluence-expert |
| Regulatory & QM | 12 | iso-13485, mdr-2017-745, fda-compliance, gdpr |
| C-Level Advisory | 28 | ceo-advisor, cto-advisor, cfo-advisor, cmo-advisor |
| Business & Growth | 4 | customer-success, revenue-ops, contracts-proposals |
| Finance | 2 | saas-metrics-coach (ya tenemos financial-analyst) |

### Por qué nos faltan

Nuestro pipeline `sync-skills` descubre skills via GitHub Topics y búsquedas de código. Este repo es un **monorepo** con 177 subdirectorios, cada uno con su `SKILL.md`. La búsqueda de GitHub solo devuelve el repo padre, no cada subdirectorio. Por eso indexamos solo ~13 que coincidieron por nombre.

### Plan: Importación directa del monorepo

**Approach**: Crear una acción específica en `sync-skills` (o un nuevo edge function) que recorra la API de GitHub para listar los subdirectorios del monorepo, descargue cada `SKILL.md`, y haga upsert en la tabla `skills`.

**Archivo a modificar**: `supabase/functions/sync-skills/index.ts`

1. **Nueva source `github-monorepo`**: Recibe un owner/repo como parámetro, usa la GitHub Trees API (`GET /repos/{owner}/{repo}/git/trees/main?recursive=1`) para listar todos los archivos `SKILL.md`
2. **Para cada SKILL.md encontrado**: Descarga el contenido raw, parsea el YAML frontmatter (name, description), y genera el slug basado en el nombre del directorio padre
3. **Upsert en `skills`**: Con `github_url` apuntando al subdirectorio específico (ej: `https://github.com/alirezarezvani/claude-skills/tree/main/engineering/agent-designer`), `install_command` con el path correcto, y `source: 'github-monorepo'`
4. **Ejecutar el batch en segmentos** de 20 skills por invocación (respetando el límite de 60s)
5. **Deduplicación**: Usar el slug como key de upsert, salteando los 13 existentes si ya tienen datos enriquecidos

### Alcance técnico

| Cambio | Detalle |
|--------|---------|
| `supabase/functions/sync-skills/index.ts` | Agregar source `github-monorepo` con lógica de tree traversal |
| Invocar manualmente o via cron | `?source=github-monorepo&repo=alirezarezvani/claude-skills` |
| Sin migración DB | Usa la tabla `skills` existente |

Esto nos traería **~164 skills nuevas de alta calidad** (4.4K stars, Tessl-validated, con Python tools y references) de un solo golpe.

