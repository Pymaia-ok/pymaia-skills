

## Plan: Agregar ~60 conectores curados del listado de 100 apps

### Investigación completada

Crucé las 100 apps contra la DB actual (55 curados existentes) y los registros oficiales/comunitarios. Aquí el resultado:

### Ya curados en la DB (no requieren acción): 20
Slack, Notion, Figma, Canva, Stripe, Shopify, HubSpot, Salesforce, Airtable, Trello, Asana, ClickUp, Dropbox, Google Drive, Mailchimp, PostHog, Zoom, Discord, Google Calendar, Google Sheets

### Grupo A: Apps con MCP oficial/confiable — crear registro curado (~25)

Estas tienen MCPs verificados (oficiales de la empresa o del registro oficial MCP). Crearemos registros canónicos con slug limpio, icono, y `install_command` funcional.

```text
App                | install_command                                        | Fuente MCP
───────────────────|────────────────────────────────────────────────────────|──────────────
PayPal             | npx -y @paypal/mcp --tools=all                        | Oficial PayPal
Square             | (remote) https://mcp.squareup.com/sse                 | Oficial Square
WooCommerce        | npx -y shopify-mcp-server (proxy)                     | Oficial WooCommerce/Automattic
Klaviyo            | (remote) https://mcp.klaviyo.com/mcp                  | Oficial Klaviyo
ActiveCampaign     | (remote) https://developers.activecampaign.com/mcp    | Oficial ActiveCampaign
Monday.com         | (remote) https://mcp.monday.com/mcp                   | Oficial Monday
Pipedrive          | npx -y pipedrive-mcp                                  | Comunitario (Glama)
Microsoft Teams    | (remote) https://waystation.ai/teams/mcp              | Waystation (confiable)
Miro               | (remote) https://waystation.ai/miro/mcp               | Waystation (confiable)
Google Analytics   | npx -y google-analytics-mcp                           | Comunitario (registro oficial)
Meta Ads           | (remote) https://mcp.pipeboard.co/meta-ads-mcp        | Pipeboard (registro oficial)
Zoho CRM           | docker (zohocrm-mcpserver)                            | Comunitario confiable
Shippo             | npx -y @shippo/mcp-server                             | Oficial Shippo (docs)
Amazon (Seller)    | npx -y amazon-seller-mcp                              | Comunitario (registro oficial)
Upwork             | npx -y upwork-mcp                                     | Comunitario (registro oficial)
Fiverr             | npx -y fiverr-mcp-server                              | Comunitario (registro oficial)
DoorDash           | pip install doordash-mcp-server                        | Comunitario
Uber Eats          | uv run uber-eats-mcp-server                           | Comunitario (POC)
Segment            | (via Composio) composio segment                       | Composio MCP
Intercom           | npx -y intercom-mcp                                   | Comunitario
Zendesk            | npx -y zendesk-mcp                                    | Comunitario
Shopee             | npx -y shopee-mcp-server                              | Comunitario
Etsy               | npx -y etsy-mcp-server                                | Comunitario
eBay               | npx -y ebay-mcp-server                                | Comunitario
Freshsales         | (via Zapier MCP)                                      | Zapier adapter
```

### Grupo B: Apps sin MCP conocido — crear registro placeholder (~35)

Estas son apps importantes sin MCP funcional disponible. Se crearán como registros curados con homepage, descripción e icono, pero sin `install_command` (señaliza "próximamente").

```text
Alibaba, AliExpress, Temu, JD.com, Rakuten, Walmart, Zalando, Allegro, 
Cdiscount, Wayfair, Newegg, Best Buy, Target, OnBuy, Joom,
BigCommerce, Adobe Commerce, Squarespace, Wix, VTEX, Tiendanube (ya existe),
PrestaShop, OpenCart, Ecwid, SAP Commerce Cloud,
Apple Pay, Google Pay, Adyen, Klarna, Affirm, Afterpay, Wise, Nubank, 
Yape, Pix, Revolut,
Hotjar, ShipStation, EasyPost, Flexport, Rappi, PedidosYa, Instacart, 
Glovo, Alibaba.com B2B, Global Sources, IndiaMART, Faire, Handshake, 
Toptal, Freelancer, TaskRabbit
```

### Implementación

**Un solo SQL batch** (via herramienta de inserción de datos) con ~60 INSERTs usando `ON CONFLICT (slug) DO NOTHING` para no sobreescribir existentes.

Cada registro incluye:
- `slug` limpio (ej. `paypal`, `square`, `woocommerce`)
- `name` display limpio
- `category` apropiada (apis, marketing, cloud, etc.)
- `homepage` oficial
- `install_command` (vacío para Grupo B)
- `source`: `curated`
- `is_official`: `true` para MCPs oficiales
- `status`: `approved`
- `icon_url`: de Simple Icons CDN (`https://cdn.simpleicons.org/{brand}`)

**Post-inserción**: Ejecutar `fetch-connector-icons` para validar/mejorar iconos.

### Archivos a modificar
- Sin cambios de código frontend (la UI ya soporta todo)
- Solo operación de datos: SQL INSERT batch

### Resultado esperado
- 100% de las 100 apps del listado presentes en el directorio
- ~25 con MCP funcional listo para instalar
- ~35 como registros informativos con homepage e icono
- ~20 ya existían como curados

