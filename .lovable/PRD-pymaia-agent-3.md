# PRD: Pymaia Agent — AI Solutions Architect dentro de Claude

## Documento de Requerimientos de Producto

**Producto:** Pymaia Agent — De discovery a orquestacion inteligente
**Fecha:** 2026-03-09
**Version:** 1.0
**Autor:** Equipo Pymaia
**Complementa:** PRD-pymaia-plugins.md (Platform), PRD-pymaia-security.md (Security)

---

## 1. Contexto y oportunidad

### Lo que Pymaia tiene hoy

El MCP de Pymaia es una herramienta de **discovery** dentro de Claude:

```
Usuario: "Buscame un skill para cold email"
Pymaia MCP: [lista de 12 skills de cold email con ratings]
Usuario: *elige uno, lo instala manualmente, lo configura solo*
```

El valor es real pero limitado: es un buscador glorificado. El usuario debe:
1. Saber que necesita buscar
2. Saber que terminos usar
3. Evaluar las opciones solo
4. Instalar y configurar manualmente
5. Si necesita combinar tools, repetir 1-4 varias veces
6. Armar la integracion entre tools por su cuenta

### Lo que nadie hace hoy

No existe ningun producto que, dado un **objetivo de negocio**, recomiende la combinacion optima de skills + MCPs + plugins, guie la instalacion y configure un workflow funcional.

| Producto | Que hace | Que NO hace |
|----------|---------|-------------|
| **Pymaia MCP (hoy)** | Busca skills/MCPs/plugins por keyword | No entiende goals, no compone, no configura |
| **Anthropic Tool Search** | Lazy-loading de tools ya instalados | No descubre tools nuevos, no recomienda |
| **Composio/Rube** | Conecta AI a apps (Gmail, Slack, CRM) | No descubre tools de un catalogo, no recomienda combinaciones |
| **Nexla NOVA** | Orquesta MCPs en contexto enterprise/data | No tiene catalogo publico, no es para end-users |
| **n8n** | 5,800+ workflow templates pre-armados | No recomienda basado en goals, no usa skills/plugins de Claude |
| **Workato** | Automation enterprise con "Genies" pre-built | Cerrado, caro, no integra ecosistema Claude |
| **Toolhouse** | Tool management para AI agents | No tiene catalogo amplio, no compone |
| **Google AI Agent Marketplace** | Marketplace de agentes A2A | Agentes enterprise, no composicion de tools |

### La oportunidad

Pymaia tiene **3 assets unicos** que nadie mas combina:

1. **El catalogo mas grande**: 35K+ skills, miles de MCPs, cientos de plugins — ya indexados
2. **El punto de entrada**: Un MCP que ya vive dentro de Claude — acceso directo al usuario
3. **Trust scores**: Validacion de seguridad que permite recomendar con confianza (PRD-pymaia-security.md)

La evolucion natural: de **buscador** a **AI Solutions Architect** que entiende lo que queres lograr y te arma la solucion.

---

## 2. Vision del producto

**Pymaia Agent es un arquitecto de soluciones AI que vive dentro de Claude.** Dado un objetivo del usuario, Pymaia Agent:

1. **Entiende** el goal (no el keyword)
2. **Descompone** el goal en capacidades necesarias
3. **Busca** en su catalogo de 35K+ items los mejores tools para cada capacidad
4. **Compone** una solucion combinando skills + MCPs + plugins
5. **Evalua** la seguridad de la combinacion (Trust Scores)
6. **Guia** la instalacion paso a paso
7. **Configura** el workflow con instrucciones especificas
8. **Opcionalmente genera** un skill/plugin custom que orqueste todo

### Analogia

| Sin Pymaia Agent | Con Pymaia Agent |
|-------------------|-----------------|
| "Quiero renovar mi casa" → te dan un catalogo de Home Depot | "Quiero renovar mi casa" → un arquitecto te diseña el proyecto, elige los materiales, coordina los proveedores |
| Tu buscas, evaluas, compras, coordinas | El arquitecto conoce todo el catalogo y arma la solucion |

---

## 3. User journeys detallados

### Journey 1: Automatizar outbound sales

```
USUARIO: "Quiero automatizar mi outbound sales. Prospecteo en LinkedIn,
         enriquezco los leads y mando cold emails personalizados."

PYMAIA AGENT:
  [1. Entender goal]
  Goal detectado: Outbound sales automation
  Componentes necesarios:
    - Prospecting (LinkedIn)
    - Lead enrichment (email, company data)
    - Email personalization
    - Email sending + follow-up

  [2. Buscar en catalogo]
  Buscando en 35,930 skills, 2,400 MCPs, 890 plugins...

  [3. Recomendar solucion]
  "Para automatizar tu outbound, te recomiendo esta combinacion:

   OPCION A — Todo en uno (mas simple):
   > Plugin: 'Outbound Pro Suite' (Trust Score: 78/100, Verified)
   > Incluye: prospecting skill + email writer + Apollo MCP
   > Instalar: /plugin install outbound-pro-suite

   OPCION B — Mix personalizado (mas flexible):
   > 1. MCP: Apollo.io connector (Trust: 85, Official)
   >    → Para prospecting y enrichment
   > 2. Skill: 'Cold Email Personalization Engine' (Trust: 72, Trusted)
   >    → Genera emails personalizados basados en perfil del lead
   > 3. Skill: 'Follow-up Sequence Writer' (Trust: 68, Reviewed)
   >    → Crea secuencias de 3-5 follow-ups
   > 4. MCP: Resend email connector (Trust: 82, Official)
   >    → Para enviar los emails

   Te recomiendo Opcion B porque te da mas control sobre cada paso.
   Queres que te guie en la instalacion?"

USUARIO: "Dale, vamos con la B"

PYMAIA AGENT:
  [4. Guiar instalacion]
  "Perfecto. Paso 1 de 4:

   Instala el conector de Apollo.io:
   > /mcp install apollo-io-connector

   Nota: Este MCP requiere tu API key de Apollo.
   La podes conseguir en settings.apollo.io/api
   Una vez que la tengas, configura con:
   > APOLLO_API_KEY=tu_key_aqui

   Listo? Seguimos con el paso 2."

  [... guia cada instalacion ...]

  [5. Configurar workflow]
  "Todo instalado. Ahora te creo un skill custom que conecte todo:

   Este skill va a:
   1. Usar Apollo para buscar leads segun tu ICP
   2. Enriquecer cada lead con email y datos de empresa
   3. Generar cold email personalizado por lead
   4. Programar envio + follow-ups a 3 y 7 dias

   Lo genero como SKILL.md para que lo puedas editar?
   O preferis que lo arme como plugin completo?"
```

### Journey 2: Monitorear competidores

```
USUARIO: "Necesito monitorear que hacen mis competidores — sus cambios de
         pricing, nuevos features, y menciones en redes."

PYMAIA AGENT:
  [1. Entender goal]
  Goal detectado: Competitive intelligence monitoring
  Componentes:
    - Web scraping / change detection
    - Social media monitoring
    - Analysis / summarization
    - Alerting

  [2-3. Buscar y recomendar]
  "Para monitoreo de competidores necesitas:

   1. MCP: Firecrawl web scraper (Trust: 80, Verified)
      → Scrapea paginas de pricing y features periodicamente
   2. MCP: Twitter/X API connector (Trust: 75, Trusted)
      → Monitorea menciones y posts de competidores
   3. Skill: 'Competitive Analysis Summarizer' (Trust: 71, Reviewed)
      → Genera resumen semanal de cambios detectados
   4. Skill: 'Change Detection Reporter' (Trust: 66, Reviewed)
      → Compara snapshots y alerta sobre cambios

   Advertencia: El MCP de Firecrawl tiene acceso de red
   (Trust Score incluye esta evaluacion).

   Queres que lo configure?"
```

### Journey 3: Setup rapido para dev workflow

```
USUARIO: "Estoy arrancando un proyecto en Next.js con Supabase.
         Configurame las tools que necesito."

PYMAIA AGENT:
  "Para un proyecto Next.js + Supabase, te armo este kit:

   Esenciales (instalar ya):
   1. Plugin: 'Next.js Dev Kit' (Trust: 88, Official)
      → Includes: routing skill, component generator, testing commands
   2. MCP: Supabase connector (Trust: 85, Official)
      → Database, auth, storage access desde Claude
   3. Skill: 'Tailwind CSS Assistant' (Trust: 79, Verified)
      → Genera componentes con Tailwind

   Recomendados (instalar despues):
   4. MCP: Vercel connector (Trust: 82, Official)
      → Deploy desde Claude
   5. Skill: 'API Route Generator' (Trust: 70, Trusted)
      → Genera Next.js API routes con types

   Instalo los 3 esenciales ahora?"
```

### Journey 4: Usuario no tecnico

```
USUARIO: "Quiero que Claude me ayude con mi marketing de contenidos
         pero no se que tools necesito"

PYMAIA AGENT:
  "Te cuento que hay disponible para marketing de contenidos:

   Para empezar (sin configuracion tecnica):
   1. Skill: 'Content Calendar Planner' (Trust: 74)
      → Te ayuda a planificar contenido por semana/mes
   2. Skill: 'Blog Post Writer Pro' (Trust: 77)
      → Genera borradores basados en tu brief

   Si queres mas avanzado:
   3. MCP: Buffer/Hootsuite connector
      → Para publicar directo a redes desde Claude
   4. Plugin: 'SEO Content Suite'
      → Keyword research + optimizacion on-page

   Arrancamos con los 2 skills basicos? Son gratis
   y se instalan en 10 segundos."
```

### Journey 5: Descubrimiento por rol

```
USUARIO: "Soy product manager. Que me sirve tener instalado?"

PYMAIA AGENT:
  "Para PMs, las tools mas populares son:

   Top 5 por instalaciones entre PMs:
   1. 'PRD Generator' (Trust: 82) — 4,200 installs
   2. 'User Story Writer' (Trust: 79) — 3,800 installs
   3. 'Sprint Planning Assistant' (Trust: 76) — 2,900 installs
   4. 'Competitor Feature Matrix' (Trust: 71) — 2,100 installs
   5. 'Release Notes Drafter' (Trust: 73) — 1,800 installs

   Hay 340+ tools relevantes para PMs.
   Queres que te arme un kit personalizado basado en
   tu stack actual? (Decime que herramientas usas: Jira,
   Linear, Notion, etc.)"
```

---

## 4. Arquitectura del Pymaia Agent

### 4.1 Evolucion del MCP actual

```
HOY: Pymaia MCP (search-only)
  Tools disponibles:
    - search_skills(query) → lista
    - get_skill_details(slug) → detalle
    - search_connectors(query) → lista
    - search_plugins(query) → lista
    - list_popular_skills() → lista

FUTURO: Pymaia Agent MCP (orchestration)
  Tools existentes (mantener):
    - search_skills, get_skill_details, etc. (backward compatible)

  Nuevos tools:
    - solve_goal(description) → plan de solucion
    - get_recommendations(goal, context) → combinacion recomendada
    - generate_install_plan(items[]) → pasos de instalacion
    - generate_custom_skill(goal, tools[]) → SKILL.md generado
    - get_role_kit(role, stack[]) → kit personalizado
    - explain_tool_combination(items[]) → como se complementan
    - compare_solutions(optionA, optionB) → comparacion
```

### 4.2 Pipeline de orquestacion

```
                     +------------------+
                     |  USER GOAL       |
                     |  (natural lang)  |
                     +--------+---------+
                              |
                     +--------v---------+
                     | INTENT CLASSIFIER|
                     | Categoriza:      |
                     | - Domain         |
                     | - Complexity     |
                     | - Technical level|
                     | - Urgency        |
                     +--------+---------+
                              |
                     +--------v---------+
                     | GOAL DECOMPOSER  |
                     | Descompone en    |
                     | capabilities     |
                     | necesarias       |
                     +--------+---------+
                              |
                     +--------v---------+
                     | CATALOG SEARCH   |
                     | Semantic search  |
                     | en 35K+ items    |
                     | por capability   |
                     +--------+---------+
                              |
                     +--------v---------+
                     | SOLUTION COMPOSER|
                     | Combina mejores  |
                     | tools, evalua    |
                     | compatibilidad   |
                     +--------+---------+
                              |
                     +--------v---------+
                     | TRUST EVALUATOR  |
                     | Aplica Trust     |
                     | Scores, warnings |
                     | security checks  |
                     +--------+---------+
                              |
                     +--------v---------+
                     | RECOMMENDATION   |
                     | ENGINE           |
                     | Genera opciones  |
                     | A vs B vs C      |
                     +--------+---------+
                              |
              +---------------+----------------+
              |               |                |
     +--------v---+   +------v------+  +------v------+
     | INSTALL    |   | CUSTOM SKILL|  | WORKFLOW    |
     | GUIDE      |   | GENERATOR   |  | TEMPLATE    |
     | Paso a paso|   | SKILL.md /  |  | GENERATOR   |
     |            |   | plugin.json |  | Conecta todo|
     +------------+   +-------------+  +-------------+
```

### 4.3 Componentes detallados

#### Intent Classifier

Clasifica el goal del usuario en dimensiones:

| Dimension | Opciones | Ejemplo |
|-----------|----------|---------|
| **Domain** | Sales, Marketing, Engineering, Product, Design, Data, Support, Legal, Finance, HR, General | "outbound sales" → Sales |
| **Complexity** | Simple (1 tool), Medium (2-3 tools), Complex (4+ tools + workflow) | "outbound automation" → Complex |
| **Technical Level** | Non-technical, Semi-technical, Technical, Developer | Basado en vocabulario del usuario |
| **Action Type** | Automate, Monitor, Generate, Analyze, Connect, Build | "automatizar" → Automate |

Implementacion: Prompt engineering en el MCP response. No requiere modelo separado — Claude ya tiene el razonamiento.

#### Goal Decomposer

Transforma un goal abstracto en capabilities concretas:

```
Input: "Automatizar outbound sales"
Output:
  capabilities:
    - name: "Lead prospecting"
      type: data_source
      required: true
      keywords: ["prospecting", "lead generation", "LinkedIn", "Apollo"]
    - name: "Lead enrichment"
      type: data_enrichment
      required: true
      keywords: ["enrichment", "email finder", "company data"]
    - name: "Email personalization"
      type: content_generation
      required: true
      keywords: ["cold email", "personalization", "copywriting"]
    - name: "Email delivery"
      type: action_execution
      required: true
      keywords: ["email send", "SMTP", "Resend", "SendGrid"]
    - name: "Follow-up automation"
      type: workflow
      required: false
      keywords: ["follow-up", "sequence", "drip"]
```

Implementacion: Knowledge base de goal → capabilities mappings + LLM fallback para goals no mapeados.

#### Catalog Search (evolucion de search actual)

Mejoras sobre el search existente:

| Feature actual | Mejora |
|---------------|--------|
| Keyword search | **Semantic search** con embeddings |
| Busca por tipo (skill/MCP/plugin) | **Busca cross-type** por capability |
| Devuelve lista plana | Devuelve **agrupado por capability** |
| Sin context | **Context-aware**: sabe que otros tools ya recomendo |
| Sin ranking sofisticado | **Ranking compuesto**: Trust Score + relevance + compatibility |

#### Solution Composer

Combina los resultados de busqueda en una solucion coherente:

```python
# Pseudocode
def compose_solution(capabilities, search_results):
    solution = []
    for capability in capabilities:
        candidates = search_results[capability.name]

        # Filtrar por Trust Score minimo
        candidates = [c for c in candidates if c.trust_score >= 40]

        # Preferir plugins que cubren multiples capabilities
        multi_cap_plugins = find_multi_capability(candidates, capabilities)
        if multi_cap_plugins:
            solution.append({"type": "bundled", "item": multi_cap_plugins[0]})
            # Marcar capabilities cubiertas
            mark_covered(capabilities, multi_cap_plugins[0])
        else:
            # Mejor individual por Trust Score + relevance
            best = rank_by_composite(candidates)
            solution.append({"type": "individual", "item": best[0]})

    # Verificar compatibilidad entre items
    check_compatibility(solution)

    # Generar alternativas
    option_a = solution  # Recommended
    option_b = generate_alternative(capabilities, search_results)

    return [option_a, option_b]
```

Reglas de composicion:
- **No duplicar funcionalidad**: Si un plugin cubre 3 capabilities, no agregar skills individuales para las mismas
- **Preferir plugins sobre skills sueltos** cuando Trust Score es comparable (menos friccion de instalacion)
- **Preferir MCPs oficiales** sobre community para acciones criticas (email, payments, etc.)
- **Limitar a 5-6 tools max** por solucion — mas es overwhelming
- **Siempre ofrecer 2 opciones**: una simple (menos tools) y una avanzada (mas control)

#### Trust Evaluator

Integra con el sistema de seguridad (PRD-pymaia-security.md):

```
Para cada item en la solucion recomendada:
  1. Verificar Trust Score actual
  2. Verificar warnings activos
  3. Evaluar riesgo de la COMBINACION (no solo individual)
  4. Si algun item tiene Trust < 40: advertir explicitamente
  5. Si la combinacion incluye hooks + network access: warning adicional
  6. Si todo es Trust > 70: "Solucion verificada" badge
```

#### Custom Skill Generator

Opcionalmente, genera un SKILL.md o plugin.json que orqueste todos los tools recomendados:

```markdown
# Generated SKILL.md example

---
name: "Outbound Sales Automator"
description: "Orquesta Apollo + Cold Email Writer + Resend para outbound"
version: "1.0.0"
generated_by: "Pymaia Agent"
requires:
  - apollo-io-connector
  - resend-email-connector
---

## Instructions

When the user asks to run outbound:

1. Use Apollo MCP to search for leads matching their ICP criteria
2. For each lead, enrich with email and company data via Apollo
3. Generate personalized cold email using the lead's profile, company, and role
4. Send via Resend MCP with the user's configured sender
5. Schedule follow-up emails at day 3 and day 7 if no reply
6. Report results: leads contacted, emails sent, follow-ups scheduled
```

---

## 5. Modelo de datos

### 5.1 Goal Templates (knowledge base)

```json
{
  "goal_templates": [
    {
      "id": "outbound-sales",
      "domain": "sales",
      "triggers": ["outbound", "cold email", "prospecting", "lead gen", "SDR"],
      "capabilities": [
        {"name": "Lead prospecting", "type": "data_source", "required": true},
        {"name": "Lead enrichment", "type": "data_enrichment", "required": true},
        {"name": "Email writing", "type": "content_generation", "required": true},
        {"name": "Email delivery", "type": "action_execution", "required": true},
        {"name": "Follow-up", "type": "workflow", "required": false}
      ],
      "example_solutions": [
        {
          "name": "Apollo + Custom emails",
          "items": ["apollo-mcp", "cold-email-skill", "resend-mcp"]
        }
      ]
    },
    {
      "id": "content-marketing",
      "domain": "marketing",
      "triggers": ["content", "blog", "social media", "content calendar"],
      "capabilities": [
        {"name": "Content planning", "type": "planning", "required": true},
        {"name": "Content writing", "type": "content_generation", "required": true},
        {"name": "SEO optimization", "type": "analysis", "required": false},
        {"name": "Social publishing", "type": "action_execution", "required": false}
      ]
    },
    {
      "id": "competitive-intelligence",
      "domain": "strategy",
      "triggers": ["competidores", "competitive", "monitor", "benchmarking"],
      "capabilities": [
        {"name": "Web monitoring", "type": "data_source", "required": true},
        {"name": "Social listening", "type": "data_source", "required": false},
        {"name": "Analysis", "type": "analysis", "required": true},
        {"name": "Reporting", "type": "content_generation", "required": true}
      ]
    }
  ]
}
```

### 5.2 Compatibility Matrix

Define que tools trabajan bien juntos y cuales tienen conflictos:

```json
{
  "compatibility": [
    {
      "item_a": "apollo-mcp",
      "item_b": "cold-email-skill",
      "status": "recommended",
      "reason": "Apollo provides lead data that the skill uses for personalization"
    },
    {
      "item_a": "firecrawl-mcp",
      "item_b": "browserbase-mcp",
      "status": "redundant",
      "reason": "Both do web scraping — choose one"
    },
    {
      "item_a": "supabase-mcp",
      "item_b": "postgres-mcp",
      "status": "conflict",
      "reason": "Supabase already includes Postgres access"
    }
  ]
}
```

### 5.3 Role Kits

Pre-configurados para descubrimiento por rol:

```json
{
  "role_kits": {
    "product-manager": {
      "essential": ["prd-generator", "user-story-writer", "sprint-planner"],
      "recommended": ["competitor-matrix", "release-notes-drafter"],
      "stack_specific": {
        "jira": ["jira-mcp"],
        "linear": ["linear-mcp"],
        "notion": ["notion-mcp"]
      }
    },
    "frontend-developer": {
      "essential": ["react-component-gen", "tailwind-assistant", "testing-skill"],
      "recommended": ["a11y-checker", "perf-analyzer"],
      "stack_specific": {
        "nextjs": ["nextjs-dev-kit"],
        "vite": ["vite-plugin-suite"]
      }
    },
    "marketer": {
      "essential": ["content-calendar", "copywriter-pro", "seo-assistant"],
      "recommended": ["social-scheduler", "analytics-reporter"],
      "stack_specific": {
        "hubspot": ["hubspot-mcp"],
        "mailchimp": ["mailchimp-mcp"]
      }
    }
  }
}
```

---

## 6. Implementacion tecnica

### 6.1 Evolucion del MCP — Nuevos tools

Los tools nuevos se agregan al MCP existente sin romper backward compatibility:

#### Tool: `solve_goal`

```json
{
  "name": "solve_goal",
  "description": "Given a user's business goal, analyzes needs, searches the catalog, and returns a recommended solution combining skills, MCPs, and plugins with installation steps.",
  "input_schema": {
    "type": "object",
    "properties": {
      "goal": {
        "type": "string",
        "description": "The user's goal in natural language (e.g., 'automate outbound sales')"
      },
      "context": {
        "type": "object",
        "properties": {
          "role": {"type": "string", "description": "User's role (e.g., 'product manager')"},
          "stack": {"type": "array", "items": {"type": "string"}, "description": "Current tech stack"},
          "budget": {"type": "string", "enum": ["free-only", "paid-ok", "enterprise"]},
          "technical_level": {"type": "string", "enum": ["non-technical", "semi-technical", "technical", "developer"]}
        }
      }
    },
    "required": ["goal"]
  }
}
```

Response format:
```json
{
  "goal_understood": "Automatizar outbound sales con prospecting, enrichment y cold emails",
  "capabilities_needed": [
    {"name": "Lead prospecting", "required": true},
    {"name": "Lead enrichment", "required": true},
    {"name": "Email personalization", "required": true},
    {"name": "Email delivery", "required": true}
  ],
  "recommendations": [
    {
      "option": "A",
      "label": "Todo en uno (mas simple)",
      "items": [
        {
          "type": "plugin",
          "name": "Outbound Pro Suite",
          "slug": "outbound-pro-suite",
          "trust_score": 78,
          "badge": "verified",
          "covers": ["prospecting", "enrichment", "email"],
          "install_command": "/plugin install outbound-pro-suite",
          "warnings": []
        }
      ],
      "total_trust": 78,
      "complexity": "simple"
    },
    {
      "option": "B",
      "label": "Mix personalizado (mas flexible)",
      "items": [
        {"type": "mcp", "name": "Apollo.io", "trust_score": 85, "covers": ["prospecting", "enrichment"]},
        {"type": "skill", "name": "Cold Email Engine", "trust_score": 72, "covers": ["email"]},
        {"type": "mcp", "name": "Resend", "trust_score": 82, "covers": ["delivery"]}
      ],
      "total_trust": 79,
      "complexity": "medium"
    }
  ],
  "recommendation": "B",
  "reasoning": "Mas control sobre cada paso del proceso"
}
```

#### Tool: `get_role_kit`

```json
{
  "name": "get_role_kit",
  "description": "Returns a curated kit of recommended tools for a specific role, optionally filtered by tech stack.",
  "input_schema": {
    "type": "object",
    "properties": {
      "role": {"type": "string", "description": "Professional role"},
      "stack": {"type": "array", "items": {"type": "string"}, "description": "Tools/platforms currently used"}
    },
    "required": ["role"]
  }
}
```

#### Tool: `generate_custom_skill`

```json
{
  "name": "generate_custom_skill",
  "description": "Generates a SKILL.md or plugin.json that orchestrates multiple tools into a single workflow.",
  "input_schema": {
    "type": "object",
    "properties": {
      "goal": {"type": "string"},
      "tools": {"type": "array", "items": {"type": "string"}, "description": "Slugs of tools to orchestrate"},
      "output_format": {"type": "string", "enum": ["skill", "plugin"], "default": "skill"}
    },
    "required": ["goal", "tools"]
  }
}
```

#### Tool: `explain_combination`

```json
{
  "name": "explain_combination",
  "description": "Explains how multiple tools work together, their data flow, and potential issues.",
  "input_schema": {
    "type": "object",
    "properties": {
      "items": {"type": "array", "items": {"type": "string"}, "description": "Slugs of tools to explain"}
    },
    "required": ["items"]
  }
}
```

### 6.2 Backend: Semantic Search

El search actual es keyword-based. Para el Agent necesitamos semantic search:

| Aspecto | Hoy | Futuro |
|---------|-----|--------|
| Indexing | Keyword/tag based | Embedding vectors (OpenAI ada-002 o similar) |
| Query | Exact match + fuzzy | Semantic similarity + keyword boost |
| Cross-type | Busca por tipo separado | Busca across skills+MCPs+plugins |
| Ranking | Popularity | Composite: relevance + trust + popularity + recency |
| Context | Sin contexto | Goal-aware: "para outbound" filtra diferente que "para dev" |

Implementacion sugerida:
- **Vector DB**: Pinecone, Weaviate, o pgvector (si ya usan Postgres)
- **Embeddings**: text-embedding-3-small de OpenAI ($0.02/1M tokens) o Voyage AI
- **Indexar**: name + description + tags + category + README de cada item
- **Re-index**: Cada vez que se agrega/actualiza un item

### 6.3 Backend: Goal Templates Engine

```
/api/goals/match
  Input: { text: "automatizar outbound sales" }
  Output: {
    matched_template: "outbound-sales",
    confidence: 0.92,
    capabilities: [...],
    fallback: false
  }

Si confidence < 0.7:
  Fallback a LLM decomposition (mas lento, mas flexible)
```

Crecimiento de templates:
- **V1 launch**: 20-30 templates curados para goals comunes
- **V2**: 50-100 templates basados en usage data
- **V3**: Auto-generated templates basados en combinaciones exitosas de usuarios

### 6.4 Backend: Compatibility Engine

Datos que alimentan la compatibilidad:
1. **Manual curation**: El equipo define compatibilidades conocidas
2. **Co-installation data**: Si users frecuentemente instalan A + B juntos → son compatibles
3. **LLM analysis**: Analizar descriptions de tools para inferir compatibilidad
4. **User feedback**: "Esta combinacion funciono bien?" → refuerza compatibility score

---

## 7. Landscape competitivo detallado

### 7.1 Adjacentes directos

| Producto | Approach | Limitacion vs Pymaia Agent |
|----------|----------|---------------------------|
| **Composio Tool Router** | Ruta tool calls al integration correcto basado en intent | Solo routing de tools ya conectados, no descubre nuevos |
| **Nexla NOVA** | Orquesta MCPs con NLP para pipelines de datos | Enterprise-only, no tiene catalogo publico, data-focused |
| **n8n AI Agents** | Workflow templates pre-armados + builder | Templates estaticos, no recomienda basado en goals |
| **Workato Genies** | Agentes pre-built para tareas empresariales | Cerrado, pricing enterprise, no personalizable |
| **Toolhouse** | SDK para dar tools a AI agents | Developer-focused, no tiene catalogo para end-users |

### 7.2 Conceptos emergentes relevantes

| Concepto | Status | Relevancia para Pymaia |
|----------|--------|------------------------|
| **Anthropic Tool Search** | Production (Nov 2025) | Claude ya sabe hacer lazy-loading de tools. Pymaia Agent extiende esto al descubrimiento de tools NO instalados |
| **Google A2A Protocol** | Declining (donado a Linux Foundation) | Agent-to-agent commerce concept. Pymaia podria ser un "agent" que otros agents consultan |
| **Agentic AI Foundation (AAIF)** | Active (Linux Foundation, Anthropic + OpenAI + Block) | Standard emergente. Pymaia debe estar alineado |
| **Gorilla / BFCL** | Academic benchmark | Referencia para evaluar tool selection accuracy |
| **MCP Optimizer (Stacklok)** | Open source | Hybrid semantic+BM25 search. 94% accuracy vs 34% del Tool Search Tool nativo |

### 7.3 Posicionamiento unico de Pymaia

```
                    SCOPE DEL CATALOGO
                    (cuantos tools conoce)
                           |
                    35K+   | ← PYMAIA AGENT
                           |   (catalogo completo +
                           |    goal understanding +
                           |    composition)
                           |
                    1000+  |        ← n8n templates
                           |
                    100s   |   ← Composio    ← Workato
                           |
                    10s    |   ← Toolhouse
                           |
                    --------+--------------------------------
                            Search    Recommend    Orchestrate
                            only      + guide      + generate

                           PROFUNDIDAD DE ASISTENCIA
```

Pymaia Agent es **el unico en el cuadrante superior-derecho**: catalogo masivo + orquestacion inteligente.

---

## 8. Metricas y KPIs

### 8.1 Engagement

| Metrica | Descripcion | Target V1 | Target V2 |
|---------|-------------|-----------|-----------|
| Goals submitted | Veces que users usan solve_goal | 500/mes | 5,000/mes |
| Solution acceptance rate | % de recomendaciones donde user elige una opcion | > 40% | > 60% |
| Install completion rate | % de users que instalan al menos 1 tool recomendado | > 30% | > 50% |
| Full solution install rate | % que instalan TODOS los tools recomendados | > 15% | > 30% |
| Custom skill generation | Veces que users generan un skill/plugin custom | 50/mes | 500/mes |

### 8.2 Quality

| Metrica | Descripcion | Target V1 | Target V2 |
|---------|-------------|-----------|-----------|
| Recommendation relevance | Rating del user sobre la recomendacion (1-5) | > 3.5 | > 4.2 |
| Solution success rate | % de users que reportan que la solucion funciono | > 50% | > 70% |
| Trust Score accuracy | % de items recomendados sin security issues post-install | > 95% | > 99% |
| Goal template coverage | % de goals que matchean un template (vs LLM fallback) | > 60% | > 85% |

### 8.3 Business

| Metrica | Descripcion | Target V1 | Target V2 |
|---------|-------------|-----------|-----------|
| MCP monthly active users | Users unicos que usan el MCP en Claude | Baseline +30% | Baseline +100% |
| Installs driven by Agent | % de todas las instalaciones que vienen de recomendaciones | > 10% | > 40% |
| Retention (7-day) | % de users que vuelven a usar el Agent en 7 dias | > 20% | > 40% |
| New tool discovery | % de installs de tools que el user nunca habria encontrado solo | Track | > 50% |

---

## 9. Monetizacion futura (opcional)

No es prioridad para V1, pero el Agent abre oportunidades:

| Modelo | Descripcion | Viabilidad |
|--------|-------------|------------|
| **Featured placement** | Publishers pagan por aparecer en recomendaciones | Media — requiere transparencia, puede erosionar confianza |
| **Premium kits** | Role kits curados con soporte → subscription | Alta — valor claro para teams |
| **Enterprise orchestration** | Custom goal templates + private catalog para empresas | Alta — upsell natural |
| **Affiliate / referral** | Commission por installs de MCPs pagos (Apollo, etc.) | Media — depende de partnerships |
| **Custom skill generation** | Genera plugins custom como servicio → per-generation fee | Baja (V1) → Alta (V3) |

Recomendacion: **Mantener V1 100% gratis.** Monetizar en V2+ con premium kits y enterprise.

---

## 10. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| Recomendaciones malas erosionan confianza | Alta (V1) | Alto | Empezar con goals bien cubiertos por templates, feedback loop rapido |
| Catalogo tiene gaps en ciertas areas | Media | Medio | Ser transparente: "No encontramos tools para X todavia" |
| Users esperan que todo funcione automaticamente | Alta | Medio | UX clara: Pymaia recomienda, el user instala y configura |
| Anthropic lanza algo similar nativo | Media | Alto | Moverse rapido, integrarse si lo lanzan, valor en el catalogo curado |
| Composicion de tools insegura | Media | Alto | Integrar Trust Evaluator (PRD-pymaia-security.md), warnings claros |
| Cost de LLM para decomposition alto | Baja | Bajo | Templates cubren 60-85% de goals, LLM solo como fallback |
| Goals demasiado ambiguos | Alta | Medio | Preguntas clarificadoras: "Que tipo de outbound? Email, LinkedIn, llamadas?" |
| Users no-tecnicos se frustran con instalacion | Media | Medio | Simplificar install flow, copiar-pegar commands, one-click cuando posible |

---

## 11. Fases de implementacion

### Fase 0 — Foundation (Semanas 1-4)

**Objetivo:** Semantic search funcional + primer tool de recommendations

- [ ] Implementar vector embeddings para el catalogo existente
- [ ] Crear indice semantico cross-type (skills + MCPs + plugins)
- [ ] Agregar tool `solve_goal` al MCP con logica basica
- [ ] 10 goal templates iniciales (outbound, content marketing, dev setup, competitive intel, customer support, data analysis, project management, design workflow, QA testing, reporting)
- [ ] Agregar tool `get_role_kit` con 5 roles iniciales
- [ ] Respuesta del Agent incluye install commands copiables

**Decision gate:** Los 10 templates generan recomendaciones relevantes en > 70% de los tests?

### Fase 1 — Smart Composition (Semanas 5-8)

**Objetivo:** Composicion inteligente de multiples tools

- [ ] Compatibility matrix v1 (50+ pares curados manualmente)
- [ ] Solution Composer: genera opciones A vs B
- [ ] Trust Score integration en recomendaciones
- [ ] Warnings de seguridad en combinaciones
- [ ] Tool `explain_combination` para que el user entienda como interactuan
- [ ] 20 goal templates adicionales basados en queries reales
- [ ] Feedback mechanism: "Esta recomendacion fue util?"

**Decision gate:** Solution acceptance rate > 40%?

### Fase 2 — Custom Generation (Semanas 9-12)

**Objetivo:** Genera skills/plugins custom que orquesten tools

- [ ] Tool `generate_custom_skill` funcional
- [ ] Genera SKILL.md valido que referencia los tools recomendados
- [ ] Genera plugin.json para combinaciones mas complejas
- [ ] Validacion de seguridad automatica del skill/plugin generado (via PRD-pymaia-security.md pipeline)
- [ ] Publicacion directa al catalogo si pasa validacion
- [ ] 50 goal templates totales

**Decision gate:** Custom skills generados funcionan correctamente en > 60% de los casos?

### Fase 3 — Intelligence (Semanas 13-18)

**Objetivo:** Aprendizaje y mejora continua

- [ ] Auto-generated goal templates basados en queries frecuentes
- [ ] Co-installation analysis para mejorar compatibility matrix
- [ ] Recommendation personalization basada en historial del user
- [ ] "Trending solutions" — goals populares con soluciones probadas
- [ ] A/B testing de diferentes composiciones para el mismo goal
- [ ] API publica para que terceros integren el recommendation engine

**Decision gate:** Solution success rate > 70%?

### Fase 4 — Platform (Semanas 19-24)

**Objetivo:** Pymaia Agent como plataforma

- [ ] Marketplace de goal templates (community puede crear templates)
- [ ] Enterprise custom catalogs (empresas agregan tools privados)
- [ ] Multi-agent: Pymaia Agent puede ser consultado por otros agents (A2A-compatible)
- [ ] Analytics dashboard: que goals son mas buscados, que tools mas recomendados
- [ ] Premium role kits con soporte
- [ ] Integracion con creators: el Skill Creator puede generar basado en recomendaciones del Agent

---

## 12. Relacion con los otros PRDs

```
PRD-pymaia-plugins.md          PRD-pymaia-security.md         PRD-pymaia-agent.md
(Platform)                     (Security)                     (Agent / este doc)

Catalogo de                    Trust Scores                   Recommendation
skills, MCPs,          ←------ Validacion    --------→        Engine
plugins                        Badges
                               Warnings                       Composition
Creador de                                                    Logic
skills/plugins         ←---------------------------------------------→
                               Pipeline de                    Custom Skill
Search basico          ←------ scanning      --------→        Generator
(hoy)                                                         (usa el pipeline)

Marketplace                                                   Install Guide
compatible             ←------                --------→        (genera commands
                                                               del marketplace)
```

Los 3 PRDs son complementarios:
- **Platform** provee el catalogo y la infraestructura
- **Security** provee la confianza para recomendar
- **Agent** provee la inteligencia para combinar y guiar

---

## 13. Open questions

| # | Pregunta | Impacto | Urgencia |
|---|----------|---------|----------|
| 1 | Cuanto del razonamiento debe hacer el MCP server vs Claude? | Arquitectura | Alta — define complejidad del backend |
| 2 | Ofrecemos install automatico (el MCP instala) o solo guiamos? | UX | Media — install automatico es mas riesgoso pero mejor UX |
| 3 | El Agent recomienda tools pagos? Como manejamos transparencia? | Trust | Media — afecta confianza si parece "ads" |
| 4 | Cuantos goal templates necesitamos para launch MVP? | Scope | Alta — 10? 20? 30? |
| 5 | El custom skill generator debe validarse antes de publicar? | Security | Alta — si, segun PRD Security, pero agrega friccion |
| 6 | Hacemos el Agent bilingue (ES/EN) desde el inicio? | Market | Media — LATAM es core market |
| 7 | Permitimos a publishers crear goal templates para sus tools? | Ecosystem | Baja — potencial de spam/bias |
| 8 | Como medimos "la solucion funciono"? Follow-up automatico? | Metricas | Media — critico para mejorar |

---

## 14. Referencias

### Productos y plataformas
- [Anthropic Tool Search Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) — Lazy-loading de tools en Claude
- [Composio / Rube.app](https://rube.app) — AI action execution platform
- [Nexla NOVA](https://nexla.com) — MCP orchestration enterprise platform
- [Toolhouse AI](https://toolhouse.ai) — Tool management SDK for AI agents
- [Google A2A Protocol](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) — Agent-to-agent protocol
- [Google AI Agent Marketplace](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade) — Marketplace de agentes en Google Cloud
- [Stacklok MCP Optimizer](https://dev.to/stacklok/stackloks-mcp-optimizer-vs-anthropics-tool-search-tool-a-head-to-head-comparison-2f32) — Hybrid semantic+BM25 tool search

### Benchmarks academicos
- [Berkeley Function Calling Leaderboard (BFCL) V4](https://gorilla.cs.berkeley.edu/leaderboard.html) — Tool selection accuracy benchmark
- [ToolACE (ICLR 2025)](https://arxiv.org/pdf/2409.00920) — Synthetic tool-learning data generation

### Frameworks y standards
- [Agentic AI Foundation (AAIF)](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents) — Linux Foundation, Anthropic + OpenAI + Block
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25) — Model Context Protocol official spec
