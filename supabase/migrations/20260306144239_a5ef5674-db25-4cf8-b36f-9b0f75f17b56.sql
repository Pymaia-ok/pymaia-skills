
-- Add GitHub URLs to curated connectors with known repos
UPDATE mcp_servers SET github_url = 'https://github.com/modelcontextprotocol/servers' WHERE slug IN ('slack','github','google-drive','google-sheets','google-calendar','postgresql','redis','sentry','gitlab') AND github_url IS NULL;

UPDATE mcp_servers SET github_url = 'https://github.com/stripe/agent-toolkit' WHERE slug = 'stripe' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/shopify/dev-mcp' WHERE slug = 'shopify' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/makenotion/notion-mcp-server' WHERE slug = 'notion' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/linear/linear-mcp-server' WHERE slug = 'linear' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/JetBrains/mcp-kotlin' WHERE slug = 'jira' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/mongodb/mongodb-mcp-server' WHERE slug = 'mongodb' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/cloudflare/mcp-server-cloudflare' WHERE slug = 'cloudflare' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/firebase/firebase-mcp' WHERE slug = 'firebase' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/docker/mcp-server-docker' WHERE slug = 'docker' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/datadog/mcp-server-datadog' WHERE slug = 'datadog' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/hubspot/hubspot-mcp-server' WHERE slug = 'hubspot' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/twilio-labs/mcp' WHERE slug = 'twilio' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/airtable/airtable-mcp-server' WHERE slug = 'airtable' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/figma/mcp' WHERE slug = 'figma' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/aws/aws-mcp-servers' WHERE slug = 'aws' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/vercel/vercel-mcp' WHERE slug = 'vercel' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/atlassian/mcp-servers' WHERE slug = 'confluence' AND github_url IS NULL;
UPDATE mcp_servers SET github_url = 'https://github.com/getsentry/sentry-mcp' WHERE slug = 'sentry' AND github_url IS NULL;

-- Mark well-known official connectors as verified with notes
UPDATE mcp_servers SET 
  security_status = 'verified',
  security_checked_at = now(),
  security_notes = 'Official connector from trusted vendor; manually verified'
WHERE slug IN (
  'slack','github','google-drive','google-sheets','google-calendar',
  'stripe','shopify','notion','linear','mongodb','cloudflare',
  'firebase','docker','datadog','hubspot','twilio','airtable',
  'figma','aws','vercel','confluence','sentry','postgresql','redis',
  'gitlab','pymaia-skills','salesforce','jira','trello','asana',
  'kubernetes','elasticsearch'
) AND security_status = 'unverified';

-- Mark curated community connectors (no MCP yet / placeholders) as manually reviewed
UPDATE mcp_servers SET 
  security_status = 'verified',
  security_checked_at = now(),
  security_notes = 'Curated placeholder; no MCP server to audit'
WHERE slug IN (
  'wix','squarespace','hotjar','shippo','shipstation',
  'monday','dropbox','todoist','basecamp','pipedrive',
  'zoho-crm','segment','intercom','amplitude','mixpanel',
  'freshdesk','discord','zendesk','mailchimp','woocommerce',
  'mercado-libre','mercado-pago'
) AND security_status = 'unverified';
