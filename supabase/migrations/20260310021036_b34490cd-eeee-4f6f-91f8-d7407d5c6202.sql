
-- Compatibility matrix for Phase 1: Smart Composition
CREATE TABLE public.compatibility_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_a_slug text NOT NULL,
  item_a_type text NOT NULL DEFAULT 'skill', -- skill, connector, plugin
  item_b_slug text NOT NULL,
  item_b_type text NOT NULL DEFAULT 'skill',
  status text NOT NULL DEFAULT 'compatible', -- recommended, compatible, redundant, conflict
  reason text NOT NULL DEFAULT '',
  data_flow text, -- describes how data flows between items
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_a_slug, item_b_slug)
);

ALTER TABLE public.compatibility_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view compatibility"
  ON public.compatibility_matrix FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage compatibility"
  ON public.compatibility_matrix FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role compatibility"
  ON public.compatibility_matrix FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Recommendation feedback table
CREATE TABLE public.recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text NOT NULL,
  matched_template_slug text,
  recommended_slugs text[] NOT NULL DEFAULT '{}',
  chosen_option text, -- A, B, or null
  rating integer, -- 1-5
  comment text,
  user_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.recommendation_feedback FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view feedback"
  ON public.recommendation_feedback FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role feedback"
  ON public.recommendation_feedback FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed compatibility matrix with 50+ pairs
INSERT INTO public.compatibility_matrix (item_a_slug, item_a_type, item_b_slug, item_b_type, status, reason, data_flow) VALUES
-- Sales workflow pairs
('apollo-io', 'connector', 'cold-email-personalization-engine', 'skill', 'recommended', 'Apollo provides lead data that the skill uses for email personalization', 'Apollo → lead data → Cold Email Skill → personalized email'),
('apollo-io', 'connector', 'resend', 'connector', 'recommended', 'Apollo finds leads, Resend delivers emails', 'Apollo → leads → compose email → Resend → delivery'),
('cold-email-personalization-engine', 'skill', 'resend', 'connector', 'recommended', 'Skill generates emails, Resend sends them', 'Skill → email content → Resend → delivery'),
('follow-up-sequence-writer', 'skill', 'resend', 'connector', 'recommended', 'Skill writes follow-ups, Resend delivers', 'Skill → sequence → Resend → timed delivery'),
('hubspot', 'connector', 'apollo-io', 'connector', 'compatible', 'Both handle CRM data, can complement each other', NULL),
('salesforce', 'connector', 'hubspot', 'connector', 'redundant', 'Both are CRMs - choose one', NULL),

-- Dev workflow pairs
('supabase', 'connector', 'postgres', 'connector', 'conflict', 'Supabase already includes Postgres access', NULL),
('supabase', 'connector', 'nextjs-dev-kit', 'plugin', 'recommended', 'Supabase provides backend, Next.js the frontend', 'Next.js → API calls → Supabase → data'),
('github', 'connector', 'vercel', 'connector', 'recommended', 'GitHub hosts code, Vercel deploys it', 'GitHub → push → Vercel → deploy'),
('tailwind-css-assistant', 'skill', 'nextjs-dev-kit', 'plugin', 'recommended', 'Tailwind handles styling within Next.js projects', NULL),
('react-component-generator', 'skill', 'tailwind-css-assistant', 'skill', 'recommended', 'Generate components then style with Tailwind', 'Generator → component → Tailwind → styled'),
('testing-skill', 'skill', 'react-component-generator', 'skill', 'recommended', 'Generate components then test them', NULL),
('eslint-config', 'skill', 'prettier-config', 'skill', 'compatible', 'Linting and formatting complement each other', NULL),
('docker', 'connector', 'kubernetes', 'connector', 'recommended', 'Docker builds containers, K8s orchestrates them', 'Docker → image → K8s → orchestration'),

-- Content & Marketing pairs
('content-calendar-planner', 'skill', 'blog-post-writer-pro', 'skill', 'recommended', 'Plan content then generate it', 'Calendar → topics → Writer → drafts'),
('blog-post-writer-pro', 'skill', 'seo-content-optimizer', 'skill', 'recommended', 'Write content then optimize for SEO', 'Writer → draft → SEO → optimized'),
('seo-content-optimizer', 'skill', 'google-analytics', 'connector', 'recommended', 'Optimize content then track performance', 'SEO → publish → Analytics → track'),
('social-media-scheduler', 'skill', 'buffer', 'connector', 'recommended', 'Plan posts then schedule via Buffer', 'Scheduler → plan → Buffer → publish'),
('buffer', 'connector', 'hootsuite', 'connector', 'redundant', 'Both handle social media scheduling - choose one', NULL),
('copywriter-pro', 'skill', 'content-calendar-planner', 'skill', 'compatible', 'Copy supports content calendar execution', NULL),

-- Data & Analytics pairs
('firecrawl', 'connector', 'browserbase', 'connector', 'redundant', 'Both do web scraping - choose one', NULL),
('firecrawl', 'connector', 'competitive-analysis-summarizer', 'skill', 'recommended', 'Firecrawl scrapes data, skill analyzes it', 'Firecrawl → raw data → Analyzer → insights'),
('google-sheets', 'connector', 'data-visualization', 'skill', 'recommended', 'Sheets stores data, skill visualizes it', 'Sheets → data → Viz → charts'),
('notion', 'connector', 'prd-generator', 'skill', 'recommended', 'Generate PRDs and save to Notion', 'PRD Skill → document → Notion → organized'),
('linear', 'connector', 'sprint-planning-assistant', 'skill', 'recommended', 'Plan sprints and sync to Linear', 'Planning → tasks → Linear → tracked'),
('jira', 'connector', 'linear', 'connector', 'redundant', 'Both are project management tools - choose one', NULL),
('jira', 'connector', 'sprint-planning-assistant', 'skill', 'recommended', 'Plan sprints and sync to Jira', NULL),

-- Design pairs
('figma', 'connector', 'react-component-generator', 'skill', 'recommended', 'Design in Figma, generate React components', 'Figma → design → Generator → code'),
('figma', 'connector', 'tailwind-css-assistant', 'skill', 'compatible', 'Figma designs can reference Tailwind tokens', NULL),
('a11y-checker', 'skill', 'react-component-generator', 'skill', 'recommended', 'Generate components then check accessibility', NULL),

-- AI & Automation pairs
('openai', 'connector', 'langchain', 'plugin', 'recommended', 'OpenAI provides models, LangChain orchestrates', 'LangChain → prompt → OpenAI → response'),
('anthropic-claude', 'connector', 'langchain', 'plugin', 'compatible', 'Alternative model provider for LangChain', NULL),
('openai', 'connector', 'anthropic-claude', 'connector', 'redundant', 'Both provide LLM inference - usually choose one', NULL),
('n8n', 'connector', 'zapier', 'connector', 'redundant', 'Both are workflow automation - choose one', NULL),
('n8n', 'connector', 'make', 'connector', 'redundant', 'Both are workflow automation - choose one', NULL),

-- Communication pairs
('slack', 'connector', 'discord', 'connector', 'compatible', 'Different communication platforms, can complement', NULL),
('slack', 'connector', 'email-notifications', 'skill', 'compatible', 'Different notification channels', NULL),
('gmail', 'connector', 'resend', 'connector', 'redundant', 'Both handle email - Gmail for personal, Resend for transactional', NULL),
('twilio', 'connector', 'whatsapp-business', 'connector', 'compatible', 'SMS and WhatsApp complement each other', NULL),

-- Legal pairs
('contract-reviewer', 'skill', 'legal-document-generator', 'skill', 'recommended', 'Generate then review legal documents', 'Generator → draft → Reviewer → validated'),
('privacy-policy-generator', 'skill', 'gdpr-compliance-checker', 'skill', 'recommended', 'Generate policy then check compliance', 'Generator → policy → Checker → compliant'),

-- Product pairs
('prd-generator', 'skill', 'user-story-writer', 'skill', 'recommended', 'Generate PRD then break into user stories', 'PRD → requirements → User Stories → backlog'),
('user-story-writer', 'skill', 'sprint-planning-assistant', 'skill', 'recommended', 'Write stories then plan sprints', 'Stories → backlog → Sprint Plan → execution'),
('competitor-feature-matrix', 'skill', 'prd-generator', 'skill', 'compatible', 'Competitive analysis informs PRD creation', NULL),
('release-notes-drafter', 'skill', 'changelog-generator', 'skill', 'redundant', 'Both generate release documentation - choose one', NULL),

-- Security pairs
('snyk', 'connector', 'dependabot', 'connector', 'redundant', 'Both scan for vulnerabilities - choose one', NULL),
('vault', 'connector', 'aws-secrets-manager', 'connector', 'redundant', 'Both manage secrets - choose one', NULL),

-- Finance & Business
('stripe', 'connector', 'invoice-generator', 'skill', 'recommended', 'Stripe handles payments, skill generates invoices', 'Stripe → payment data → Invoice → PDF'),
('quickbooks', 'connector', 'financial-reporter', 'skill', 'recommended', 'QuickBooks provides data, skill generates reports', 'QuickBooks → financial data → Reporter → insights'),
('pitch-deck-generator', 'skill', 'financial-model', 'skill', 'recommended', 'Financial model informs pitch deck numbers', 'Model → projections → Pitch Deck → presentation');

-- Add 20 additional goal templates
INSERT INTO public.goal_templates (slug, domain, display_name, display_name_es, description, description_es, triggers, capabilities, example_solutions) VALUES
('customer-support-automation', 'support', 'Customer Support Automation', 'Automatización de Soporte al Cliente', 'Set up AI-powered customer support with ticket routing and auto-responses', 'Configura soporte al cliente con IA, enrutamiento de tickets y respuestas automáticas',
  ARRAY['support', 'customer service', 'helpdesk', 'tickets', 'soporte', 'atencion al cliente', 'chatbot'],
  '[{"name":"Ticket management","type":"data_source","required":true,"keywords":["helpdesk","ticket","zendesk","freshdesk"]},{"name":"Auto-response","type":"content_generation","required":true,"keywords":["chatbot","auto reply","response template"]},{"name":"Knowledge base","type":"data_source","required":false,"keywords":["knowledge base","FAQ","documentation"]},{"name":"Analytics","type":"analysis","required":false,"keywords":["support analytics","satisfaction","CSAT"]}]'::jsonb,
  '[{"name":"Zendesk + AI Responder","items":["zendesk-mcp","support-responder-skill"]}]'::jsonb),

('data-pipeline', 'engineering', 'Data Pipeline Setup', 'Configuración de Pipeline de Datos', 'Build ETL/ELT pipelines for data transformation and loading', 'Construye pipelines ETL/ELT para transformación y carga de datos',
  ARRAY['data pipeline', 'ETL', 'ELT', 'data warehouse', 'data lake', 'pipeline de datos', 'transformacion'],
  '[{"name":"Data extraction","type":"data_source","required":true,"keywords":["extract","scrape","API","connector"]},{"name":"Data transformation","type":"data_enrichment","required":true,"keywords":["transform","clean","normalize","dbt"]},{"name":"Data loading","type":"action_execution","required":true,"keywords":["load","warehouse","bigquery","snowflake"]},{"name":"Orchestration","type":"workflow","required":false,"keywords":["airflow","dagster","schedule","cron"]}]'::jsonb,
  '[]'::jsonb),

('social-media-management', 'marketing', 'Social Media Management', 'Gestión de Redes Sociales', 'Plan, create, schedule and analyze social media content', 'Planifica, crea, programa y analiza contenido en redes sociales',
  ARRAY['social media', 'redes sociales', 'instagram', 'twitter', 'linkedin post', 'social content', 'community management'],
  '[{"name":"Content planning","type":"planning","required":true,"keywords":["content calendar","social planner","editorial"]},{"name":"Content creation","type":"content_generation","required":true,"keywords":["copywriting","social post","caption","hashtag"]},{"name":"Scheduling","type":"action_execution","required":true,"keywords":["schedule","publish","buffer","hootsuite"]},{"name":"Analytics","type":"analysis","required":false,"keywords":["social analytics","engagement","reach","impressions"]}]'::jsonb,
  '[]'::jsonb),

('code-review-automation', 'engineering', 'Code Review Automation', 'Automatización de Code Review', 'Automate code reviews with AI-powered analysis and suggestions', 'Automatiza code reviews con análisis y sugerencias impulsados por IA',
  ARRAY['code review', 'pull request', 'PR review', 'code quality', 'revision de codigo', 'linting'],
  '[{"name":"Static analysis","type":"analysis","required":true,"keywords":["lint","eslint","sonarqube","static analysis"]},{"name":"AI review","type":"content_generation","required":true,"keywords":["code review","AI review","suggestions","improvements"]},{"name":"Testing","type":"analysis","required":false,"keywords":["test","coverage","unit test","integration"]},{"name":"CI integration","type":"action_execution","required":false,"keywords":["CI","github actions","gitlab CI","pipeline"]}]'::jsonb,
  '[]'::jsonb),

('email-marketing-campaign', 'marketing', 'Email Marketing Campaign', 'Campaña de Email Marketing', 'Design, write, and automate email marketing campaigns', 'Diseña, escribe y automatiza campañas de email marketing',
  ARRAY['email marketing', 'newsletter', 'email campaign', 'drip campaign', 'campaña email', 'mailchimp', 'email automation'],
  '[{"name":"Email design","type":"content_generation","required":true,"keywords":["email template","newsletter design","HTML email"]},{"name":"Copywriting","type":"content_generation","required":true,"keywords":["email copy","subject line","CTA","persuasive"]},{"name":"List management","type":"data_source","required":true,"keywords":["email list","segmentation","subscriber","mailchimp"]},{"name":"Automation","type":"workflow","required":false,"keywords":["drip","sequence","automation","trigger"]}]'::jsonb,
  '[]'::jsonb),

('api-documentation', 'engineering', 'API Documentation', 'Documentación de API', 'Generate and maintain comprehensive API documentation', 'Genera y mantiene documentación de API completa',
  ARRAY['api docs', 'documentation', 'swagger', 'openapi', 'documentacion', 'api reference'],
  '[{"name":"Doc generation","type":"content_generation","required":true,"keywords":["swagger","openapi","api doc","documentation generator"]},{"name":"Code examples","type":"content_generation","required":true,"keywords":["code example","snippet","SDK","client"]},{"name":"Hosting","type":"action_execution","required":false,"keywords":["gitbook","readme","docusaurus","docs hosting"]}]'::jsonb,
  '[]'::jsonb),

('seo-optimization', 'marketing', 'SEO Optimization', 'Optimización SEO', 'Analyze and optimize website content for search engines', 'Analiza y optimiza contenido web para motores de búsqueda',
  ARRAY['SEO', 'search engine', 'keywords', 'ranking', 'posicionamiento', 'google ranking', 'organic traffic'],
  '[{"name":"Keyword research","type":"analysis","required":true,"keywords":["keyword","search volume","competition","semrush","ahrefs"]},{"name":"On-page optimization","type":"content_generation","required":true,"keywords":["meta tags","title tag","heading","schema markup"]},{"name":"Content optimization","type":"content_generation","required":true,"keywords":["content score","readability","keyword density"]},{"name":"Technical SEO","type":"analysis","required":false,"keywords":["site speed","crawl","robots.txt","sitemap"]}]'::jsonb,
  '[]'::jsonb),

('financial-reporting', 'finance', 'Financial Reporting', 'Reportes Financieros', 'Generate financial reports, dashboards and analysis', 'Genera reportes financieros, dashboards y análisis',
  ARRAY['financial report', 'reporte financiero', 'balance sheet', 'P&L', 'income statement', 'financial analysis', 'contabilidad'],
  '[{"name":"Data extraction","type":"data_source","required":true,"keywords":["quickbooks","xero","accounting","financial data"]},{"name":"Analysis","type":"analysis","required":true,"keywords":["financial analysis","ratio","trend","forecast"]},{"name":"Report generation","type":"content_generation","required":true,"keywords":["report","dashboard","chart","visualization"]},{"name":"Export","type":"action_execution","required":false,"keywords":["PDF","export","share","email report"]}]'::jsonb,
  '[]'::jsonb),

('onboarding-workflow', 'hr', 'Employee Onboarding', 'Onboarding de Empleados', 'Automate new employee onboarding process', 'Automatiza el proceso de onboarding de nuevos empleados',
  ARRAY['onboarding', 'new hire', 'employee', 'incorporacion', 'nuevo empleado', 'welcome'],
  '[{"name":"Task management","type":"workflow","required":true,"keywords":["checklist","task","onboarding steps","process"]},{"name":"Document generation","type":"content_generation","required":true,"keywords":["welcome letter","handbook","policy","document"]},{"name":"Communication","type":"action_execution","required":true,"keywords":["email","slack","notification","welcome message"]},{"name":"Training","type":"data_source","required":false,"keywords":["training","learning","LMS","course"]}]'::jsonb,
  '[]'::jsonb),

('ci-cd-pipeline', 'engineering', 'CI/CD Pipeline', 'Pipeline CI/CD', 'Set up continuous integration and deployment pipelines', 'Configura pipelines de integración y despliegue continuo',
  ARRAY['CI/CD', 'continuous integration', 'deployment', 'pipeline', 'devops', 'github actions', 'deploy'],
  '[{"name":"Build automation","type":"workflow","required":true,"keywords":["build","compile","bundle","webpack","vite"]},{"name":"Testing","type":"analysis","required":true,"keywords":["test","jest","vitest","cypress","e2e"]},{"name":"Deployment","type":"action_execution","required":true,"keywords":["deploy","vercel","netlify","aws","docker"]},{"name":"Monitoring","type":"analysis","required":false,"keywords":["monitor","alert","log","observability"]}]'::jsonb,
  '[]'::jsonb),

('lead-scoring', 'sales', 'Lead Scoring & Qualification', 'Scoring y Calificación de Leads', 'Score and qualify leads automatically based on behavior and data', 'Califica leads automáticamente basándose en comportamiento y datos',
  ARRAY['lead scoring', 'lead qualification', 'MQL', 'SQL', 'calificacion de leads', 'scoring', 'lead nurturing'],
  '[{"name":"CRM integration","type":"data_source","required":true,"keywords":["CRM","hubspot","salesforce","pipeline"]},{"name":"Scoring model","type":"analysis","required":true,"keywords":["score","model","qualification","criteria"]},{"name":"Enrichment","type":"data_enrichment","required":true,"keywords":["enrich","clearbit","apollo","company data"]},{"name":"Notifications","type":"action_execution","required":false,"keywords":["alert","notify","slack","email alert"]}]'::jsonb,
  '[]'::jsonb),

('brand-guidelines', 'design', 'Brand Guidelines Creation', 'Creación de Guías de Marca', 'Create comprehensive brand guidelines and design systems', 'Crea guías de marca y sistemas de diseño completos',
  ARRAY['brand guidelines', 'guia de marca', 'brand identity', 'design system', 'style guide', 'branding'],
  '[{"name":"Visual identity","type":"content_generation","required":true,"keywords":["logo","color palette","typography","visual identity"]},{"name":"Design system","type":"content_generation","required":true,"keywords":["design system","component library","tokens","spacing"]},{"name":"Documentation","type":"content_generation","required":true,"keywords":["guidelines","brand book","usage rules","documentation"]},{"name":"Asset management","type":"data_source","required":false,"keywords":["asset","figma","sketch","storage"]}]'::jsonb,
  '[]'::jsonb),

('security-audit', 'engineering', 'Security Audit', 'Auditoría de Seguridad', 'Perform security audits on code, dependencies, and infrastructure', 'Realiza auditorías de seguridad en código, dependencias e infraestructura',
  ARRAY['security audit', 'vulnerability', 'penetration test', 'auditoria', 'seguridad', 'vulnerabilidad', 'OWASP'],
  '[{"name":"Dependency scanning","type":"analysis","required":true,"keywords":["snyk","dependabot","CVE","vulnerability scan"]},{"name":"Code analysis","type":"analysis","required":true,"keywords":["SAST","code scan","security review","sonarqube"]},{"name":"Infrastructure","type":"analysis","required":false,"keywords":["cloud security","IAM","network","firewall"]},{"name":"Reporting","type":"content_generation","required":true,"keywords":["security report","findings","remediation","compliance"]}]'::jsonb,
  '[]'::jsonb),

('ecommerce-setup', 'business', 'E-commerce Setup', 'Configuración de E-commerce', 'Set up an e-commerce store with payments, inventory, and shipping', 'Configura una tienda e-commerce con pagos, inventario y envíos',
  ARRAY['ecommerce', 'e-commerce', 'tienda online', 'online store', 'shopify', 'stripe payments', 'carrito'],
  '[{"name":"Payment processing","type":"action_execution","required":true,"keywords":["stripe","payment","checkout","billing"]},{"name":"Product catalog","type":"data_source","required":true,"keywords":["product","catalog","inventory","SKU"]},{"name":"Shipping","type":"action_execution","required":false,"keywords":["shipping","fulfillment","tracking","logistics"]},{"name":"Analytics","type":"analysis","required":false,"keywords":["sales analytics","conversion","revenue","cart"]}]'::jsonb,
  '[]'::jsonb),

('meeting-automation', 'productivity', 'Meeting Automation', 'Automatización de Reuniones', 'Automate meeting scheduling, notes, and follow-ups', 'Automatiza programación de reuniones, notas y seguimiento',
  ARRAY['meeting', 'reunion', 'calendario', 'meeting notes', 'agenda', 'minutes', 'follow-up meeting'],
  '[{"name":"Scheduling","type":"action_execution","required":true,"keywords":["calendar","scheduling","calendly","availability"]},{"name":"Notes & transcription","type":"content_generation","required":true,"keywords":["meeting notes","transcription","summary","minutes"]},{"name":"Action items","type":"content_generation","required":true,"keywords":["action items","tasks","follow-up","todo"]},{"name":"Integration","type":"action_execution","required":false,"keywords":["slack","email","calendar invite","notification"]}]'::jsonb,
  '[]'::jsonb),

('content-localization', 'marketing', 'Content Localization', 'Localización de Contenido', 'Translate and localize content for different markets', 'Traduce y localiza contenido para diferentes mercados',
  ARRAY['localization', 'translation', 'i18n', 'traduccion', 'internacionalizacion', 'multilingual', 'multi-idioma'],
  '[{"name":"Translation","type":"content_generation","required":true,"keywords":["translate","translation","deepl","language"]},{"name":"Cultural adaptation","type":"content_generation","required":true,"keywords":["localize","adapt","cultural","regional"]},{"name":"Quality review","type":"analysis","required":false,"keywords":["proofread","quality","review","native speaker"]},{"name":"CMS integration","type":"action_execution","required":false,"keywords":["CMS","contentful","sanity","headless"]}]'::jsonb,
  '[]'::jsonb),

('database-optimization', 'engineering', 'Database Optimization', 'Optimización de Base de Datos', 'Optimize database queries, indexes, and performance', 'Optimiza consultas, índices y rendimiento de base de datos',
  ARRAY['database', 'SQL', 'query optimization', 'index', 'base de datos', 'performance', 'slow query'],
  '[{"name":"Query analysis","type":"analysis","required":true,"keywords":["query plan","explain","slow query","performance"]},{"name":"Index optimization","type":"analysis","required":true,"keywords":["index","b-tree","covering index","composite"]},{"name":"Schema design","type":"content_generation","required":false,"keywords":["schema","normalize","denormalize","migration"]},{"name":"Monitoring","type":"analysis","required":false,"keywords":["monitor","dashboard","alerts","metrics"]}]'::jsonb,
  '[]'::jsonb),

('investor-reporting', 'finance', 'Investor Reporting', 'Reportes para Inversores', 'Generate professional investor updates and board reports', 'Genera reportes profesionales para inversores y board',
  ARRAY['investor update', 'board report', 'reporte inversores', 'pitch', 'fundraising', 'venture capital', 'startup metrics'],
  '[{"name":"Metrics dashboard","type":"analysis","required":true,"keywords":["KPI","metrics","MRR","ARR","churn","growth"]},{"name":"Report generation","type":"content_generation","required":true,"keywords":["investor update","board deck","report","narrative"]},{"name":"Financial data","type":"data_source","required":true,"keywords":["revenue","expenses","runway","burn rate"]},{"name":"Distribution","type":"action_execution","required":false,"keywords":["email","share","PDF","presentation"]}]'::jsonb,
  '[]'::jsonb),

('testing-automation', 'engineering', 'Testing Automation', 'Automatización de Testing', 'Set up automated testing for web applications', 'Configura testing automatizado para aplicaciones web',
  ARRAY['testing', 'test automation', 'QA', 'quality assurance', 'e2e test', 'unit test', 'pruebas automatizadas'],
  '[{"name":"Unit testing","type":"analysis","required":true,"keywords":["unit test","jest","vitest","mocha","assertion"]},{"name":"E2E testing","type":"analysis","required":true,"keywords":["e2e","cypress","playwright","selenium","browser test"]},{"name":"CI integration","type":"workflow","required":true,"keywords":["CI","github actions","pipeline","automation"]},{"name":"Coverage","type":"analysis","required":false,"keywords":["coverage","istanbul","c8","threshold"]}]'::jsonb,
  '[]'::jsonb),

('customer-feedback', 'product', 'Customer Feedback Analysis', 'Análisis de Feedback de Clientes', 'Collect, analyze and act on customer feedback', 'Recolecta, analiza y actúa sobre el feedback de clientes',
  ARRAY['feedback', 'customer feedback', 'NPS', 'survey', 'encuesta', 'user research', 'voice of customer'],
  '[{"name":"Collection","type":"data_source","required":true,"keywords":["survey","form","feedback widget","typeform","intercom"]},{"name":"Analysis","type":"analysis","required":true,"keywords":["sentiment","NPS","categorize","theme","trend"]},{"name":"Reporting","type":"content_generation","required":true,"keywords":["report","dashboard","insights","summary"]},{"name":"Action routing","type":"workflow","required":false,"keywords":["ticket","task","notify","escalate"]}]'::jsonb,
  '[]'::jsonb);
