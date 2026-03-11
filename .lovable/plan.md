

# Plan: Integrar VirusTotal API en el Pipeline de Seguridad de Pymaia

## Resumen

Agregar VirusTotal como **capa adicional** al pipeline existente de 12 capas. Pymaia ya cubre amenazas AI-specific (injection, scope creep, hooks) que VT no detecta. VT agrega detección de malware conocido, supply chain intelligence, y el sello de confianza "Scanned by VirusTotal".

## Flujo propuesto

```text
Skill/Plugin publicado
       │
       ▼
┌──────────────────┐
│ Pymaia 12-layer  │  ← ya existente
│ scan pipeline    │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ VirusTotal API   │  ← NUEVO
│ 1. SHA-256 hash  │
│ 2. Hash lookup   │
│ 3. Upload si no  │
│    existe         │
│ 4. Code Insight  │
│    (si aplica)    │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Merge verdicts   │
│ + Update Trust   │
│ Score            │
└──────────────────┘
```

## Cambios

### 1. Secret: VIRUSTOTAL_API_KEY
Se necesita una API key de VirusTotal (free tier soporta 500 lookups/día, 4 req/min). Se agrega como secret del proyecto.

### 2. Nuevo edge function: `supabase/functions/virustotal-scan/index.ts`
- Recibe `{ content: string, item_id: string, item_type: string }`
- Computa SHA-256 del contenido
- Hace GET a `https://www.virustotal.com/api/v3/files/{hash}` (lookup)
- Si no existe (404), hace POST a `https://www.virustotal.com/api/v3/files` (upload)
- Parsea resultado: `last_analysis_stats`, `popular_threat_classification`, y `crowdsourced_ai_results` (Code Insight)
- Devuelve veredicto simplificado: `clean`, `suspicious`, `malicious`, `unknown`

### 3. Modificar `scan-security/index.ts`
Al final del pipeline de 12 capas, invocar `virustotal-scan` como capa 13. Almacenar resultado en `security_scan_result.layers.virustotal` con:
- `hash`: SHA-256
- `detection_ratio`: ej "0/72"
- `code_insight_verdict`: si disponible
- `vt_permalink`: link al reporte completo
- `scanned_at`: timestamp

### 4. Modificar `calculate-trust-score/index.ts`
Agregar bonus/penalty basado en resultado VT:
- VT clean + 0 detections → +5 security points
- VT suspicious / 1-3 detections → 0
- VT malicious / 4+ detections → -15 security points

### 5. Modificar `SecurityPanel.tsx`
Agregar fila en "Scan Results" para VirusTotal:
- Icono de VirusTotal + "VirusTotal: Clean (0/72)" o "Flagged (3/72)"
- Link al reporte completo de VT (vt_permalink)
- Badge "Scanned by VirusTotal" visible

### 6. Modificar `rescan-security/index.ts`
El re-scan ya invoca `scan-security`, que ahora incluirá VT automáticamente.

### 7. Actualizar copy público
- `public/llms.txt`: mencionar "VirusTotal scanning"
- SecurityPanel: agregar "Scanned by Pymaia + VirusTotal"

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `supabase/functions/virustotal-scan/index.ts` | **Crear** |
| `supabase/functions/scan-security/index.ts` | Modificar — invocar VT como capa 13 |
| `supabase/functions/calculate-trust-score/index.ts` | Modificar — integrar VT en score |
| `src/components/SecurityPanel.tsx` | Modificar — mostrar resultado VT |
| `public/llms.txt` | Modificar — mencionar VT |

## Prerequisito
Se necesita la API key de VirusTotal configurada como secret antes de implementar.

## Nota sobre rate limits
VT free tier: 4 req/min, 500/día. Con ~35K skills, el scan inicial tomaría ~70 días en rotación. El plan Premium ($600/mes) sube a 1000 req/min. Para empezar, el free tier es suficiente para nuevas publicaciones + re-scans graduales.

