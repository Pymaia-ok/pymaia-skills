

# Auditoría: Plugins de Claude vs. Nuestra Base de Conectores

## Resultado del análisis

Revisé los ~170 plugins listados en `claude.com/plugins` contra nuestra base de **6,011 conectores aprobados**. Aquí está el desglose:

---

## Conectores que YA TENEMOS (✅) — ~120 de ~170

La gran mayoría ya están en nuestra base, incluyendo todos los principales:

Gmail, Google Calendar, Notion, Canva, Figma, Slack, Atlassian/Jira, HubSpot, Linear, Monday.com, Intercom, Vercel, Granola, Asana, Sentry, Miro, n8n, Zapier, ClickUp, Supabase, Hugging Face, Excalidraw, Stripe, Context7, Amplitude, Cloudflare, Google Drive, Snowflake, Apollo, Make, GoDaddy, PayPal, BigQuery, Airtable, Databricks, Klaviyo, PostHog, Square, Clerk, Postman, PagerDuty, Grafana, Kubernetes, ElevenLabs, Apify, Shadcn UI, Spotify, Tableau, Desktop Commander, Filesystem, GrowthBook, Blockscout, MotherDuck, Coupler.io, CData Connect AI, Bitly, Close, Egnyte, Clockwise, Pylon, LunarCrush, Cloudinary, Attio, Box, WordPress, Netlify, Mermaid Chart, Webflow, Docusign, ActiveCampaign, MailerLite, Razorpay, Sanity, Mailtrap, Socket, iMessage, Apple Notes, Spotify, PlanetScale, Lumin, Stytch (no), Airwallex, etc.

---

## Conectores que NOS FALTAN (❌) — ~35 plugins

Estos plugins oficiales de Claude **no tienen un registro curado** en nuestra base (algunos tienen variantes comunitarias parciales, pero no el registro oficial):

### Tier 1 — Marcas importantes que deberíamos agregar como curados
1. **Gamma** — Presentaciones con IA
2. **Box** — Almacenamiento empresarial (tenemos variante comunitaria, falta curado)
3. **Fireflies** — Transcripción de reuniones
4. **Indeed** — Búsqueda de empleo
5. **PubMed** — Investigación biomédica (tenemos variantes, falta curado)
6. **Microsoft Learn** — Documentación Microsoft
7. **Clay** — Prospección B2B (tenemos variante smithery)
8. **S&P Global** — Datos financieros
9. **NetSuite** — ERP empresarial
10. **Ahrefs** — SEO analytics
11. **PitchBook** — Datos de inversión
12. **Ramp** — Finanzas empresariales
13. **Smartsheet** — Gestión de proyectos
14. **ZoomInfo** — Inteligencia GTM
15. **Wix** — Constructor de sitios
16. **Pendo** — Product analytics
17. **BioRender** — Diseño científico
18. **Crypto.com** — Crypto trading
19. **Harvey** — Investigación legal IA
20. **Similarweb** — Datos de mercado web
21. **Trivago** — Búsqueda de hoteles
22. **Guru** — Knowledge management
23. **Synapse.org** — Datos científicos
24. **Jam** — Bug reporting
25. **Windsor.ai** — Marketing analytics
26. **Consensus** — Investigación científica
27. **Fellow.ai** — Meeting insights
28. **Hex** — Data analytics
29. **Glean** — Enterprise search (tenemos variante oficial-registry)
30. **Morningstar** — Datos de inversión

### Tier 2 — Plugins más nicho
31. **Bigdata.com** — Financial data
32. **ICD-10 Codes** — Códigos médicos
33. **Clinical Trials** — ClinicalTrials.gov
34. **CMS Coverage** — Base de datos CMS
35. **NPI Registry** — Registro médico US
36. **Learning Commons** — K-12 educación
37. **Scholar Gateway** — Investigación académica
38. **Play Sheet Music** — Música
39. **Kiwi.com** — Vuelos
40. **lastminute.com** — Viajes
41. **Wyndham Hotels** — Hoteles
42. **DirectBooker** — Hoteles
43. **MT Newswires** — Noticias financieras
44. **LSEG** — London Stock Exchange data
45. **MSCI** — Índices financieros
46. **FactSet** — Datos financieros (tenemos variante)
47. **Daloopa** — Financial KPIs
48. **Open Targets** — Drug discovery
49. **ChEMBL** — Química farmacéutica

---

## Plan de acción

Crear **registros curados** para los ~35 plugins faltantes del Tier 1 en la tabla `mcp_servers` con:
- `source = 'curated'`
- `status = 'approved'`
- Slugs limpios, iconos, y categorías correctas
- Homepage apuntando al plugin oficial de Claude (`https://claude.com/plugins/{slug}`)

Esto se haría via una migración SQL con un `INSERT` batch de los registros faltantes, siguiendo el mismo patrón que los curados existentes.

### Detalle técnico

- Un solo `INSERT INTO mcp_servers (...) VALUES ...` con ~45-50 registros
- Categorías: `communication`, `productivity`, `analytics`, `apis`, `development`, `search`, `design`, `cloud`, `marketing`
- Cada registro con `install_command` vacío (son plugins oficiales de Claude, no MCPs de npm)
- `description` y `description_es` con descripciones cortas del plugin

