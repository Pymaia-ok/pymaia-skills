

## Auditoría de Seguridad PRD — Estado Final (~97% completado)

### Implementado en esta sesión

| Gap | Estado | Implementación |
|---|---|---|
| **Dependency Audit (CVE checks)** | ✅ Implementado | Layer 12 en `scan-security` v6.0 — lee `package.json`/`requirements.txt` del repo GitHub, consulta GitHub Advisory Database API. CVSS>7 bloquea, CVSS>9 recomienda delist. |
| **Network Security Check (MCPs)** | ✅ Implementado | `check-mcp-health` v2.0 — valida HTTPS, puertos seguros, no IPs internas, no credenciales en URL, SSL errors. |
| **Publisher notification on report** | ✅ Implementado | `security-incident` v2.0 — notifica al publisher vía `send-email` cuando recibe 1 reporte. Notifica también en delist. |
| **Review Queue en Admin** | ✅ Implementado | Nuevo tab "Review Queue" en `/admin` con items flagged/suspicious, botones Approve/Reject/Rescan. |
| **Full catalog re-scan rotation** | ✅ Implementado | `rescan-security` v2.0 — ordena por `security_scanned_at ASC` (nulls first), rota el catálogo completo semanalmente. |
| **Publisher account status check** | ✅ Implementado | `version-monitor` v2.0 — verifica que las cuentas GitHub de publishers sigan activas, crea incidente P2 si eliminada/suspendida. |
| **Uninstall spike detection** | ✅ Implementado | `security-incident` acción `check_uninstall_spikes` — detecta tasa de uninstall >30% como trigger de review. |

### Items no implementables en esta plataforma
- ML model (Fase 4) — requiere infra ML externa
- Snyk Agent Scan — requiere API key de pago
- Docker image scan (Trivy/Grype) — no ejecutable en edge functions

### Capas de escaneo activas (scan-security v6.0)
1. Secret scanning (15 regex patterns)
2. Prompt injection (regex + patterns)
3. Typosquatting (Levenshtein)
4. Format validation (50KB, encoding, frontmatter)
5. Hidden content (zero-width, base64, bidi, homoglyph)
6. MCP scope/permission analysis
7. Hook static analysis (whitelist/blacklist)
8. Plugin decomposition + cross-component
9. Content similarity (Jaccard)
10. Publisher verification (GitHub API)
11. Dependency audit (GitHub Advisory API) ← NUEVO
12. LLM analysis (Gemini 2.5 Flash)
