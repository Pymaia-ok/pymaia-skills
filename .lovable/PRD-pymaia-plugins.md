# PRD: Pymaia Plugin Platform

## Documento de Requerimientos de Producto

**Producto:** skills.pymaia.com - Evolucion incremental a Plugin Platform
**Fecha:** 2026-03-09
**Version:** 2.0
**Autor:** Equipo Pymaia

---

## 1. Contexto y problema

### Situacion actual
skills.pymaia.com ya cuenta con una base solida:
- **Catalogo de skills** con 35,930 skills, 6.7M+ favoritos, 19 categorias, validacion de seguridad
- **Seccion de Conectores (MCPs)** con listado curado, badges Oficial/Comunitario, metricas de descargas
- **Seccion de Plugins** con filtros Claude Code / Cowork, badges Anthropic Verified/Oficial, comando de instalacion copiable
- **Paginas de detalle** para skills (boton instalar, ZIP para Claude.ai, favoritos, link a repo) y plugins (comando install, descripcion)
- **Busqueda** semantica y acceso via MCP propio desde Claude
- **Creador de skills** por texto, screen recording y voz (actualmente no expuesto publicamente)
- **Onboarding** diferenciado para usuarios nuevos vs existentes de Claude Code

### Cambio en el ecosistema
En octubre 2025 Anthropic lanzo **Claude Code Plugins** como formato estandar de distribucion que agrupa skills, MCPs, slash commands, subagentes y hooks en un solo paquete instalable. En febrero 2026 lo expandio a Claude Cowork/Enterprise con plugins departamentales y un marketplace oficial con 9,000+ plugins.

**Implicacion clave:** El plugin es ahora la unidad de distribucion. Pymaia no necesita reinventarse, sino **evolucionar lo existente** para que los plugins sean el centro de la experiencia.

### Oportunidad
- El marketplace oficial de Anthropic es tecnico y orientado a developers
- No existe un creador de plugins accesible para usuarios no-tecnicos
- Hay espacio para un marketplace alternativo con mejor curacion, validacion y UX
- El mercado hispanohablante y LATAM no tiene un hub dedicado
- Pymaia ya tiene traccion (35K+ skills, millones de favoritos) como base

---

## 2. Vision del producto

Pymaia evoluciona de repositorio de skills a la **plataforma mas facil para crear, descubrir e instalar plugins de Claude**, construyendo sobre la base existente y diferenciandose del marketplace oficial por:
1. Creador de plugins accesible (texto, voz, screen recording) - evolucion del creador de skills actual
2. Validacion de seguridad y calidad superior
3. Marketplace curado con proceso de verificacion empresarial
4. UX optimizada para usuarios no-tecnicos, ya demostrada en el sitio actual

---

## 3. Auditoria del estado actual

### Lo que ya funciona bien (no tocar)

| Componente | Estado | Notas |
|-----------|--------|-------|
| Navegacion Skills / Conectores / Plugins | OK | Estructura de 3 secciones ya implementada |
| Seccion Plugins con filtros Code/Cowork | OK | Badges, metricas de descargas, busqueda |
| Seccion Conectores con badges | OK | Oficial/Comunitario, categorias, logos |
| Detalle de skills | OK | Instalar, ZIP, favoritos, repositorio |
| Home con onboarding diferenciado | OK | "Ya uso Claude Code" vs "Todavia no" |
| Comando de instalacion copiable en plugins | OK | `claude plugin install nombre@marketplace` |
| Busqueda semantica | OK | Reutilizable para plugins |
| MCP propio de Pymaia | OK | Base para F2.3 |

### Lo que necesita arreglo inmediato

| Problema | Impacto | Esfuerzo |
|---------|---------|----------|
| **Explorador de skills muestra "0 skills" y "No encontramos skills"** en categoria "Todas" | Critico - pagina principal del catalogo rota | Bug fix |
| **Creador de skills no accesible publicamente** (/crear da 404) | Alto - feature diferenciador invisible | Medio |

### Lo que necesita mejoras

| Componente | Mejora necesaria | Esfuerzo |
|-----------|-----------------|----------|
| Detalle de plugins | Mostrar que skills/MCPs incluye, changelog, reviews | Medio |
| Detalle de conectores | Pagina individual con instrucciones de config | Medio |
| Branding del sitio | "Pymaia Skills" en el logo deberia evolucionar a "Pymaia" o "Pymaia Plugins" | Bajo |

---

## 4. Objetivos y metricas

### Objetivos

| Objetivo | Horizonte |
|----------|-----------|
| Arreglar bugs criticos y mejoras de detalle | 2 semanas |
| Lanzar creador de plugins v1 (evolucion del creador de skills) | 6 semanas |
| Habilitar marketplace compatible con `/plugin marketplace add` | 10 semanas |
| Lanzar creador de plugins v2 (skill + MCP) | 16 semanas |
| Onboardear 10 empresas listando plugins validados | 20 semanas |

### Metricas clave (KPIs)

| Metrica | Baseline | Target 6 meses |
|---------|----------|-----------------|
| Plugins creados por usuarios | 0 | 500 |
| Plugins instalados (via marketplace) | 0 | 5,000 |
| Empresas con plugins verificados | 0 | 10 |
| Usuarios activos mensuales | Actual | 3x actual |
| Tasa de conversion visitante > creador | N/A | 15% |

---

## 5. Usuarios objetivo

### Persona 1: Creador no-tecnico
- Profesional que usa Claude diariamente
- Quiere empaquetar sus workflows como plugins compartibles
- No sabe escribir JSON ni configurar MCPs manualmente
- **Necesidad:** Crear un plugin describiendo lo que quiere por texto o voz

### Persona 2: Developer / Power user
- Crea plugins manualmente o con Claude Code
- Busca distribuir sus plugins a mas usuarios
- **Necesidad:** Marketplace con visibilidad, metricas de instalacion y proceso de publicacion simple

### Persona 3: Empresa / Proveedor SaaS
- Quiere que su producto sea accesible como plugin de Claude
- Necesita un canal de distribucion validado
- **Necesidad:** Proceso de verificacion, listing empresarial, analytics de adopcion

### Persona 4: Consumidor de plugins
- Usuario de Claude Code o Cowork que busca plugins utiles
- **Necesidad:** Descubrir, evaluar e instalar plugins con un click/comando

---

## 6. Funcionalidades por fase

### Fase 0: Fixes y mejoras sobre lo existente (semanas 1-2)

**Principio: No construir nada nuevo hasta que lo existente funcione perfecto.**

#### F0.1 - Fix del explorador de skills
- Arreglar bug que muestra "0 skills disponibles" en la categoria "Todas"
- Verificar que todas las categorias cargan correctamente
- Asegurar que la busqueda semantica funciona en todos los casos

#### F0.2 - Enriquecer detalle de plugins (sobre pagina existente)
La pagina actual muestra: nombre, badge, descripcion, comando install. Agregar:
- **Componentes incluidos:** Lista visual de skills, MCPs, commands y hooks que trae el plugin
- **README renderizado:** Mostrar el README.md del plugin como documentacion
- **Skills relacionados:** Cross-link a skills individuales que complementan el plugin
- **Conectores requeridos:** Si el plugin usa MCPs, listar que conectores necesita

#### F0.3 - Enriquecer detalle de conectores
La pagina actual es solo el listado. Agregar pagina de detalle individual:
- Instrucciones de instalacion/configuracion paso a paso
- Skills y plugins que lo usan
- Requisitos (API key, cuenta, etc.)

#### F0.4 - Exponer el creador de skills
- Hacer accesible publicamente el creador existente (actualmente 404 en /crear)
- Agregarlo como CTA visible en el nav o en la pagina de explorar skills
- Esto prepara el terreno para Fase 1

### Fase 1: Creador de plugins (semanas 3-8)

**Principio: Evolucionar el creador de skills existente, no construir de cero.**

#### F1.1 - Evolucion del creador: de skills a plugins
El creador actual genera skills (SKILL.md). Extenderlo para generar plugins completos:

**Cambio en el output:**
```
# Antes (creador actual)         # Despues (creador evolucionado)
mi-skill/                        mi-plugin/
└── SKILL.md                     ├── .claude-plugin/
                                 │   └── plugin.json
                                 ├── skills/
                                 │   └── mi-skill/
                                 │       └── SKILL.md
                                 └── README.md
```

**Lo que se agrega al flujo existente:**
- Paso adicional al final: "Queres publicar esto como plugin?" (Si/No)
- Si dice Si: genera automaticamente el plugin.json wrapper y README
- Preview del plugin generado antes de publicar
- Opcion de editar manualmente cualquier archivo
- Validacion contra el schema oficial de plugins

**Lo que NO cambia:**
- El input sigue siendo texto, voz o screen recording
- El motor de generacion de SKILL.md sigue igual
- La UX del creador se mantiene

#### F1.2 - Opcion "Convertir a plugin" en skills existentes
- En cada pagina de detalle de skill, agregar boton "Publicar como plugin"
- Genera el wrapper de plugin automaticamente sobre el skill existente
- El usuario solo confirma nombre y descripcion del plugin

#### F1.3 - Publicacion en un click
- Boton "Publicar" que sube el plugin al marketplace de Pymaia
- Validacion automatica de seguridad pre-publicacion (reutilizar validacion existente de skills)
- Generacion de comando de instalacion copiable
- El plugin aparece automaticamente en la seccion Plugins del sitio

### Fase 2: Marketplace nativo (semanas 9-12)

**Principio: Hacer que el catalogo actual funcione como marketplace de Claude Code.**

#### F2.1 - Repositorio Git compatible
Crear un repositorio Git que espeje el catalogo de plugins del sitio, compatible con `/plugin marketplace add`.

**Requisitos:**
- Estructura de directorio compatible con el formato de marketplace de Claude Code
- Los usuarios agregan Pymaia como fuente: `/plugin marketplace add pymaia/plugins`
- Cada plugin tiene su directorio con la estructura estandar
- Sync automatico: cuando se publica un plugin en el sitio, se pushea al repo
- Index actualizado automaticamente

**Esto no requiere cambios en el sitio web** - es una capa adicional de distribucion.

#### F2.2 - Mejoras al catalogo web existente
Sobre la pagina de plugins actual (que ya tiene busqueda, filtros Code/Cowork, badges), agregar:
- Filtro por tipo: skill-only, skill+MCP, workflow completo
- Reviews y ratings de usuarios
- Badge "Pymaia Verified" (ademas de los Anthropic Verified y Oficial existentes)
- Seccion "Creados por la comunidad" vs "Curados por Pymaia"

#### F2.3 - Actualizar MCP de Pymaia
El MCP actual permite buscar skills desde Claude. Extenderlo para plugins:
- Buscar plugins por descripcion natural
- Obtener comando de instalacion directamente
- Ver que componentes incluye un plugin
- Recomendar plugins basado en el contexto del usuario

### Fase 3: Creador avanzado con MCP (semanas 13-18)

**Principio: Solo llegar aca si Fase 1 valida la demanda del creador.**

#### F3.1 - Creador de plugins con MCP integrado
Para plugins que necesitan conectarse a APIs externas. Flujo guiado:

1. Usuario describe: "Quiero un plugin que consulte mi CRM"
2. Sistema pregunta: "Cual es la URL base de la API? Necesita autenticacion?"
3. Usuario proporciona URL y tipo de auth (API key, OAuth, etc.)
4. Sistema pregunta: "Que endpoints queres usar?" (o detecta via OpenAPI spec)
5. Genera plugin completo:

```
crm-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── consultar-crm/
│       └── SKILL.md
├── .mcp.json
├── src/
│   └── server.ts
├── package.json
└── README.md
```

**Requisitos:**
- Soporte para importar OpenAPI/Swagger specs
- Templates para patterns comunes: REST API, GraphQL, base de datos
- Generacion de servidor MCP funcional en TypeScript o Python
- Testing integrado: probar el MCP antes de publicar
- Manejo de secrets/credenciales seguro (no hardcodeadas)

#### F3.2 - Templates de plugins
Biblioteca de templates pre-armados accesibles desde el creador:

| Template | Incluye | Caso de uso |
|----------|---------|-------------|
| Skill simple | plugin.json + SKILL.md | Workflow de texto |
| API connector | plugin.json + SKILL.md + MCP server | Conectar a un SaaS |
| Workflow completo | plugin.json + skills + commands + MCP | Automatizacion end-to-end |
| Slash command | plugin.json + commands/ | Comando rapido |
| Subagente | plugin.json + agents/ + skills | Agente especializado |

### Fase 4: Programa empresarial (semanas 19-24)

**Principio: Solo lanzar con demanda validada (al menos 5 empresas interesadas).**

#### F4.1 - Portal de empresa
- Dashboard para empresas que listen sus plugins
- Analytics: instalaciones, uso, ratings, retention
- Gestion de versiones y actualizaciones
- Soporte para plugins privados (solo para clientes de la empresa)

#### F4.2 - Proceso de verificacion empresarial
Expandir el sistema de badges existente (ya tienen Oficial y Comunitario en conectores):

**Flujo:**
1. Empresa aplica con: datos de empresa, plugin(s) a listar, documentacion de API
2. Revision automatizada: estructura, seguridad, dependencias
3. Revision manual (Pymaia team): calidad, utilidad, compliance
4. Aprobacion y badge "Enterprise Verified"
5. Listing en seccion destacada del marketplace

**Criterios de verificacion:**
- Plugin sigue estructura estandar de Claude Code
- No contiene codigo malicioso ni data exfiltration
- MCPs manejan errores correctamente
- Documentacion clara y completa
- Auth/secrets manejados de forma segura
- Empresa tiene terminos de servicio y soporte

#### F4.3 - Modelo de monetizacion

| Tier | Precio | Incluye |
|------|--------|---------|
| Free | $0 | Listar hasta 3 plugins, badge basico, analytics limitado |
| Pro | $49/mes | Plugins ilimitados, badge "Verified", analytics completo, soporte prioritario |
| Enterprise | Custom | Plugins privados, API de distribucion, SLA, co-marketing |

---

## 7. Arquitectura tecnica

### Lo que ya existe (no tocar)

```
┌──────────────────────────────────────┐
│          skills.pymaia.com           │
├────────────┬───────────┬─────────────┤
│  Catalogo  │ Catalogo  │  Catalogo   │
│  Skills    │ Conectores│  Plugins    │
├────────────┴───────────┴─────────────┤
│           API Backend                │
├────────────┬─────────────────────────┤
│ Validacion │  Storage / DB           │
│ Seguridad  │                         │
├────────────┴─────────────────────────┤
│          Pymaia MCP Server           │
└──────────────────────────────────────┘
```

### Lo que se agrega (nuevos componentes)

```
┌──────────────────────────────────────┐
│          skills.pymaia.com           │
├────────────┬───────────┬─────────────┤
│  Catalogo  │ Catalogo  │  Catalogo   │
│  Skills    │ Conectores│  Plugins    │
├────────────┤           ├─────────────┤
│ ★ Creador  │           │ ★ Portal    │
│  Plugins   │           │  Empresa    │
├────────────┴───────────┴─────────────┤
│           API Backend                │
├────────┬───────────┬─────────────────┤
│Validac.│ ★ Plugin  │ ★ Plugin       │
│Segurid.│  Builder  │  Registry (Git)│
├────────┴───────────┴─────────────────┤
│     Pymaia MCP Server (ampliado)     │
└──────────────────┬───────────────────┘
                   │
          ┌────────┴────────┐
          │ Git repo publico│
          │ Compatible con  │
          │ /plugin market. │
          └─────────────────┘

★ = Componente nuevo
```

### Plugin Builder Pipeline (nuevo)
1. **Input Processing:** Reutilizar pipeline existente de texto/voz/screen recording
2. **Skill Generation:** Motor existente genera SKILL.md (sin cambios)
3. **Plugin Wrapping:** NUEVO - genera plugin.json y estructura de directorio
4. **Validation:** Extender validacion existente para verificar estructura de plugin
5. **Preview:** NUEVO - UI para ver/editar el plugin antes de publicar
6. **Publish:** NUEVO - push al catalogo web + sync al registry Git

---

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigacion |
|--------|---------|--------------|------------|
| Anthropic cambia formato de plugins | Alto | Media | Monitorear changelog oficial, mantener capa de abstraccion en el builder |
| Marketplace oficial absorbe la propuesta | Alto | Media | Diferenciarse por UX del creador y validacion, no solo por catalogo |
| Plugins generados con calidad baja | Medio | Alta | Validacion automatica estricta + review manual para featured |
| Baja adopcion del marketplace tercero | Alto | Media | Integracion MCP nativa + contenido exclusivo + comunidad hispana |
| Seguridad de MCPs generados (Fase 3) | Alto | Media | Sandbox de testing, scan de dependencias, review de permisos |
| Feature creep en el creador | Medio | Alta | Lanzar v1 solo como wrapper de skills > plugins. Iterar despues |

---

## 9. Lo que NO es parte de este PRD

- Rediseno del sitio web (la base actual es solida)
- Hosting de servidores MCP en runtime (los usuarios corren sus MCPs localmente)
- IDE propio o fork de Claude Code
- Creador de hooks (muy tecnico, poca demanda)
- Soporte para plataformas no-Claude (Codex, Gemini) en v1
- App mobile
- Migracion de tecnologia del backend/frontend actual

---

## 10. Dependencias externas

- **Anthropic Plugin Schema:** El formato de `plugin.json` y estructura de directorios depende de la especificacion oficial. Cualquier cambio requiere actualizacion.
- **Claude Code CLI:** La funcionalidad `/plugin marketplace add` debe seguir soportando marketplaces terceros.
- **Git hosting:** El registry necesita un repositorio Git publico accesible (GitHub o self-hosted).

---

## 11. Cronograma resumido

```
Semana  1-2   ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Fase 0: Fixes
Semana  3-8   ░░░░████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Fase 1: Creador plugins
Semana  9-12  ░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░  Fase 2: Marketplace
Semana 13-18  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████░░░░░░░░░░  Fase 3: Creador + MCP
Semana 19-24  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░░  Fase 4: Empresarial
```

### Gates de decision

| Gate | Momento | Criterio para continuar |
|------|---------|------------------------|
| **Gate 0** | Fin semana 2 | Explorador de skills funciona, detalle de plugins enriquecido, creador de skills accesible |
| **Gate 1** | Fin semana 8 | Creador genera plugins validos >90% de las veces. Al menos 50 plugins creados por usuarios beta |
| **Gate 2** | Fin semana 12 | Al menos 100 installs via `/plugin marketplace add pymaia`. MCP actualizado funcionando |
| **Gate 3** | Fin semana 18 | Creador con MCP genera plugins funcionales. Al menos 5 empresas interesadas en Fase 4 |

---

## 12. Resumen de approach

**No es un rebuild. Es evolucion incremental:**

| Lo que tienen | Lo que se agrega | Resultado |
|--------------|-----------------|-----------|
| Catalogo de 35K skills | Opcion "Convertir a plugin" | Skills se distribuyen como plugins |
| Creador de skills (texto/voz) | Paso extra de wrapping a plugin | Creador de plugins |
| Seccion Plugins con badges | Detalle enriquecido + reviews | Marketplace completo |
| Seccion Conectores con badges | Paginas de detalle individual | Catalogo de MCPs util |
| MCP de busqueda de skills | Soporte para plugins | MCP de descubrimiento completo |
| Validacion de seguridad | Validacion de estructura de plugins | Pipeline de calidad |
| Badges Oficial/Comunitario | Badge "Pymaia Verified" + "Enterprise" | Sistema de confianza |

**Cada fase construye sobre la anterior. Ninguna fase descarta lo existente.**

---

## 13. Landscape competitivo

### Marketplaces de plugins de Claude

| Competidor | URL | Tipo | Tamano | Diferenciador | Debilidad |
|-----------|-----|------|--------|---------------|-----------|
| **Anthropic Official** | github.com/anthropics/claude-plugins-official | Oficial | ~50 plugins curados | Confianza maxima, badge "Anthropic Verified", marketplace por defecto en Claude Code | Pocos plugins, curation bottleneck |
| **Build with Claude** | buildwithclaude.com | Community | 52 plugins, 115 skills, 117 subagents, 175 commands | Instalable como marketplace (`/plugin marketplace add`), amplia cobertura | Sin verificacion de calidad |
| **claudecodeplugins.io** | claudecodeplugins.io | Community | 1,342 skills en 315 plugins, 29 categorias | Integration packs (Supabase, Vercel, Sentry) | No tiene creador ni validacion |
| **claudemarketplaces.com** | claudemarketplaces.com | Agregador | Meta-directorio | Auto-descubre repos con marketplace.json diariamente | No tiene contenido propio |
| **claudecodemarketplace.com** | claudecodemarketplace.com | Community | Cientos de plugins | Web UI para browse | Problemas de conexion reportados |
| **kivilaid/plugin-marketplace** | github.com/kivilaid/plugin-marketplace | Community | 87 plugins de 10+ fuentes | Agrega oficial + community en un repo instalable | Agregacion puede ir atrasada |
| **awesome-claude-code-toolkit** | github.com/rohitg00/awesome-claude-code-toolkit | Community | 135 agents, 121 plugins, 42 commands, 35 skills | El toolkit mas completo en volumen | Lista curada, no marketplace instalable |
| **cc-marketplace** | github.com/ananddtyagi/cc-marketplace | Community | Commands + plugins | Sync automatico desde DB en vivo | Scope narrow (commands) |

### Directorios de MCPs

| Competidor | URL | Tipo | Tamano | Diferenciador | Debilidad |
|-----------|-----|------|--------|---------------|-----------|
| **Glama** | glama.ai/mcp/servers | Comercial | **18,448 servers** | Hosting one-click con Firecracker VMs, report cards seguridad, 50K+ usuarios | Solo MCPs, no plugins ni skills |
| **MCP.so** | mcp.so | Community | **18,284 servers** | Community-driven, submit via GitHub issue, catalogo enorme | Sin hosting, sin quality assessment |
| **PulseMCP** | pulsemcp.com | Comercial | **8,590+ servers** | Discovery automatizado diario, buen UX de busqueda | Menos infra que Glama/Smithery |
| **Smithery** | smithery.ai | Comercial | **~7,300+ servers** | OAuth managed, hosting local + remoto, buen CLI | Tuvo incidente de seguridad en 2025 |
| **Composio** | composio.dev | Comercial | 250-850+ SaaS | Un solo MCP server para 500+ apps, universal | Vendor lock-in, no es directorio |
| **Cline MCP Marketplace** | cline.bot/mcp-marketplace | Comercial | **~570+ servers** | One-click install en Cline, 4M+ devs | Cline-centric, no Claude Code nativo |
| **mcp.run** | mcp.run | Comercial | Registry | WebAssembly-based, SSO para MCP, gano hackathon Anthropic | Nicho tecnico |
| **OpenTools** | opentools.com | Comercial | Curado | API unificada, no necesitas API keys propias | Narrow, no exhaustivo |
| **MCP Registry (oficial)** | modelcontextprotocol.io | Oficial | Referencia | Fuente oficial del protocolo MCP (Linux Foundation) | Solo referencia, no hosting |

### Community repos en GitHub

| Repo | Tamano | Contenido |
|------|--------|-----------|
| punkpeye/awesome-mcp-servers | Stars altas | Lista curada de MCP servers, la mas referenciada del ecosistema |
| wong2/awesome-mcp-servers | Stars altas | Lista curada alternativa, bien mantenida |
| rohitg00/awesome-claude-code-toolkit | 135 agents, 121 plugins | Toolkit mas completo: agents, skills, commands, hooks, templates |
| jeremylongshore/claude-code-plugins-plus-skills | 270+ plugins, 739 skills | CCPI package manager, notebooks tutoriales |
| ccplugins/awesome-claude-code-plugins | Curado | Plugins + commands + hooks, guia para crear marketplace propio |
| alirezarezvani/claude-skills | 169 skills | Multi-plataforma (Claude, Codex, OpenClaw) |
| ComposioHQ/awesome-claude-plugins | Curado | Registry + Tool Router para 500+ SaaS |
| hesreallyhim/awesome-claude-code | Curado | Incluye Claude Hub (webhooks), session restore, claudekit |

### Posicionamiento de Pymaia

```
                    Facilidad de uso
                         ▲
                         │
          Pymaia ★       │      claudecodeplugins.io
          (creador +     │      (browse + install)
           validacion)   │
                         │
    ─────────────────────┼─────────────────────────► Amplitud
                         │
          mcp.run        │      Glama
          (nicho WASM)   │      (18K MCPs, hosting)
                         │
                         │      Anthropic Official
                         │      (pocos, ultra curados)
```

**Ventaja unica de Pymaia:** Unico marketplace con **creador integrado** (texto/voz/screen recording) + **validacion de seguridad** + **MCP de descubrimiento nativo**. Ningun competidor ofrece las 3 cosas juntas.

---

## 14. Fuentes confiables para agregar contenido

### Fuentes oficiales de Anthropic / Claude

| Fuente | URL | Que tiene | Como usarla |
|--------|-----|-----------|-------------|
| **claude-plugins-official** | github.com/anthropics/claude-plugins-official | Plugins oficiales + verificados por Anthropic (~50) | Sync directo diario, mostrar badge "Anthropic Verified" |
| **anthropics/claude-code/plugins** | github.com/anthropics/claude-code/tree/main/plugins | Plugins de ejemplo oficiales de Anthropic | Importar como referencia y contenido curado |
| **anthropics/life-sciences** | github.com/anthropics/life-sciences | MCP servers y skills para biotech/pharma (PubMed, BioRender, etc.) | Importar para categoria Salud/Medicina |
| **modelcontextprotocol/servers** | github.com/modelcontextprotocol/servers | MCP servers de referencia + lista extensa de community servers | Importar MCPs de referencia, cross-referenciar community |
| **MCP Registry oficial** | modelcontextprotocol.io | Catalogo oficial de MCP servers (Linux Foundation) | API de sync para mantener conectores actualizados |
| **claude.com/plugins** | claude.com/plugins | Marketplace web oficial de Anthropic | Referencia de contenido y badges |

### Fuentes community confiables para plugins (GitHub)

| Fuente | URL | Tamano | Confiabilidad | Formato | Estrategia |
|--------|-----|--------|---------------|---------|------------|
| **Build with Claude** | buildwithclaude.com | 52 plugins, 115 skills, 175 commands | Alta - marketplace instalable | marketplace.json | Sync directo, es formato compatible |
| **rohitg00/awesome-claude-code-toolkit** | github.com/rohitg00/awesome-claude-code-toolkit | 121 plugins, 135 agents, 42 commands | Alta - el mas completo | Markdown + dirs | Import selectivo de los mejor documentados |
| **ccplugins/awesome-claude-code-plugins** | github.com/ccplugins/awesome-claude-code-plugins | Curado, con guia marketplace | Alta - formato marketplace.json | JSON + Markdown | Import via marketplace.json |
| **jeremylongshore/claude-code-plugins-plus-skills** | github.com/jeremylongshore/claude-code-plugins-plus-skills | 270+ plugins, 739 skills | Media-Alta - CCPI manager | Directorio estandar | Import selectivo de top plugins |
| **alirezarezvani/claude-skills** | github.com/alirezarezvani/claude-skills | 169 skills multi-plataforma | Media-Alta | SKILL.md estandar | Import de skills unicos no existentes |
| **ComposioHQ/awesome-claude-plugins** | github.com/ComposioHQ/awesome-claude-plugins | Curado, Tool Router | Alta - empresa establecida | API + Markdown | Import de plugins con integraciones SaaS |
| **kivilaid/plugin-marketplace** | github.com/kivilaid/plugin-marketplace | 87 plugins de 10+ fuentes | Media-Alta - agrega multiples fuentes | Git repo | Referencia de que ya fue agregado |
| **hesreallyhim/awesome-claude-code** | github.com/hesreallyhim/awesome-claude-code | Skills, hooks, commands, plugins | Media | Markdown curado | Import de herramientas unicas (Claude Hub, etc.) |

### Fuentes community confiables para MCPs

| Fuente | URL | Tamano | Confiabilidad | Formato | Estrategia |
|--------|-----|--------|---------------|---------|------------|
| **punkpeye/awesome-mcp-servers** | github.com/punkpeye/awesome-mcp-servers | La mas referenciada del ecosistema | Alta - mantenida activamente | Markdown parseable | Import top 50 por stars |
| **wong2/awesome-mcp-servers** | github.com/wong2/awesome-mcp-servers | Segunda mas popular | Alta - bien mantenida | Markdown parseable | Cross-reference con punkpeye |

### Directorios de MCPs para importar conectores

| Fuente | URL | Tamano | API concreta | Estrategia |
|--------|-----|--------|-------------|------------|
| **MCP Registry oficial** | registry.modelcontextprotocol.io | Root catalog | REST API (OpenAPI 3.1), `/v0/servers`, paginacion cursor. **Disenado para aggregators** - poll 1x/hora recomendado | Fuente primaria de verdad. Sync automatico horario |
| **Glama** | glama.ai/mcp/servers | 18,448 servers | REST: `GET glama.ai/api/mcp/v1/servers/{owner}/{repo}` | Importar top 100-200 por popularidad (sort by 30-day usage) |
| **MCP.so** | mcp.so | 18,284 servers | Open source (Supabase + Next.js), submit via GitHub | Cross-reference, DB schema inspectable |
| **PulseMCP** | pulsemcp.com | 8,590+ servers | REST API: `pulsemcp.com/api`, JSON paginado con name, URL, stars, downloads. **Tiene MCP server propio** para queries | Excelente para sync. Co-construyo el registry oficial |
| **MCP Market** | mcpmarket.com | 8,617+ servers | Web, 23 categorias | Cross-reference por categoria |
| **Smithery** | smithery.ai | ~3,000 servers | REST API con bearer auth, busqueda semantica, incluye **security scanning** (tool poisoning, prompt injection) | Importar servers verificados + data de seguridad |
| **FastMCP.me** | fastmcp.me | 1,864 servers | Web con metricas de uso (views/installs) | Import servers con datos de adopcion real |
| **mcp.run** | mcp.run | Registry | Registry API, WebAssembly servlets | Importar servlets populares |
| **OpenTools** | opentools.com | Curado | REST: `api.opentools.com` (OpenAI-compatible) | Importar como conectores premium |

### Fuentes adicionales de skills

| Fuente | URL | Tamano | Notas |
|--------|-----|--------|-------|
| **SkillHub.club** | skillhub.club | 7,000+ skills | AI-evaluated, soporta Claude/Codex/Gemini, tiene playground |
| **ClaudeSkills.info** | claudeskills.info | Claims "largest" | Browse + download skills |
| **Skills Market (pawgrammer)** | skills.pawgrammer.com | 119+ skills | Free, community-curated |
| **awesome-claude-skills (travisvn)** | github.com/travisvn/awesome-claude-skills | Curado | Bien mantenido, info de token usage por skill |
| **awesome-claude-skills (ComposioHQ)** | github.com/ComposioHQ/awesome-claude-skills | Curado | Workflows y herramientas |

### Estrategia de ingesta de contenido

**Principio: No copiar todo. Curar e importar lo mejor.**

#### Plugins (prioridad alta)
1. **Sync automatico** con `claude-plugins-official` - todo lo que Anthropic publica aparece en Pymaia
2. **Import selectivo** de `ccplugins/awesome-claude-code-plugins` - los mejor rankeados
3. **Import manual** de plugins destacados de `jeremylongshore` y `alirezarezvani`
4. **Monitoreo** semanal de nuevos plugins en repos community

#### Conectores/MCPs (prioridad media)
1. **Sync** con `modelcontextprotocol/servers` para MCPs de referencia oficial
2. **Import** de los top 50 de Glama por popularidad (con atribucion)
3. **Import** de awesome-mcp-servers (punkpeye) los que tengan mas stars
4. **Validacion propia** antes de listar - correr scan de seguridad

#### Skills (prioridad baja - ya tienen 35K)
1. Mantener pipeline actual de creacion
2. Import selectivo de skills de repos community que no esten ya
3. Foco en **calidad sobre cantidad** - ya tienen volumen suficiente

#### Prioridad de sync por fuente (basado en API + confiabilidad + tamano)

| Prioridad | Fuente | API? | Items | Accion |
|-----------|--------|------|-------|--------|
| 1 | claude-plugins-official | marketplace.json (GitHub) | ~55 plugins | Sync diario automatico |
| 2 | MCP Registry oficial | REST API (OpenAPI 3.1) | Root catalog | Sync horario automatico |
| 3 | PulseMCP | REST API (JSON paginado) | 8,590+ MCPs | Sync diario, excelente metadata |
| 4 | Glama | REST API | 18,448 MCPs | Import top 200 por popularity |
| 5 | Smithery | REST API (auth) | ~3,000 MCPs | Import verificados + data seguridad |
| 6 | Build with Claude | marketplace.json | 52 plugins | Sync semanal |
| 7 | awesome-mcp-servers (punkpeye) | GitHub Markdown | Cientos MCPs | Scan semanal |
| 8 | awesome-claude-code-toolkit | GitHub Markdown | 121 plugins | Import selectivo mensual |

#### Automatizacion sugerida
```
Horario:   Sync MCP Registry oficial via API (disenado para esto)
Diario:    Sync claude-plugins-official (marketplace.json)
Diario:    Sync PulseMCP via API (metadata rica)
Semanal:   Scan awesome-mcp-servers repos > flag nuevos MCPs
Semanal:   Scan awesome-claude-code-plugins > flag nuevos plugins
Semanal:   Sync Build with Claude marketplace
Mensual:   Import top servers de Glama/Smithery via API
Mensual:   Review manual de SkillHub.club y FastMCP.me
Continuo:  Monitoreo de GitHub trending en topic "claude-code-plugin"
```

---

## 15. El MCP de Pymaia como ventaja estrategica

### Por que es importante
El MCP de Pymaia (el conector que permite buscar skills/plugins desde Claude) es posiblemente la **ventaja competitiva mas fuerte** de la plataforma:

- **Distribucion nativa:** Los usuarios no necesitan ir al sitio web. Consultan desde Claude directamente.
- **Descubrimiento contextual:** Claude puede recomendar plugins basado en lo que el usuario esta haciendo.
- **Lock-in positivo:** Una vez que el usuario instala el MCP de Pymaia, es su gateway permanente para descubrir contenido.
- **Ningun competidor tiene esto:** Glama, Smithery, claudecodeplugins.io - ninguno tiene un MCP que funcione como puerta de entrada desde Claude.

### Evolucion propuesta del MCP

| Capacidad actual | Mejora propuesta | Fase |
|-----------------|-----------------|------|
| Buscar skills | + Buscar plugins y conectores | Fase 0 |
| Recomendar skills | + Recomendar plugins basado en contexto | Fase 2 |
| Instalar skills | + Comando de instalacion de plugins | Fase 2 |
| - | + "Que plugin necesito para X?" (intent-based) | Fase 2 |
| - | + Alertas de nuevos plugins en categorias del usuario | Fase 3 |

### Metricas especificas del MCP

| Metrica | Target 6 meses |
|---------|----------------|
| Instalaciones del MCP de Pymaia | 5,000 |
| Queries al MCP por semana | 10,000 |
| Plugins instalados via MCP (vs via web) | 40% del total |
| Retention del MCP a 30 dias | 60% |

---

## 16. Estrategia de localizacion

### Espanol/LATAM como wedge estrategico

Todos los competidores son English-first. Pymaia ya esta en espanol. Esto no es un detalle menor:

- **35K+ skills ya en espanol** - contenido que no existe en ningun otro marketplace
- **Descripciones y UI en espanol** - barrera de entrada mas baja para LATAM
- **Argot local** (vos, pega, instala) - genera confianza y familiaridad

### Plan de localizacion

| Fase | Accion | Impacto |
|------|--------|---------|
| Actual | Sitio en espanol con toggle a EN | Cubre LATAM + global |
| Corto plazo | Skills generados por el creador en el idioma del usuario | Expansion natural |
| Medio plazo | Descripciones de plugins importados traducidas automaticamente | Catalogo bilingue |
| Largo plazo | Comunidad de creadores hispanos como diferenciador | Contenido exclusivo |

**No intentar competir globalmente en ingles contra Glama (18K MCPs) o Anthropic. Dominar el mercado hispano primero, expandir despues.**

---

## 17. User journeys

### Journey 1: Maria, consultora de marketing (Creadora no-tecnica)

```
1. Llega al home de Pymaia buscando "skills de marketing para Claude"
2. Explora la categoria Marketing, ve skills de SEO, email, ads
3. Instala 3 skills que le gustan
4. Despues de usarlos, quiere crear su propio workflow de auditoria
5. Va al Creador > describe por texto: "Quiero un skill que haga auditoria SEO completa"
6. El creador genera el skill + le pregunta si quiere publicarlo como plugin
7. Dice que si > preview > publica
8. Su plugin aparece en el marketplace con su nombre
9. Otros consultores lo instalan > ella gana visibilidad
```

### Journey 2: Lucas, developer (Power user)

```
1. Ya tiene plugins propios en un repo de GitHub
2. Busca donde distribuirlos para ganar visibilidad
3. Encuentra Pymaia via busqueda o recomendacion
4. Sube su plugin via el proceso de publicacion
5. Pymaia lo valida (seguridad + estructura)
6. Aparece en el marketplace con metricas de descargas
7. Lucas lo comparte con su audiencia > genera installs
8. Pymaia le ofrece badge "Pymaia Verified" si cumple criterios
```

### Journey 3: Sofia, usuaria de Claude Code (Consumidora)

```
1. Tiene el MCP de Pymaia instalado en Claude Code
2. Esta trabajando en un proyecto Next.js y le dice a Claude:
   "Necesito un plugin para deployar en Vercel"
3. El MCP de Pymaia busca y le sugiere: "Plugin Deploy Vercel (4.8★, 12K installs)"
4. Sofia dice "instalalo" > Claude corre el comando de instalacion
5. Listo, nunca salio de Claude Code
```

### Journey 4: CRM Corp, empresa SaaS (Proveedor)

```
1. CRM Corp quiere que sus usuarios usen Claude con su API
2. Encuentran el programa empresarial de Pymaia
3. Aplican con su plugin que incluye MCP + skills
4. Pymaia lo revisa: seguridad, calidad, documentacion
5. Lo aprueba con badge "Enterprise Verified"
6. Aparece en seccion destacada del marketplace
7. CRM Corp mide instalaciones y uso via el dashboard
```

---

## 18. Preguntas abiertas

1. **Creador actual:** Esta detras de login? Es funcional internamente? Que tan listo esta para exponerse?
2. **Bug de skills:** Es un bug de frontend o de backend/API? Afecta solo la categoria "Todas"?
3. **Pricing del marketplace:** Tier gratuito suficiente para traccion inicial? O freemium desde dia 1?
4. **Soporte multi-idioma:** Plugins con skills en multiples idiomas o un plugin por idioma?
5. **Versionado:** Como manejar actualizaciones de plugins ya instalados?
6. **Review manual:** Cuanto del proceso de validacion puede automatizarse vs. requiere equipo humano?
7. **Plugins de Cowork:** El filtro Code/Cowork ya existe. Hay contenido real de Cowork o es placeholder?
