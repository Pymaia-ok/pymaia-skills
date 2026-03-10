

## Plan: API Pública de Seguridad Pymaia + Documentación Interactiva

### Objetivo
Expandir la `trust-score-api` existente en una API pública completa de seguridad, con documentación interactiva en `/api-docs`, badges SVG embebibles, y endpoint de búsqueda/listado.

---

### 1. Expandir Edge Function `trust-score-api`

Agregar 3 rutas al endpoint existente usando path parsing:

- **`GET ?slug=X&type=Y`** (existente) — Agregar campo `scan_details` con las capas del escaneo (secrets, injection, typosquatting, scope, hidden_content, dependencies) mostrando solo conteo y estado (sin exponer datos sensibles del scan raw).

- **`GET ?action=search&q=term&type=skill`** (nuevo) — Endpoint de búsqueda/listado que devuelve items con su trust score. Parámetros: `q` (búsqueda), `type`, `min_score`, `badge`, `limit` (max 100).

- **`GET ?action=badge&slug=X&type=Y`** (nuevo) — Devuelve un SVG dinámico estilo shields.io con el Trust Score y badge color. Para embeber en READMEs de GitHub con `![Trust Score](url)`.

### 2. Página `/api-docs` — Documentación Interactiva

Nueva página React con:

- Descripción de la API y su propósito (benchmark de seguridad)
- Endpoints documentados con ejemplos de request/response
- "Try it" interactivo: input para slug/type que hace la llamada en vivo y muestra el JSON formateado
- Sección de badges con código markdown/HTML para copiar
- Explicación del sistema de scoring (security 40pts, publisher 25pts, community 20pts, longevity 15pts)

### 3. Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/trust-score-api/index.ts` | Expandir con rutas search, badge SVG, y scan_details |
| `src/pages/ApiDocs.tsx` | Nueva página de documentación interactiva |
| `src/App.tsx` | Agregar ruta `/api-docs` |
| `src/i18n/es.ts` | Traducciones para la página |
| `src/i18n/en.ts` | Traducciones para la página |

### 4. Detalle del Badge SVG

El endpoint generará SVGs dinámicos con colores según badge:
- `official` (>=90): dorado
- `verified` (>=80): esmeralda  
- `trusted` (>=60): verde
- `reviewed` (>=40): azul
- `new` (<40): gris

Formato: `Trust Score | 85 verified` con el escudo de Pymaia.

### 5. Rate Limiting

Implementar rate limiting simple en la edge function usando un Map en memoria con IP + ventana de 1 minuto, máximo 60 requests. No requiere tabla adicional.

