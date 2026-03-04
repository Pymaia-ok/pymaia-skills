

## Análisis: Origen de los datos

**Estado actual:**
- **`install_count`**: Ya es dato real. Viene de GitHub stars (vía `githubEnrich`) o descargas de skillsmp.com. Es el dato más confiable.
- **`avg_rating` / `review_count`**: Son 100% internos. Empiezan en 0 y solo suben cuando un usuario de tu plataforma deja una review. Por eso casi todas muestran "0.0 (0)".

**El problema visible**: Mostrar "0.0" como rating cuando no hay reviews es confuso — parece una calificación negativa cuando en realidad es "sin datos".

## Plan propuesto

### 1. Ocultar rating cuando no hay reviews internas
En `SkillCard.tsx` y `SkillDetail.tsx`: si `review_count === 0`, no mostrar la estrella ni el "0.0". Solo mostrar el rating cuando haya al menos 1 review real de un usuario.

### 2. Mostrar GitHub stars como métrica de popularidad
Agregar columna `github_stars` a la tabla `skills` (separada de `install_count`) para tener el dato real de estrellas. Mostrarla como badge secundario en las cards (ej: "⭐ 2.3k" de GitHub).

Actualmente `install_count` ya se sobreescribe con `stargazers_count` en el enrich, pero mezcla dos conceptos. Separarlos permite:
- `github_stars` = dato real de GitHub (credibilidad externa)
- `install_count` = instalaciones reales desde la plataforma
- `avg_rating` = reviews de usuarios de la app (solo se muestra si > 0)

### 3. Actualizar sync para poblar `github_stars`
En `sync-skills/index.ts`, durante el `githubEnrich`, guardar `stargazers_count` en `github_stars` en vez de sobreescribir `install_count`.

### Cambios técnicos

| Archivo | Cambio |
|---|---|
| **Migración SQL** | `ALTER TABLE skills ADD COLUMN github_stars integer NOT NULL DEFAULT 0` |
| **`sync-skills/index.ts`** | En `githubEnrich`, escribir `github_stars` en vez de `install_count`. En upsert de skills nuevas, mapear `stars` → `github_stars` |
| **`SkillCard.tsx`** | Ocultar rating si `review_count === 0`. Mostrar `github_stars` como badge "⭐ X" si > 0. Mostrar `install_count` solo si > 0 |
| **`SkillDetail.tsx`** | Mismo tratamiento: ocultar rating sin reviews, mostrar GitHub stars como indicador de popularidad |
| **`src/lib/api.ts`** | Agregar `github_stars` al tipo `SkillFromDB` |

### Resultado
- Sin más datos "0.0" confusos
- GitHub stars como señal de calidad real y verificable
- Rating solo aparece cuando hay feedback genuino de usuarios
- Install count se reserva para acciones reales en la plataforma

