

## Auditoria completa de Cron Jobs

Tenemos **37 cron jobs activos**. Los organizo por función, frecuencia, y diagnostico problemas.

---

### Inventario completo

```text
FRECUENCIA   | CRON JOB                          | EDGE FUNCTION            | PROPÓSITO
─────────────┼───────────────────────────────────┼──────────────────────────┼─────────────────────────
5 seg        | process-email-queue               | process-email-queue      | Cola de emails (smart, con vault)
*/2 min      | github-enrich-auto                | sync-skills              | Enriquecer skills con GitHub API
*/2 min      | fetch-connector-icons-auto        | fetch-connector-icons    | Buscar iconos de conectores
*/2 min      | fetch-readme-auto                 | fetch-readme             | Buscar READMEs
*/2 min      | sync-connector-stars-auto         | sync-connector-stars     | Actualizar estrellas GitHub conectores
*/2 min      | translate-connectors-fast         | translate-connectors     | Traducir conectores
*/2 min      | translate-skills-fast             | translate-skills         | Traducir skills
*/2 min      | verify-security-auto              | verify-security          | Verificar seguridad (licencias, etc)
*/3 min      | auto-approve-skills-cron          | auto-approve-skills      | Auto-aprobar skills
*/3 min      | bulk-scan-connectors-a            | scan-security            | Scan security conectores
*/3 min      | bulk-scan-plugins-a               | scan-security            | Scan security plugins
*/3 min      | bulk-scan-skills-a                | scan-security            | Scan security skills
*/3 min      | enrich-skills-ai-auto             | enrich-skills-ai         | Enriquecer con AI
*/3 min      | generate-install-cmds-auto        | generate-install-commands| Generar comandos install
*/3 min      | sync-skill-stars-auto             | sync-skill-stars         | Actualizar estrellas GitHub skills
*/3 min      | translate-plugins-auto            | translate-connectors     | Traducir plugins
*/4 min      | detect-mcps-auto                  | enrich-skills-ai         | Detectar MCPs en skills
*/5 min      | bulk-mark-no-mcp-auto             | enrich-skills-ai         | Marcar skills sin MCP
*/5 min      | calculate-trust-scores-fast       | calculate-trust-score    | Calcular trust scores
*/5 min      | process-email-queue-every-5min    | process-email-queue      | Cola de emails (fallback)
*/10 min     | poll-vt-pending-auto              | poll-vt-pending          | Polling VirusTotal
*/10 min     | quality-maintenance-cron          | quality-maintenance      | Mantenimiento calidad
*/15 min     | security-incident-escalation      | security-incident        | Escalar incidentes
0 */6h       | version-monitor-auto              | version-monitor          | Monitor versiones
0 */12h      | check-mcp-health-12h              | check-mcp-health         | Health check MCPs
0 4 daily    | intelligence-engine-daily         | discover-trending-skills | Engine de inteligencia
0 5 daily    | monorepo-sync-daily               | discover-trending-skills | Sync monorepos
0 6 daily    | sync-skills-daily                 | sync-skills              | Sync skills (skillsmp.com)
0 6:15 daily | sync-connectors-glama-auto        | sync-connectors          | Sync desde Glama
0 6:30 daily | sync-connectors-0x7c2f-auto       | sync-connectors          | Sync desde 0x7c2f
0 6:30 daily | sync-connectors-official-daily    | sync-connectors          | Sync registro oficial
0 7 daily    | sync-connectors-github-daily      | sync-connectors          | Sync awesome-mcp-servers
0 7 daily    | sync-plugins-daily                | sync-plugins             | Sync plugins
0 7 daily    | sync-skills-github-popular        | sync-skills              | Sync GitHub popular
0 7 daily    | refresh-readmes-daily             | refresh-catalog-data     | Refrescar READMEs
0 7:30 daily | sync-skills-github-code-search    | sync-skills              | Sync code search
0 8 daily    | sync-skills-categories-weekly     | sync-skills              | Sync skills.sh categories
0 9 daily    | sync-skills-agentskill-weekly     | sync-skills              | Sync agentskill.sh
0 8 daily    | mcp-quality-monitor-daily         | mcp-quality-monitor      | Monitor calidad MCP
0 9,14,19    | generate-blog-post (x3)           | generate-blog-post       | Generar blog posts
weekly Mon   | discover-trending-skills-weekly   | discover-trending-skills | Trending search
weekly Mon   | rescan-security-weekly            | rescan-security          | Re-scan seguridad
weekly Mon   | sync-composio-weekly              | sync-composio            | Sync Composio
weekly Wed   | scrape-docs-weekly                | refresh-catalog-data     | Scrape docs
weekly Sun   | detect-dead-repos-weekly          | refresh-catalog-data     | Detectar repos muertos
```

---

### Problemas detectados

#### 1. DUPLICADO: Email queue (2 crons para lo mismo)
- `process-email-queue` (cada 5 seg) -- versión smart con vault key
- `process-email-queue-every-5min` (cada 5 min) -- versión legacy con anon key

El de 5 segundos ya cubre todo. El de 5 minutos es redundante y usa la anon key en lugar de service role. **Eliminar `process-email-queue-every-5min`.**

#### 2. SOLAPAMIENTO: Security scanning (4 crons que se pisan)
- `bulk-scan-skills-a` (*/3 min) -- scan-security para skills
- `bulk-scan-connectors-a` (*/3 min) -- scan-security para connectors
- `bulk-scan-plugins-a` (*/3 min) -- scan-security para plugins
- `verify-security-auto` (*/2 min) -- verify-security para ALL tables

`verify-security` y `scan-security` hacen cosas similares (análisis estático de repos). Corren **cada 2-3 minutos** lo cual es excesivo. Una vez que todo el catálogo está escaneado, estos crons solo ejecutan "0 items to scan" repetidamente.

**Recomendación:** Bajar frecuencia de `bulk-scan-*` a cada 15 min y `verify-security` a cada 10 min.

#### 3. SOLAPAMIENTO: enrich-skills-ai (3 crons, 1 función)
- `enrich-skills-ai-auto` (*/3 min) -- modo default
- `detect-mcps-auto` (*/4 min) -- modo detect-mcps
- `bulk-mark-no-mcp-auto` (*/5 min) -- modo bulk-mark

Los 3 llaman a `enrich-skills-ai` con diferentes modos. Los logs muestran "No skills to enrich (0 found)" y "No skills to analyze (0 found)" constantemente. **El catálogo ya está completamente enriquecido.**

**Recomendación:** Bajar los 3 a cada 30 min o 1 hora. Solo necesitan correr frecuente cuando hay nuevos imports.

#### 4. EXCESIVA FRECUENCIA: Traducción (3 crons cada 2-3 min)
- `translate-skills-fast` (*/2 min)
- `translate-connectors-fast` (*/2 min)
- `translate-plugins-auto` (*/3 min)

Una vez traducido todo, corren en vacío. **Bajar a cada 15-30 min.**

#### 5. EXCESIVA FRECUENCIA: GitHub data (3 crons cada 2-3 min)
- `github-enrich-auto` (*/2 min) -- Logs muestran "Enriched 0/50" constantemente
- `sync-skill-stars-auto` (*/3 min)
- `sync-connector-stars-auto` (*/2 min)

Las estrellas de GitHub no cambian cada 2 minutos. **Bajar a cada 30 min o 1 hora.**

#### 6. EXCESIVA FRECUENCIA: fetch-readme + fetch-connector-icons
- `fetch-readme-auto` (*/2 min)
- `fetch-connector-icons-auto` (*/2 min)

Una vez que se buscan todos, corren en vacío. **Bajar a cada 30 min.**

#### 7. Nombres engañosos
- `sync-skills-categories-weekly` y `sync-skills-agentskill-weekly` no son weekly -- corren DIARIAMENTE (schedule `0 8 * * *` y `0 9 * * *`).

#### 8. Blog posts: 3 crons al día
- `generate-blog-post-morning` (9 AM)
- `generate-blog-post-afternoon` (2 PM)
- `generate-blog-post-evening` (7 PM)

3 posts por día consume bastante en AI tokens. Evaluar si 1/día es suficiente.

---

### Resumen del impacto

```text
ESTADO ACTUAL:
- 37 cron jobs activos
- ~14 crons corriendo cada 2-3 minutos = ~350+ invocaciones/hora
- Muchos corren en vacío ("0 found", "0 enriched")
- 1 duplicado directo (email queue)
- Múltiples solapamientos en security scanning

ESTADO OPTIMIZADO PROPUESTO:
- 36 cron jobs (-1 duplicado email)
- ~6 crons cada 2-3 min → solo los críticos (email, auto-approve)
- Resto baja a 15-60 min
- ~80 invocaciones/hora (reducción ~77%)
```

---

### Plan de optimización

Consolidar las frecuencias en 4 tiers:

| Tier | Frecuencia | Crons |
|------|-----------|-------|
| **Critico** | 5 seg / 3 min | email-queue (smart), auto-approve-skills |
| **Frecuente** | */10-15 min | scan-security (x3), verify-security, quality-maintenance, trust-scores, generate-install-cmds |
| **Normal** | */30 min | translate-* (x3), enrich-* (x3), github-enrich, sync-stars (x2), fetch-readme, fetch-icons, poll-vt |
| **Bajo** | cada 6-12h / diario / semanal | Sin cambios (ya están bien) |

**Implementación:** Un solo script SQL con `cron.unschedule` + `cron.schedule` para ajustar las frecuencias. Eliminar el cron duplicado de email. No requiere cambios en edge functions.

