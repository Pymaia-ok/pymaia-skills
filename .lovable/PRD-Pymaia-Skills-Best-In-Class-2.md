# PRD: Pymaia Skills — Best-in-Class Agent Skills Platform

> **Version:** 1.0
> **Fecha:** 12 de marzo de 2026
> **Autor:** Claude Opus 4.6 + Context Research
> **Status:** Draft para revision interna

---

## 1. Resumen Ejecutivo

Pymaia Skills opera el catalogo de herramientas para agentes de IA mas grande del mercado (**43,784 tools**: 36,533 skills, 6,843 MCPs, 408 plugins) con un AI Solutions Architect unico que resuelve goals de negocio. Sin embargo, el engagement es minimo (1 recomendacion con rating en 30 dias, 0 community templates aprobados) y la plataforma no ofrece un flujo de publicacion nativo desde el agente.

Este PRD define las funcionalidades necesarias para que Pymaia pase de ser un **directorio pasivo** a convertirse en el **sistema operativo de skills para agentes de IA** — best-in-class del mercado.

---

## 2. Contexto de Mercado

### 2.1 Competidores Directos

| Plataforma | Catalogo | Diferenciador | Debilidad |
|---|---|---|---|
| **ClawHub/OpenClaw** | ~13,729 skills | CLI nativa, versionado, rollback, curado | 12% skills maliciosos (incidente "ClawHavoc"), seguridad fragil |
| **SkillsMP** | 200,000+ skills | Crawlea GitHub automaticamente, amplio | Sin curado, calidad variable |
| **Skills.sh** | Alto | Soporte 18 agentes, tracking installs | Sin goal-solving, sin inteligencia |
| **Composio** | 250+ integraciones | Unified API layer, actions para agentes | Walled garden, no skills SKILL.md |
| **LobeHub** | Variable | WAL Protocol, proactive agents | Nicho, sin marketplace robusto |
| **Pymaia** | **43,784 tools** | AI Solutions Architect, A2A protocol, goal-solving | Bajo engagement, sin publish flow, sin trust layer |

### 2.2 Datos Criticos del Ecosistema

- El ecosistema de agent skills alcanzo **350K+ paquetes** en ~2 meses (npm tardo una decada en llegar ahi)
- **13.4%** de skills tienen problemas criticos de seguridad (estudio Snyk, 3,984 skills)
- **36.8%** tienen fallas de alguna severidad
- Empresas como Vercel, Stripe, Coinbase y Microsoft publicaron skills oficiales antes de Q1 2026
- Skills 2.0 de Anthropic introdujo evals, A/B testing, subagentes, hot reload y context fork

### 2.3 Oportunidad

Ningun competidor resuelve simultaneamente: **descubrimiento inteligente + verificacion de seguridad + publicacion desde el agente + evaluacion de calidad + monetizacion**. Pymaia tiene la base (catalogo mas grande + AI Architect) para ser el primero.

---

## 3. Vision del Producto

**Pymaia Skills es el sistema operativo donde los skills de IA se descubren, crean, verifican, publican, monetizan y evolucionan — todo sin salir del agente.**

### Pilares estrategicos:

1. **Trust & Safety** — Ser el marketplace mas seguro (el anti-ClawHavoc)
2. **Publish from Agent** — Flujo de publicacion nativo desde Claude Code / cualquier agente
3. **Quality Intelligence** — Evals automatizados y scoring de calidad
4. **Developer Economy** — Monetizacion para creadores de skills
5. **Engagement Flywheel** — De directorio pasivo a comunidad activa

---

## 4. Funcionalidades Requeridas

### 4.1 TRUST & SAFETY LAYER (P0 — Prioridad Maxima)

**Problema:** 13.4% de skills tienen vulnerabilidades criticas. ClawHub tuvo 1,184 skills maliciosos en un solo incidente. Pymaia indexa 36K+ skills sin verificacion profunda.

#### 4.1.1 Automated Security Scanner

```
Cada skill indexado pasa por:
├── Static Analysis
│   ├── Deteccion de exfiltracion de datos (API keys, SSH, wallets)
│   ├── Deteccion de command injection en shell hooks
│   ├── Analisis de URLs hardcodeadas (C2 servers, phishing)
│   └── Deteccion de ofuscacion sospechosa (base64, eval chains)
├── Dependency Audit
│   ├── Verificacion de required_mcps contra lista de MCPs conocidos
│   ├── Deteccion de paquetes "hallucinated" (paquetes npm/pip inventados por LLMs)
│   └── Supply chain risk scoring
└── Behavioral Sandbox
    ├── Ejecucion en sandbox aislado con monitoreo de syscalls
    ├── Network egress monitoring (a donde intenta conectarse)
    └── File access pattern analysis
```

**Output:** Trust Score 0-100 visible en cada skill del catalogo.

| Trust Score | Significado | Badge |
|---|---|---|
| 90-100 | Verificado manualmente + scan limpio | Verified |
| 70-89 | Scan automatizado limpio | Scanned |
| 40-69 | Scan con warnings menores | Caution |
| 0-39 | Riesgos detectados | Warning |

#### 4.1.2 Verified Publisher Program

- Verificacion de identidad del publisher (GitHub, email corporativo)
- Badge de "Verified Publisher" en el catalogo
- Publishers verificados obtienen fast-track en reviews
- Reportes de skills maliciosos con takedown en < 1 hora

#### 4.1.3 Community Reporting & Bounty

- Boton "Report Skill" en cada listing
- Bug bounty program para reporte de skills maliciosos ($50-$500 por reporte valido)
- Dashboard publico de seguridad con metricas de takedowns

**Metricas de exito:**
- 0 skills maliciosos activos por mas de 24 horas
- 100% de skills con Trust Score visible
- < 5% false positive rate en scanner

---

### 4.2 PUBLISH FROM AGENT (P0)

**Problema:** Hoy no existe un flujo para publicar un SKILL.md al directorio de Pymaia desde Claude Code. El camino es: crear skill → push a GitHub → esperar indexacion. Eso es friccion innecesaria.

#### 4.2.1 Nuevo Tool MCP: `publish_skill`

```yaml
Tool: publish_skill
Parameters:
  - skill_path: string        # Path local al SKILL.md
  - visibility: enum          # "public" | "unlisted" | "private"
  - category: string          # Categoria del directorio
  - pricing: enum             # "free" | "paid" | "freemium"
  - price_usd: number         # Si paid/freemium
  - changelog: string         # Descripcion de cambios (para updates)

Returns:
  - skill_url: string         # URL en el directorio
  - trust_score: number       # Score inicial del scanner
  - review_status: string     # "auto_approved" | "pending_review"
  - warnings: array           # Warnings del scanner
```

#### 4.2.2 Flujo de Publicacion

```
Usuario en Claude Code:
│
├── Crea skill con skill-creator de Anthropic (evals, A/B testing)
├── Usa Pymaia MCP suggest_for_skill_creation (evitar duplicados)
├── Skill listo y testeado localmente
│
├── "Publica este skill en Pymaia"
│   ├── Claude lee el SKILL.md
│   ├── Valida estructura (frontmatter, description, compatibility)
│   ├── Llama publish_skill via MCP
│   │   ├── Security scan automatico
│   │   ├── Duplicate detection (similarity search vs catalogo)
│   │   ├── Quality scoring (estructura, documentacion, evals incluidos)
│   │   └── Auto-categorization via AI
│   ├── Si trust_score >= 70 → auto_approved
│   ├── Si trust_score 40-69 → pending_review (manual, < 24h)
│   └── Si trust_score < 40 → rejected con explicacion detallada
│
└── Skill publicado y disponible en el directorio
```

#### 4.2.3 Nuevo Tool MCP: `update_skill`

```yaml
Tool: update_skill
Parameters:
  - skill_slug: string        # Slug del skill existente
  - skill_path: string        # Path al SKILL.md actualizado
  - changelog: string         # Que cambio
  - bump: enum                # "patch" | "minor" | "major"

Returns:
  - version: string           # Nueva version
  - diff_summary: string      # Resumen de cambios
  - breaking_changes: boolean # Si hay breaking changes
```

#### 4.2.4 Nuevo Tool MCP: `unpublish_skill`

```yaml
Tool: unpublish_skill
Parameters:
  - skill_slug: string
  - reason: string

Returns:
  - status: string
  - active_installs_warned: number  # Usuarios notificados
```

#### 4.2.5 Versionado Semantico

- Cada skill tiene versiones (1.0.0, 1.1.0, 2.0.0)
- Los usuarios pueden pinear versiones especificas
- Rollback automatico si nueva version baja trust score
- Changelog visible en el listing

**Metricas de exito:**
- > 50% de nuevos skills publicados via MCP (vs GitHub crawl)
- < 2 minutos de publish-to-live para skills auto-approved
- > 80% auto-approval rate

---

### 4.3 QUALITY INTELLIGENCE (P1)

**Problema:** No hay forma de saber si un skill realmente funciona bien antes de instalarlo. Installs y stars no son indicadores de calidad.

#### 4.3.1 Automated Eval System

Cada skill publicado (o en update) puede incluir evals:

```yaml
# Dentro del SKILL.md o como archivo companion eval.yaml
evals:
  - prompt: "Genera un reporte SEO para example.com"
    assertions:
      - type: contains
        value: "meta tags"
      - type: min_length
        value: 500
      - type: no_hallucination
        check: "URLs deben ser reales"
  - prompt: "Audita los ads de mi cuenta de Google"
    assertions:
      - type: structured_output
        schema: "audit_report"
      - type: execution_time
        max_seconds: 120
```

- Pymaia corre evals periodicamente (weekly) y publica resultados
- Skills que fallan evals pierden Trust Score
- Badge "Eval-Verified" para skills con 100% pass rate

#### 4.3.2 Quality Score Multidimensional

```
Quality Score (0-100) = weighted average de:
├── Trust Score (25%)        # Seguridad
├── Eval Pass Rate (25%)     # Funciona correctamente
├── User Satisfaction (20%)  # Ratings y reviews
├── Documentation (15%)      # Tiene description, examples, evals
└── Freshness (15%)          # Ultima actualizacion, compatibilidad con modelo actual
```

#### 4.3.3 Compatibility Matrix

- Testear skills contra multiples agentes (Claude Code, Gemini CLI, Codex, etc.)
- Badge por agente compatible verificado
- Alertas automaticas cuando un skill se rompe con nueva version de un agente

#### 4.3.4 Decay Detection

- Skills no actualizados en > 90 dias reciben flag "Potentially Stale"
- Skills que usan APIs deprecated reciben flag "Compatibility Risk"
- Notificacion automatica al publisher para actualizar

**Metricas de exito:**
- > 30% de skills con evals incluidos
- Quality Score visible en 100% de skills
- < 10% de skills instalados con Eval Pass Rate < 80%

---

### 4.4 DEVELOPER ECONOMY (P1)

**Problema:** No hay incentivo economico para crear skills de alta calidad. El mercado esta lleno de skills mediocres porque no hay reward por excelencia.

#### 4.4.1 Monetizacion para Creadores

```
Modelos de pricing:
├── Free                     # Gratis, open source
├── Freemium                 # Funcionalidad basica gratis, premium pagada
├── Paid                     # Pago unico o suscripcion
│   ├── Per-install          # $X por instalacion
│   ├── Subscription         # $X/mes por skill activo
│   └── Usage-based          # $X por ejecucion (para skills que consumen APIs)
└── Sponsored                # Empresas que patrocinan skills gratuitos
```

#### 4.4.2 Revenue Split

- **80/20 split**: 80% para el creador, 20% para Pymaia
- Payouts mensuales via Stripe Connect
- Dashboard de analytics para creadores:
  - Installs por dia/semana/mes
  - Revenue acumulado
  - Retention rate (cuantos usuarios mantienen el skill instalado)
  - Evals performance over time

#### 4.4.3 Creator Tiers

| Tier | Requisito | Beneficio |
|---|---|---|
| **Starter** | 1+ skill publicado | Listing basico, analytics basicos |
| **Builder** | 5+ skills, avg quality > 70 | Badge "Builder", priority review |
| **Expert** | 20+ skills, avg quality > 85 | Badge "Expert", featured listing, early access features |
| **Partner** | Invitacion + track record | Revenue share mejorado (85/15), co-marketing |

#### 4.4.4 Grants & Bounties

- "Skill Bounties" — Pymaia publica necesidades del mercado y ofrece bounties ($100-$5,000) para quien las resuelva
- "Enterprise Requests" — Empresas publican necesidades y pagan por skills custom
- "Maintenance Grants" — Compensacion para maintainers de skills populares (> 10K installs)

**Metricas de exito:**
- > 100 skills pagados en catalogo en 6 meses
- > $50K revenue distribuido a creadores en primer ano
- > 20% de skills de alta calidad (quality > 85) son pagados

---

### 4.5 ENGAGEMENT FLYWHEEL (P1)

**Problema:** Analytics muestran 1 recomendacion con rating en 30 dias y 0 community templates aprobados. El producto tiene funcionalidad pero no engagement.

#### 4.5.1 Onboarding Inteligente

Al primer uso del MCP, detectar el contexto del usuario y ofrecer:

```
Nuevo usuario detectado:
├── Analizar codebase actual (package.json, tech stack)
├── Analizar tools ya instalados
├── Generar "Starter Kit" personalizado
│   ├── "Detecte que usas Next.js + Supabase + Stripe"
│   ├── "Aqui tienes 5 skills recomendados para tu stack"
│   └── "Instala con un comando: npx skills add [bundle-url]"
└── Prompt para rating despues de primera ejecucion exitosa
```

#### 4.5.2 Smart Prompting for Ratings

- Despues de 3 ejecuciones exitosas de un skill → prompt no-intrusivo para rating
- Despues de resolver un goal con solve_goal → prompt para rating
- One-tap rating (1-5 estrellas) sin friccion

#### 4.5.3 Community Templates Mejorados

Expandir `submit_goal_template` con:

```yaml
Tool: submit_goal_template (enhanced)
Parameters:
  - ...existentes...
  - recommended_skills: array    # Skills que resuelven este goal
  - example_workflow: string     # Paso a paso de como se resuelve
  - difficulty: enum             # "beginner" | "intermediate" | "advanced"
  - estimated_time: string       # "5 min" | "30 min" | "2 hours"

# Auto-generado:
  - success_count: number        # Cuantas veces se uso exitosamente
  - avg_satisfaction: number     # Rating promedio de quienes lo usaron
```

#### 4.5.4 Skill Collections & Bundles

- "Stacks" curados por caso de uso: "SaaS Marketing Stack", "E-commerce Ops Stack"
- Instalacion one-click de bundles completos
- Community-created collections con upvotes

#### 4.5.5 Weekly Digest

- Email/notificacion semanal al usuario:
  - Nuevos skills relevantes para su stack
  - Updates de skills que tiene instalados
  - Trending goals de la semana
  - Security alerts si algun skill instalado baja de trust score

#### 4.5.6 Leaderboard & Recognition

- "Top Creators" mensual por calidad y popularidad
- "Skill of the Week" featured
- "Rising Stars" — skills nuevos con traccion rapida
- Contributor badges en el perfil

**Metricas de exito:**
- > 1,000 ratings por mes a los 6 meses
- > 50 community templates aprobados a los 3 meses
- > 30% de usuarios activos mensuales que instalan al menos 1 skill nuevo

---

### 4.6 ENHANCED AI SOLUTIONS ARCHITECT (P2)

**Problema:** El solve_goal actual genera recomendaciones estaticas. Puede ser mucho mas inteligente.

#### 4.6.1 Context-Aware Recommendations

```
solve_goal mejorado:
├── Input
│   ├── goal: string
│   ├── user_context (auto-detected):
│   │   ├── installed_skills: array
│   │   ├── tech_stack: object (from package.json, etc.)
│   │   ├── agent_platform: string (Claude Code, Gemini CLI, etc.)
│   │   ├── past_goals: array
│   │   └── company_size: string (si detectado)
│   └── constraints: object (budget, timeline, technical_level)
│
├── Processing
│   ├── Filtrar skills incompatibles con plataforma del usuario
│   ├── Priorizar skills con alto Quality Score
│   ├── Detectar conflictos con skills ya instalados
│   ├── Considerar historial de goals anteriores (progresion)
│   └── Cost estimation (si skills pagados involucrados)
│
└── Output (mejorado)
    ├── Option A: Simple (actual)
    ├── Option B: Flexible (actual)
    ├── NEW: Option C: Enterprise (si aplica)
    ├── NEW: Estimated cost (free/paid)
    ├── NEW: Implementation timeline
    ├── NEW: Prerequisite skills/tools
    └── NEW: "Others who solved this also used..."
```

#### 4.6.2 Conversational Goal Refinement

Si el goal es ambiguo, el MCP devuelve preguntas de clarificacion:

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "question": "What's your monthly ad spend?",
      "options": ["< $1K", "$1K-$10K", "$10K-$100K", "> $100K"],
      "impact": "Changes which ad management tools are recommended"
    }
  ]
}
```

#### 4.6.3 Post-Implementation Follow-up

```yaml
Tool: report_goal_outcome
Parameters:
  - goal_id: string
  - outcome: enum          # "success" | "partial" | "failed"
  - feedback: string       # Que funciono y que no
  - time_spent: string     # Cuanto tardo
  - would_recommend: boolean

# Esto alimenta el recommendation engine para mejorar futuras sugerencias
```

**Metricas de exito:**
- Avg satisfaction de solve_goal > 4.5/5
- > 40% de usuarios que reciben recomendacion la implementan
- > 25% de usuarios completan report_goal_outcome

---

### 4.7 ENTERPRISE FEATURES (P2)

**Problema:** Las empresas necesitan control, compliance y private skills.

#### 4.7.1 Private Skill Registry

- Empresas pueden publicar skills internos visibles solo para su organizacion
- SSO integration (Okta, Azure AD, Google Workspace)
- Approval workflows (skill debe ser aprobado por admin antes de disponibilizarse)
- Audit log de quien instalo que y cuando

#### 4.7.2 Policy Engine

```yaml
# Politica de ejemplo para una empresa
org_policy:
  allowed_trust_scores: ">= 70"
  blocked_categories: ["creatividad"]  # Solo skills de trabajo
  required_evals: true                  # Solo skills con evals verificados
  max_paid_spend_per_user: 50           # USD/mes
  auto_approve_verified_publishers: true
  mandatory_review_for:
    - skills con network access
    - skills con shell hooks
```

#### 4.7.3 Team Analytics

- Dashboard de uso por equipo
- Skills mas usados por departamento
- ROI estimado (tiempo ahorrado x costo de skill)
- Compliance status por skill

#### 4.7.4 SLA & Support

| Plan | Skills Privados | Soporte | SLA Uptime | Precio |
|---|---|---|---|---|
| **Team** | 50 | Email | 99.5% | $29/user/mes |
| **Business** | 500 | Chat + Email | 99.9% | $79/user/mes |
| **Enterprise** | Unlimited | Dedicado | 99.99% | Custom |

**Metricas de exito:**
- > 10 empresas en plan Team+ en 6 meses
- > $10K MRR de enterprise en primer ano
- 0 breaches de datos en skills privados

---

### 4.8 CROSS-AGENT INTEROPERABILITY (P2)

**Problema:** El mercado esta fragmentado entre Claude Code, Gemini CLI, Codex, y 30+ plataformas. Pymaia ya soporta A2A pero puede ir mas lejos.

#### 4.8.1 Universal Install Protocol

```bash
# Un solo comando que detecta el agente y adapta la instalacion
pymaia install seo-audit

# Detecta automaticamente:
# - Si es Claude Code → npx skills add ...
# - Si es Gemini CLI → gemini skill install ...
# - Si es Codex → codex plugin add ...
# - Si es otro → instrucciones manuales
```

#### 4.8.2 Compatibility CI

- Pipeline que testea cada skill contra los top 5 agentes
- Badges automaticos de compatibilidad
- Alertas cuando un agente lanza nueva version que rompe skills

#### 4.8.3 A2A Marketplace

- Otros agentes pueden consumir el catalogo de Pymaia via A2A
- API publica con rate limits generosos para free tier
- SDK para que otros marketplaces sindiquen skills de Pymaia

**Metricas de exito:**
- Skills testeados contra >= 3 agentes diferentes
- > 5 plataformas consumiendo API A2A
- > 20% de installs desde agentes no-Claude

---

## 5. Nuevos Tools MCP — Resumen Completo

### Publicacion & Gestion

| Tool | Descripcion | Prioridad |
|---|---|---|
| `publish_skill` | Publicar SKILL.md al directorio desde el agente | P0 |
| `update_skill` | Actualizar skill existente con versionado | P0 |
| `unpublish_skill` | Remover skill del directorio | P0 |
| `get_my_skills` | Listar skills publicados por el usuario | P0 |
| `get_skill_analytics` | Installs, ratings, revenue de un skill propio | P1 |

### Calidad & Trust

| Tool | Descripcion | Prioridad |
|---|---|---|
| `scan_skill` | Correr security scan en un SKILL.md local antes de publicar | P0 |
| `run_skill_evals` | Ejecutar evals de un skill y obtener resultados | P1 |
| `get_trust_report` | Reporte detallado de trust score de cualquier skill | P1 |
| `report_skill` | Reportar un skill como malicioso o broken | P1 |

### Engagement

| Tool | Descripcion | Prioridad |
|---|---|---|
| `rate_skill` | Dar rating 1-5 a un skill instalado | P1 |
| `get_personalized_feed` | Feed de skills recomendados basado en contexto | P1 |
| `install_bundle` | Instalar un collection/bundle de skills | P1 |
| `report_goal_outcome` | Reportar resultado de un goal resuelto | P2 |

### Enterprise

| Tool | Descripcion | Prioridad |
|---|---|---|
| `publish_private_skill` | Publicar a registry privado de la org | P2 |
| `get_org_policy` | Obtener politicas de skills de la organizacion | P2 |
| `get_team_analytics` | Dashboard de uso por equipo | P2 |

---

## 6. Arquitectura Tecnica (Alto Nivel)

```
┌─────────────────────────────────────────────────────────┐
│                    AGENTES (Clientes)                    │
│  Claude Code │ Gemini CLI │ Codex │ Otros (via A2A)     │
└──────────────────────┬──────────────────────────────────┘
                       │ MCP Protocol / A2A
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   PYMAIA API GATEWAY                     │
│  Rate Limiting │ Auth (API Key + OAuth) │ Routing       │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  DISCOVERY   │ │  PUBLISHING  │ │  TRUST & SAFETY  │
│  ENGINE      │ │  PIPELINE    │ │  ENGINE          │
│              │ │              │ │                  │
│ - Search     │ │ - Upload     │ │ - Static scan    │
│ - Solve Goal │ │ - Validate   │ │ - Sandbox exec   │
│ - Recommend  │ │ - Version    │ │ - Dependency     │
│ - Trending   │ │ - Distribute │ │   audit          │
│ - A2A        │ │ - Rollback   │ │ - Decay detect   │
└──────┬───────┘ └──────┬───────┘ └────────┬─────────┘
       │                │                   │
       └────────────────┼───────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                            │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Skill Store │  │ User/Org DB  │  │ Analytics DB  │  │
│  │ (Supabase)  │  │ (Supabase)   │  │ (ClickHouse)  │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Vector DB   │  │ Eval Results │  │ Billing       │  │
│  │ (Embeddings)│  │ (S3 + DB)    │  │ (Stripe)      │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Roadmap

### Phase 1: Trust & Publish (Q2 2026) — 8 semanas

| Semana | Entregable |
|---|---|
| 1-2 | Security scanner v1 (static analysis + dependency audit) |
| 3-4 | `publish_skill`, `update_skill`, `unpublish_skill` MCP tools |
| 5-6 | Trust Score en UI + Verified Publisher program |
| 7-8 | `scan_skill` MCP tool + community reporting |

**Outcome:** Cualquier usuario puede publicar un skill desde Claude Code y cada skill tiene un Trust Score visible.

### Phase 2: Quality & Engagement (Q3 2026) — 8 semanas

| Semana | Entregable |
|---|---|
| 1-2 | Automated eval system + `run_skill_evals` |
| 3-4 | Quality Score multidimensional en listings |
| 5-6 | `rate_skill`, smart prompting, personalized feed |
| 7-8 | Bundles/Collections, Weekly Digest, Leaderboard |

**Outcome:** Cada skill tiene Quality Score, usuarios dejan ratings activamente, engagement sube 10x.

### Phase 3: Economy & Enterprise (Q4 2026) — 10 semanas

| Semana | Entregable |
|---|---|
| 1-3 | Monetizacion (Stripe Connect, paid skills, creator dashboard) |
| 4-6 | Enterprise: private registry, SSO, policy engine |
| 7-8 | Creator tiers, grants & bounties system |
| 9-10 | Team analytics, SLA tiers |

**Outcome:** Creadores ganan dinero, empresas adoptan Pymaia con confianza.

### Phase 4: Interop & Scale (Q1 2027) — 8 semanas

| Semana | Entregable |
|---|---|
| 1-3 | Universal install protocol (multi-agent) |
| 4-5 | Compatibility CI (auto-test vs top 5 agentes) |
| 6-8 | A2A marketplace, public API v2, SDK |

**Outcome:** Pymaia es el hub central de skills para todo el ecosistema de agentes.

---

## 8. Metricas North Star

| Metrica | Actual | Target 6 meses | Target 12 meses |
|---|---|---|---|
| **Skills con Trust Score** | ~0% | 100% | 100% |
| **Skills publicados via MCP** | 0 | 500/mes | 2,000/mes |
| **Ratings por mes** | ~0 | 1,000 | 10,000 |
| **Community Templates aprobados** | 0 | 50 | 300 |
| **solve_goal satisfaction** | 4.0 (n=1) | 4.5 (n=500) | 4.7 (n=5,000) |
| **Paid skills en catalogo** | 0 | 100 | 500 |
| **Creator revenue distribuido** | $0 | $10K/mes | $50K/mes |
| **Enterprise customers** | 0 | 10 | 50 |
| **MAU (MCP tool calls)** | ~10 | 5,000 | 50,000 |
| **Skills maliciosos activos > 24h** | Desconocido | 0 | 0 |

---

## 9. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigacion |
|---|---|---|---|
| Skills maliciosos pasan el scanner | Critico | Media | Sandbox behavioral analysis + community reporting + bounty program |
| Baja adopcion de publish via MCP | Alto | Media | Onboarding contextual + "publish in 1 command" marketing |
| Creadores no quieren monetizar | Medio | Baja | Grants y bounties como incentivo inicial |
| ClawHub o SkillsMP copian features | Medio | Alta | Velocidad de ejecucion + Trust como moat |
| Agentes cambian formato de skills | Alto | Media | Abstraction layer + compatibility CI |
| Enterprise no confian en skills | Alto | Media | SOC2 compliance + private registry + audit logs |
| Fragmentacion del ecosistema | Alto | Alta | A2A protocol + universal install como puente |

---

## 10. Diferenciadores Competitivos Post-Implementacion

```
Pymaia (post-PRD)          vs          Competidores actuales
─────────────────────────────────────────────────────────────
AI Solutions Architect      │  Solo busqueda por keyword
Goal-based discovery        │  Browse-only catalogs
Trust Score en cada skill   │  Sin verificacion de seguridad
Publish from agent (MCP)    │  Solo via GitHub
Automated evals             │  Sin testing de calidad
Monetizacion para creadores │  Solo free/open source
Enterprise private registry │  Solo publico
A2A multi-agent support     │  Single-agent lock-in
Versionado + rollback       │  Sin version control (excepto ClawHub)
Quality Score multi-dim     │  Solo installs como metrica
```

---

## 11. Decision Log

| Decision | Alternativa considerada | Razon |
|---|---|---|
| Trust Score 0-100 | Pass/Fail binario | Granularidad permite al usuario decidir su tolerancia al riesgo |
| 80/20 revenue split | 70/30 como App Store | Atraer creadores con mejor split que la competencia |
| Auto-approve si score >= 70 | Review manual para todos | Velocidad de publicacion es critica para adopcion |
| MCP como canal de publish | Web UI como primary | Los usuarios estan en el agente, no en un browser |
| Supabase como data layer | PostgreSQL directo | Pymaia ya usa Supabase, consistency + auth built-in |

---

## Apendice A: User Stories Clave

1. **Como creador de skills**, quiero publicar mi skill desde Claude Code con un solo comando para que este disponible en minutos sin salir de mi flujo de trabajo.

2. **Como usuario de skills**, quiero ver un Trust Score y Quality Score antes de instalar para tomar decisiones informadas y no arriesgar mi sistema.

3. **Como Solutions Architect del equipo**, quiero un private registry con politicas para que solo skills verificados esten disponibles para mi organizacion.

4. **Como creador experto**, quiero monetizar mis skills de alta calidad para que mi trabajo sea sostenible y pueda dedicar tiempo a mantenerlos.

5. **Como usuario nuevo**, quiero que Pymaia detecte mi stack y me recomiende skills relevantes automaticamente para empezar rapido sin buscar manualmente.

6. **Como agente externo** (Gemini CLI), quiero consumir el catalogo de Pymaia via A2A para que mis usuarios accedan al catalogo mas grande sin cambiar de plataforma.

---

## Apendice B: Fuentes de Investigacion

- [Agent Skills Are the New npm: AI Package Manager Marketplace 2026](https://www.buildmvpfast.com/blog/agent-skills-npm-ai-package-manager-2026)
- [The 2026 Guide to AI Agent Builders — Composio](https://composio.dev/blog/best-ai-agent-builders-and-integrations)
- [Claude Code Skills 2.0 — Medium](https://medium.com/@richardhightower/claude-code-agent-skills-2-0-from-custom-instructions-to-programmable-agents-ab6e4563c176)
- [Anthropic Drops Claude Code Skills 2.0 — Geeky Gadgets](https://www.geeky-gadgets.com/anthropic-skill-creator/)
- [Claude Code 2.1.0 — VentureBeat](https://venturebeat.com/orchestration/claude-code-2-1-0-arrives-with-smoother-workflows-and-smarter-agents/)
- [Extend Claude with Skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Best ClawHub Skills for AI Agent Developers — Fast.io](https://fast.io/resources/best-clawhub-skills-ai-agent-developers/)
- Pymaia MCP Analytics (consulta directa, marzo 2026)
