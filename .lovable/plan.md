

## Plan: Importar los 3 repos faltantes al catálogo

### Contexto

Tras la revisión del Sprint 5 Ecosystem, **todas las features están completamente implementadas**:
- ✅ Creators (486 en tabla, cron semanal activo)
- ✅ Bundles (29 activos, cron semanal activo)  
- ✅ Usage Events (145 eventos, instrumentado en MCP server)
- ✅ Trending Solutions (con scoring ponderado real)
- ✅ Cleanup de eventos (cron mensual, 90 días)
- ✅ Agent Analytics (usa usage_events reales)

Lo único pendiente de la conversación son **3 repositorios GitHub** que no están en el catálogo:

1. **`zubair-trabzada/ai-sales-team-claude`** — Skill de ventas con IA
2. **`Miosa-osa/canopy`** — No encontrado en catálogo
3. **`YouMind-OpenLab/awesome-nano-banana-pro-prompts`** — URL incorrecta en el registro existente

### Implementación

**Paso 1: Agregar modo `import_repos` a `sync-skills/index.ts`**

Añadir un nuevo modo al edge function que acepte un array de URLs de GitHub y para cada una:
- Fetch el README del repo
- Extraer nombre, descripción, owner
- Inferir categoría y roles con las funciones existentes (`inferCategory`, `inferRoles`)
- Generar slug y comando de instalación
- Insertar en la tabla `skills` con `status: 'pending'` y `source: 'manual'`
- Aplicar deduplicación contra skills existentes (por `github_url`)

Ejemplo de invocación:
```json
{
  "source": "import_repos",
  "repos": [
    "https://github.com/zubair-trabzada/ai-sales-team-claude",
    "https://github.com/Miosa-osa/canopy",
    "https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts"
  ]
}
```

**Paso 2: Corregir el registro existente de YouMind-OpenLab**

Buscar el skill con slug que referencia a YouMind-OpenLab y actualizar su `github_url` al valor correcto.

**Paso 3: Invocar el edge function** para importar los 3 repos.

### Detalles técnicos

El nuevo modo reutilizará las funciones helper existentes del archivo (`inferCategory`, `inferRoles`, `slugFromName`) y el flujo de fetch de README via GitHub API. Los skills entrarán como `pending` y serán procesados por el pipeline existente de auto-approve, enriquecimiento AI, y escaneo de seguridad.

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `supabase/functions/sync-skills/index.ts` | Agregar modo `import_repos` (~60 líneas) |

