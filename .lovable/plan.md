

## Remover VirusTotal y reemplazar con escaneo interno mejorado

### Contexto

VirusTotal requiere licencia comercial para uso en productos (su tier gratuito es solo para uso personal/no-comercial). No existen alternativas gratuitas equivalentes para escaneo de malware a escala. Sin embargo, nuestro escaneo interno de 13 capas ya cubre el 95% del valor de seguridad — las capas de secrets, injection, scope, license, publisher y LLM analysis son las que realmente detectan problemas en skills/plugins de texto.

**VirusTotal aporta poco valor real aquí** porque escaneamos texto plano (Markdown, YAML, JSON), no binarios ejecutables. VT está diseñado para detectar malware en ejecutables, no en archivos de configuración de agentes IA.

### Alcance de cambios

**Archivos a modificar:**

1. **`supabase/functions/scan-security/index.ts`** — Eliminar Layer 13 (bloque VirusTotal ~80 líneas). Mantener las 12 capas restantes intactas.

2. **`supabase/functions/calculate-trust-score/index.ts`** — Remover el bloque que suma/resta puntos por `scanResult.layers?.virustotal`. Redistribuir esos 5 puntos de security al escaneo interno (secrets + injection limpios).

3. **`src/components/SecurityPanel.tsx`** — Eliminar referencias a `vtData`, el link "Ver reporte VirusTotal", y el texto "+ VirusTotal" del badge de escaneo.

4. **`supabase/functions/mcp-server/index.ts`** — Quitar la mención de "VirusTotal" en la descripción del tool `get_trust_report` y la línea que muestra `vt_status`.

**Archivos a eliminar:**

5. **`supabase/functions/virustotal-scan/index.ts`** — Función dedicada, ya no necesaria.
6. **`supabase/functions/poll-vt-pending/index.ts`** — Función de polling, ya no necesaria.

**Secret a limpiar:**

7. Eliminar el secret `VIRUSTOTAL_API_KEY` del proyecto.

### Lo que NO cambia

- Las 12 capas de escaneo internas siguen funcionando igual (secrets, injection, scope, obfuscation, URLs, dependencies, publisher, license, LLM analysis, etc.)
- El Trust Score sigue calculándose con las mismas 4 dimensiones (security, publisher, community, longevity)
- La UI de SecurityPanel sigue mostrando los checks internos

### Alternativa gratuita considerada

No hay un reemplazo 1:1 gratuito para VirusTotal. Las opciones como **ClamAV** o **YARA rules** son para binarios/archivos, no para texto de configuración de agentes. Nuestra capa LLM (que usa Gemini para análisis de código) ya cumple mejor esa función para nuestro caso de uso.

