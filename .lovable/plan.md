

# Problema: Los comandos `npx skillsadd` están rotos

## Diagnóstico

El error que ves tiene **dos causas**:

1. **`skillsadd` es un paquete npm deprecado** — el log dice: `npm warn deprecated skillsadd@1.0.0: Package no longer supported`
2. **El servicio skills.ws devuelve 500** — `Failed to fetch skills list from skills.ws` → el backend externo está caído

Esto NO es un bug de Pymaia ni de tu máquina. El paquete `skillsadd` de terceros (skills.ws) dejó de funcionar.

## El problema en nuestro catálogo

Muchos skills importados tienen `install_command` con el formato viejo:
```
npx skillsadd tradermonty/claude-trading-skills/skills/portfolio-manager
```

Este formato depende de un servicio externo muerto. Deberíamos migrarlos al formato nativo de Claude Code:
```
claude skill add --from-url https://raw.githubusercontent.com/tradermonty/claude-trading-skills/main/skills/portfolio-manager/SKILL.md
```

## Plan de implementación

### 1. Migrar install_commands en la base de datos
Crear una migración SQL que convierta todos los `install_command` que usen `npx skillsadd <owner>/<repo>/skills/<path>` al formato `claude skill add --from-url https://raw.githubusercontent.com/<owner>/<repo>/main/skills/<path>/SKILL.md`.

Habrá ~200-500 skills afectados. La migración será un UPDATE con regexp_replace.

### 2. Migrar `npx skills add` con URL de GitHub
Algunos usan `npx skills add https://github.com/...` — estos también deben convertirse al formato `claude skill add <github_url>`.

### 3. Actualizar el edge function de sync
En `sync-antigravity-skills` y cualquier función de importación, asegurar que los nuevos skills se generen con el formato `claude skill add --from-url` en vez de `npx skillsadd`.

### 4. Actualizar MultiAgentInstall.tsx
El componente ya usa `claude skill add ${githubUrl || itemSlug}` — está correcto. Solo verificar que el fallback a `itemSlug` no produzca un comando roto cuando el slug no es una URL de GitHub.

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | UPDATE masivo de `install_command` en tabla `skills` |
| `supabase/functions/sync-antigravity-skills/index.ts` | Ya usa formato correcto ✅ |
| `supabase/functions/sync-skills/index.ts` | Verificar formato de generación |
| `supabase/functions/generate-install-commands/index.ts` | Verificar que genere formato nuevo |

