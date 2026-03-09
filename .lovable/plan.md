

# Audit: PRD de Seguridad Pymaia -- Que falta implementar

## Estado actual (~85% completado)

El sistema tiene implementado un pipeline de seguridad robusto con 11 capas de escaneo, Trust Score de 4 dimensiones, security gate en publicacion, reportes de abuso, monitoreo de versiones, incidentes, y UI de transparencia. A continuacion, los gaps restantes.

---

## Gaps identificados (ordenados por impacto)

### 1. Dependency Audit (PRD 5.1 item 4) -- NO IMPLEMENTADO
El PRD pide auditar dependencias npm/pip/Docker con CVE checks (CVSS > 7 bloquea, > 9 delist). Actualmente `scan-security` no extrae ni analiza dependencias reales de los paquetes.

**Como hacerlo:** Agregar un layer en `scan-security` que, dado un `github_url`, llame a la GitHub API para leer `package.json` / `requirements.txt` del repo, luego use la GitHub Advisory Database API (`GET /advisories?ecosystem=npm&package=X`) para detectar CVEs conocidos. No requiere Snyk/Trivy -- la API de GitHub es gratuita con el `GITHUB_TOKEN` ya configurado.

### 2. Network Security Check para MCPs (PRD 5.1 item 6) -- NO IMPLEMENTADO
El PRD pide verificar que MCPs no hacen bind a `0.0.0.0`, no exponen endpoints sin auth, y usen HTTPS. `check-mcp-health` solo verifica si la URL responde, pero no valida configuracion de seguridad de red.

**Como hacerlo:** Extender `check-mcp-health` para verificar que las URLs usen HTTPS, no tengan puertos inusuales, y agregar un campo `network_security` al resultado del health check.

### 3. Tool Description Analysis para MCPs (PRD 5.1 item 2) -- PARCIAL
El PRD pide extraer tool descriptions de MCPs conectados y analizarlas por tool poisoning. Actualmente se analiza el contenido textual general pero no se hace fetch real de las tool descriptions del servidor MCP.

**Como hacerlo:** En `scan-security`, si el item tiene una URL de MCP, intentar hacer un request al endpoint `/tools/list` del protocolo MCP para extraer las descriptions reales y analizarlas con el mismo pipeline de injection + LLM.

### 4. Behavioral Monitoring (PRD 5.2 item 9) -- PARCIAL
El PRD pide tracking de spikes en uninstalls como trigger de review. No hay tracking de uninstalls (solo installs). Los abuse reports si tienen escalation, pero falta el trigger por uninstall spikes.

**Como hacerlo:** Agregar una tabla `uninstallations` o un campo en `installations` con `uninstalled_at`, y un check en `security-incident` que detecte spikes de uninstalls vs installs.

### 5. MCP Metadata Validation (PRD 5.1 item 1) -- PARCIAL
El PRD pide validar que URL sea accesible, HTTPS, SSL valido. `check-mcp-health` verifica accesibilidad pero no valida SSL ni fuerza HTTPS.

**Como hacerlo:** En `check-mcp-health`, agregar validacion de que la URL comience con `https://` y que el fetch no falle por SSL.

### 6. Notificacion al Publisher (PRD 9.3) -- NO IMPLEMENTADO
El PRD dice: "1 reporte: logged, notificacion a publisher". Actualmente los reportes se guardan pero no se notifica al publisher.

**Como hacerlo:** En `security-incident`, cuando se detecta un nuevo reporte, buscar el `creator_id` del item, obtener su email del perfil, y enviar notificacion via la funcion `send-email` existente.

### 7. Review Queue con contexto (PRD 4.3) -- NO IMPLEMENTADO
El PRD pide una queue de review manual para items SUSPICIOUS con contexto del flag, score LLM, y acciones (Approve/Reject/Request changes). El Admin dashboard muestra metricas pero no tiene una queue interactiva de review.

**Como hacerlo:** Agregar un tab "Review Queue" en `/admin` que liste items con `security_status = 'flagged'` o `security_scan_result->verdict = 'SUSPICIOUS'`, mostrando el detalle del scan y botones de accion.

### 8. Re-scan con reglas actualizadas (PRD 10.1) -- IMPLEMENTADO PERO SIMPLE
`rescan-security` existe pero solo re-escanea items sin scan reciente. El PRD pide re-scan semanal de TODO el catalogo con patterns actualizados.

**Como hacerlo:** Modificar `rescan-security` para que en cada ejecucion re-escanee un batch de items (independientemente de cuando fueron escaneados), rotando por el catalogo completo a lo largo de la semana.

### 9. Publisher Account Status Check (PRD 10.1) -- NO IMPLEMENTADO
El PRD pide check diario del estado de la cuenta GitHub del publisher (flag si eliminada/suspendida).

**Como hacerlo:** Agregar un check en `version-monitor` o crear un nuevo cron que verifique que las cuentas GitHub de los publishers sigan activas.

---

## Items que NO son implementables en esta plataforma

- **ML model trained on flagged/approved items** (PRD Fase 4): Requiere infraestructura de ML externa. Se puede simular mejorando los prompts del LLM con ejemplos de items flaggeados.
- **Integracion con Snyk Agent Scan API**: Requiere API key de Snyk (servicio de pago). Se puede substituir con la GitHub Advisory Database gratuita.
- **Docker image scan con Trivy/Grype**: No ejecutable desde edge functions. Se cubre parcialmente con dependency checks.

---

## Plan de implementacion (priorizado)

### Batch 1 -- Alto impacto, facil
1. **Dependency Audit via GitHub Advisory API** -- Nuevo layer en `scan-security`
2. **Network Security Validation** -- Extender `check-mcp-health` con HTTPS/port checks
3. **Publisher notification on report** -- Usar `send-email` existente
4. **HTTPS validation para MCP URLs** -- Agregar a format validation

### Batch 2 -- Medio impacto
5. **Review Queue en Admin** -- Nuevo tab con lista de items SUSPICIOUS y acciones
6. **Full catalog re-scan rotation** -- Mejorar `rescan-security`
7. **Publisher account status check** -- Nuevo cron o extension de `version-monitor`

### Batch 3 -- Nice to have
8. **Uninstall tracking + spike detection** -- Nueva tabla + trigger
9. **MCP Tool Description fetch** -- Request al endpoint `/tools/list`

