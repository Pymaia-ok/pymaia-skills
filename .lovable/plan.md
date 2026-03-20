

# Pivotear la landing a "Instalá Pymaia Skills"

## Concepto
Cambiar el mensaje central de "Explorá soluciones" a **"Instalá Pymaia Skills en tu agente y pedile lo que necesites"**. El producto es un MCP Server que se instala una vez y resuelve todo — no un catálogo que hay que navegar.

El install command ya existe: `claude mcp add pymaia-skills --transport http https://mcp.pymaia.com`

## Cambios

### 1. Hero — Nuevo mensaje y CTAs
**HeroSection.tsx**: 
- **Título**: "Instalá Pymaia Skills y tu IA hace el resto." / "Install Pymaia Skills and your AI does the rest."
- **Subtítulo**: "Un comando. 43,000+ soluciones. Solo pedile lo que necesitás." / "One command. 43,000+ solutions. Just ask for what you need."
- **CTA primario**: "Instalar Pymaia Skills" → link a `/conector/pymaia-skills` (donde ya está la página de instalación con MultiAgentInstall)
- **CTA secundario**: "Explorar soluciones" → link a `/explorar` (antes era "Ver cómo funciona")
- **Badge**: cambiar de "43,000+ Skills, MCPs y Plugins" a "El MCP Server #1 para profesionales"

### 2. Chat Demo — Reflejar el nuevo flujo
Cambiar los mensajes del chat demo para mostrar que Pymaia Skills ya está instalado y resuelve directo:
- User: "Necesito preparar un análisis competitivo para mañana"
- AI: "Pymaia Skills encontró 3 soluciones. Activé 'Competitive Intel Pro' — pedime el análisis cuando quieras."
- User: "Hacelo con datos del sector fintech en LATAM"
- AI: "Listo. Reporte con 8 competidores, pricing y gaps. Te lo dejo en formato ejecutivo."

### 3. HowItWorks — Simplificar a Install-first
Cambiar los 3 pasos:
1. **Instalá** — "Un comando en Claude, Cursor o tu agente favorito. 30 segundos."
2. **Pedí** — "Decile a tu IA qué necesitás. Pymaia Skills busca, verifica y activa la mejor solución."
3. **Listo** — "Tu asistente ya tiene conocimiento experto. Solo usalo."

### 4. FinalCTA — Mismo pivote
- CTA primario: "Instalar ahora" → `/conector/pymaia-skills`
- CTA secundario: "Explorar catálogo" → `/explorar`

### 5. McpBannerSection — Reforzar
Cambiar copy a ser más directo: "Un comando. Todo el poder." con CTA "Instalar Pymaia Skills".

### 6. TwoPathsSection — Ajustar path 1
- Path "Boost my team" ahora dice "Instalá y listo" con CTA a `/conector/pymaia-skills`
- Path "Create" se mantiene igual

### 7. i18n — Actualizar keys en es.ts y en.ts
Agregar/modificar las keys afectadas en ambos archivos de traducción para reflejar el nuevo messaging.

## Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/components/landing/HeroSection.tsx` | Nuevo título, subtítulo, CTAs, chat demo messages |
| `src/components/landing/HowItWorks.tsx` | 3 nuevos pasos install-first |
| `src/components/landing/FinalCTA.tsx` | CTA primario a instalar |
| `src/components/landing/McpBannerSection.tsx` | Copy reforzado |
| `src/components/landing/TwoPathsSection.tsx` | Path 1 redirige a instalar |
| `src/i18n/es.ts` | Todas las keys modificadas |
| `src/i18n/en.ts` | Todas las keys modificadas |

## Nota sobre entry points existentes
- `/explorar` ya tiene el banner de MCP + link a primeros pasos ✅
- `/conector/pymaia-skills` ya tiene la página de instalación completa con MultiAgentInstall ✅
- No hace falta crear páginas nuevas, solo redirigir el flujo

