
CREATE TABLE public.mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  description_es text,
  category text NOT NULL DEFAULT 'general',
  install_command text NOT NULL DEFAULT '',
  config_json jsonb DEFAULT '{}'::jsonb,
  credentials_needed text[] NOT NULL DEFAULT '{}',
  docs_url text,
  icon_url text,
  install_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved connectors"
  ON public.mcp_servers FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can manage connectors"
  ON public.mcp_servers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed popular connectors
INSERT INTO public.mcp_servers (name, slug, description, description_es, category, install_command, credentials_needed, docs_url, icon_url) VALUES
('Gmail', 'gmail', 'Read, send and manage emails directly from your AI assistant.', 'Leé, enviá y gestioná emails directamente desde tu asistente IA.', 'communication', 'npx -y @anthropic/mcp-gmail', ARRAY['GMAIL_OAUTH_CLIENT_ID', 'GMAIL_OAUTH_CLIENT_SECRET'], 'https://developers.google.com/gmail/api', 'https://cdn.simpleicons.org/gmail'),
('GitHub', 'github', 'Access repos, issues, PRs and code directly from your AI.', 'Accedé a repos, issues, PRs y código directamente desde tu IA.', 'development', 'npx -y @modelcontextprotocol/server-github', ARRAY['GITHUB_TOKEN'], 'https://github.com/modelcontextprotocol/servers', 'https://cdn.simpleicons.org/github'),
('Slack', 'slack', 'Send messages, read channels and manage your Slack workspace with AI.', 'Enviá mensajes, leé canales y gestioná tu workspace de Slack con IA.', 'communication', 'npx -y @anthropic/mcp-slack', ARRAY['SLACK_BOT_TOKEN'], 'https://api.slack.com/', 'https://cdn.simpleicons.org/slack'),
('PostgreSQL', 'postgresql', 'Query and manage PostgreSQL databases with natural language.', 'Consultá y gestioná bases de datos PostgreSQL con lenguaje natural.', 'databases', 'npx -y @anthropic/mcp-postgres', ARRAY['DATABASE_URL'], 'https://www.postgresql.org/docs/', 'https://cdn.simpleicons.org/postgresql'),
('Google Drive', 'google-drive', 'Search, read and organize files in Google Drive.', 'Buscá, leé y organizá archivos en Google Drive.', 'productivity', 'npx -y @anthropic/mcp-gdrive', ARRAY['GDRIVE_OAUTH_CLIENT_ID', 'GDRIVE_OAUTH_CLIENT_SECRET'], 'https://developers.google.com/drive', 'https://cdn.simpleicons.org/googledrive'),
('Notion', 'notion', 'Read and update Notion pages and databases.', 'Leé y actualizá páginas y bases de datos de Notion.', 'productivity', 'npx -y @anthropic/mcp-notion', ARRAY['NOTION_API_KEY'], 'https://developers.notion.com/', 'https://cdn.simpleicons.org/notion'),
('Brave Search', 'brave-search', 'Web search powered by Brave for real-time information.', 'Búsqueda web con Brave para información en tiempo real.', 'search', 'npx -y @anthropic/mcp-brave-search', ARRAY['BRAVE_API_KEY'], 'https://brave.com/search/api/', 'https://cdn.simpleicons.org/brave'),
('Filesystem', 'filesystem', 'Read, write and manage local files securely.', 'Leé, escribí y gestioná archivos locales de forma segura.', 'utilities', 'npx -y @anthropic/mcp-filesystem', '{}', 'https://github.com/modelcontextprotocol/servers', 'https://cdn.simpleicons.org/files'),
('Puppeteer', 'puppeteer', 'Automate browser interactions, scrape web pages and take screenshots.', 'Automatizá interacciones del navegador, scrapeá páginas y sacá capturas.', 'automation', 'npx -y @anthropic/mcp-puppeteer', '{}', 'https://pptr.dev/', 'https://cdn.simpleicons.org/puppeteer'),
('Stripe', 'stripe', 'Manage payments, subscriptions and customers with AI.', 'Gestioná pagos, suscripciones y clientes con IA.', 'apis', 'npx -y @stripe/mcp-stripe', ARRAY['STRIPE_SECRET_KEY'], 'https://stripe.com/docs/api', 'https://cdn.simpleicons.org/stripe'),
('Shopify', 'shopify', 'Manage products, orders and your store from AI.', 'Gestioná productos, pedidos y tu tienda desde IA.', 'apis', 'npx -y @anthropic/mcp-shopify', ARRAY['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_STORE_URL'], 'https://shopify.dev/', 'https://cdn.simpleicons.org/shopify'),
('Linear', 'linear', 'Manage issues, projects and cycles in Linear.', 'Gestioná issues, proyectos y ciclos en Linear.', 'development', 'npx -y @anthropic/mcp-linear', ARRAY['LINEAR_API_KEY'], 'https://linear.app/docs', 'https://cdn.simpleicons.org/linear');
