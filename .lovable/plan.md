

# Limpiar pending y optimizar rejected

## Situación actual
- **6 pending**: Todos son MCPs oficiales reales (Zapier, PayPal, Okta, Intercom, Shopify-Gemini, Adobe). Están pending porque el auto-discovery no les extrajo `install_command`.
- **977 rejected**: Mezcla legítima de repos muertos, placeholders sin GitHub/install, y falsos positivos. No se muestran al usuario (RLS filtra por `status = 'approved'`), pero ensucian la base.

## Plan

### 1. Aprobar los 6 pending oficiales
SQL migration para:
- **Zapier**: Ya tiene install command (`npx -y mcp-remote https://zapier.com/mcp`) → `approved`
- **PayPal, Okta, Intercom**: Buscar install commands en sus READMEs de GitHub y aprobar con datos reales
- **Shopify-Gemini, Adobe-generic**: Evaluar si son MCPs funcionales o repos auxiliares — aprobar o rechazar según corresponda

### 2. Purgar rejected sin valor
Eliminar (DELETE) los ~93 registros `curated` + `rejected` que son placeholders puros (sin `github_url` ni `install_command`). No aportan nada al catálogo ni al discovery pipeline.

### 3. Mejorar auto-approval en `discover-official-mcps`
Modificar la función para que al descubrir un repo, intente extraer el `install_command` del README automáticamente (regex para `npx`, `uvx`, `docker`, `mcp-remote` patterns) antes de insertar. Si lo encuentra → `approved` directo. Si no → `pending` pero con `readme_raw` poblado para que `generate-install-commands` lo procese después.

## Archivos a modificar
| Archivo | Cambio |
|---|---|
| DB migration | UPDATE 6 pending → approved con install commands; DELETE placeholders rejected sin valor |
| `supabase/functions/discover-official-mcps/index.ts` | Agregar extracción de install_command del README al descubrir repos |

