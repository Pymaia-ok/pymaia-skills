

# Plan: Pymaia Multi-Agent — Directorio Universal de Skills

## Objetivo
Transformar Pymaia de "directorio para Claude" a "directorio universal para todos los agentes AI compatibles con SKILL.md", mostrando instrucciones de instalación multi-agente y actualizando todo el copy/branding.

---

## Agentes soportados

| Agente | Instalación de Skills | Instalación MCP |
|--------|----------------------|-----------------|
| **Claude Code** | `claude skill add` / ZIP | `claude mcp add` |
| **Manus** | Upload ZIP / GitHub URL | N/A (usa MCP nativo) |
| **Cursor** | Copiar a `.cursor/skills/` | Settings → MCP |
| **Antigravity** | Copiar a `.antigravity/skills/` | Config JSON |
| **OpenClaw** | Copiar a `skills/` directorio | Config JSON |

---

## Cambios

### 1. Crear componente `MultiAgentInstall`
Nuevo componente reutilizable con tabs por agente (Claude Code, Claude.ai, Manus, Cursor, Antigravity, OpenClaw). Cada tab muestra las instrucciones de instalación específicas para ese agente. Se usa en las 3 páginas de detalle.

- **Skills**: Tab Claude Code (comando CLI), Tab Claude.ai (ZIP download), Tab Manus (ZIP + instrucciones GitHub), Tab Cursor/Antigravity/OpenClaw (copiar SKILL.md a carpeta)
- **Conectores (MCP)**: Tab Claude Code (CLI), Tab Cursor (JSON config), Tab Antigravity (JSON config), Tab OpenClaw (JSON config)
- **Plugins**: Tab Claude Code (comando plugin install), Tab otros (instrucciones genéricas)

### 2. Actualizar páginas de detalle

**`SkillDetail.tsx`**: Reemplazar los 2 botones actuales (instalar + ZIP) por el componente `MultiAgentInstall` con tabs.

**`ConectorDetail.tsx`**: Reemplazar sección de instalación (CLI + JSON) por `MultiAgentInstall` con tabs por cliente MCP.

**`PluginDetail.tsx`**: Agregar tabs multi-agente donde corresponda.

### 3. Actualizar copy y branding (i18n)

**`es.ts` y `en.ts`** — Cambios clave:
- Hero title: "Trabajá como un experto en minutos" → mantener (es agnóstico)
- Hero subtitle: "instalala en Claude" → "instalala en tu agente AI favorito"
- How it works step 2: "Claude Code" → "tu agente AI"
- How it works step 3: "Tu Claude" → "Tu agente AI"
- Landing badge: mantener "35,000+ skills profesionales"
- Agregar nuevo key `landing.multiAgentBadge`: "Compatible con Claude, Manus, Cursor y más"

### 4. Actualizar HeroSection
- Agregar badge/pill debajo del hero que diga "Compatible con Claude, Manus, Cursor, Antigravity y más"
- Terminal demo: cambiar `$ claude` por algo más genérico o agregar variación entre agentes

### 5. Actualizar archivos públicos

**`public/llms.txt`**: Cambiar "for Claude Code" → "for AI coding agents (Claude, Manus, Cursor, Antigravity, OpenClaw)"

**`public/.well-known/ai-plugin.json`**: Actualizar `description_for_human` para mencionar compatibilidad multi-agente

### 6. Actualizar SEO metadata
- `Index.tsx`, `Explore.tsx`: Cambiar descripciones de "for Claude Code" → "for AI agents"
- `PrimerosPasos.tsx`: Actualizar título y contenido para mencionar múltiples agentes

### 7. Actualizar DetailFAQ
Agregar FAQ: "¿Con qué agentes es compatible?" con respuesta listando todos los agentes soportados.

---

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/components/MultiAgentInstall.tsx` | **Crear** — componente de tabs multi-agente |
| `src/pages/SkillDetail.tsx` | Modificar — usar MultiAgentInstall |
| `src/pages/ConectorDetail.tsx` | Modificar — usar MultiAgentInstall |
| `src/pages/PluginDetail.tsx` | Modificar — usar MultiAgentInstall |
| `src/i18n/es.ts` | Modificar — actualizar copy multi-agente |
| `src/i18n/en.ts` | Modificar — actualizar copy multi-agente |
| `src/components/landing/HeroSection.tsx` | Modificar — badge multi-agente |
| `src/components/DetailFAQ.tsx` | Modificar — agregar FAQ de compatibilidad |
| `public/llms.txt` | Modificar — branding universal |
| `public/.well-known/ai-plugin.json` | Modificar — descripción multi-agente |
| `src/pages/Index.tsx` | Modificar — SEO meta |
| `src/pages/Explore.tsx` | Modificar — SEO meta |

No se requieren cambios en la base de datos.

