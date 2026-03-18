

# Desbloquear el Pipeline: De 4K Scraped a 88K+ Skills

## Diagnóstico

El pipeline tiene **3 cuellos de botella** que explican por qué tenemos tan pocos skills nuevos:

| Etapa | Estado | Problema |
|---|---|---|
| **Scraping** | 4,086 de ~88K scraped | El scraper solo capturó ~4K del sitemap. skills.sh tiene ~88K entries |
| **Dedup** | 1,086 pendientes de dedup | Procesó solo ~3K de los 4K |
| **Import → pending** | 896 listos + 2K importados | Los 2K importados entraron como `pending` |
| **pending → approved** | 7,186 pending, 0 scanned | `auto-approve` requiere `security_scan_result`, pero `scan-security` no está procesando los pending |
| **scan-security** | 0 scans en 24h | El cron de scan-security no está escaneando los 7,186 pending |

**Resumen**: El scraper obtuvo solo ~5% de skills.sh, y los que sí importó están atascados como `pending` porque el pipeline de security scan → auto-approve no los está procesando.

## Plan

### 1. Ampliar el scraper para capturar todo skills.sh
El scraper actual tiene `batchSize = 5000` por defecto y solo lee el sitemap. Skills.sh tiene ~88K skills. Necesitamos:
- Aumentar el `maxEntries` del scraper o ejecutarlo en múltiples pasadas
- Verificar que el sitemap de skills.sh realmente lista todos los skills (puede estar paginado)
- Si el sitemap solo tiene ~4K URLs, explorar la API de skills.sh o paginar el listado HTML

### 2. Procesar staging completo (dedup + import)
Ejecutar `scrape-skills-sh` en modo `dedup` y luego `import` para los ~2K pendientes en staging.

### 3. Desbloquear auto-approve para imported skills
El bloqueador principal: `auto-approve` requiere `security_scan_result` pero `scan-security` no los procesa. Dos opciones:
- **Opción A (rápida)**: Para skills importados de skills.sh con GitHub URL válida, hacer un "light scan" que asigne un `security_scan_result` básico (sin full scan) para que `auto-approve` pueda evaluarlos
- **Opción B (correcta)**: Ajustar `scan-security` para procesar pending skills en batches más grandes, y aumentar la frecuencia del cron

### 4. Fix: install_command en staging usa formato viejo
Línea 197 del scraper todavía genera `npx skills add` (formato roto):
```
install_command: `npx skills add ${e.owner}/${e.repo} --skill ${e.skill}`
```
Debe usar el formato nativo:
```
install_command: `claude skill add --from-url https://raw.githubusercontent.com/${e.owner}/${e.repo}/main/skills/${e.skill}/SKILL.md`
```

### 5. Ejecutar pipeline completo
Una vez corregido el código:
1. Re-scrape skills.sh con límite alto
2. Dedup todo el staging
3. Import las nuevas entries
4. Scan-security en batch los pending
5. Auto-approve los que califiquen

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/scrape-skills-sh/index.ts` | Fix install_command format (línea 197), aumentar default batchSize |
| `supabase/functions/auto-approve-skills/index.ts` | Agregar "light approve" para skills con GitHub URL válida de fuentes conocidas (skills.sh import) |
| `supabase/functions/scan-security/index.ts` | Verificar que procese skills en status `pending` |

## Impacto esperado
- Staging: de 4K → potencialmente 80K+ entries
- Approved skills: de 38K → 50K-70K+ (dependiendo de dedup)
- Todo el catálogo visible y buscable

