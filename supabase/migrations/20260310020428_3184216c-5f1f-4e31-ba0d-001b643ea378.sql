
-- Goal templates for Pymaia Agent: maps business goals to capabilities and recommended tools
CREATE TABLE public.goal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  domain text NOT NULL DEFAULT 'general',
  display_name text NOT NULL,
  display_name_es text,
  description text NOT NULL DEFAULT '',
  description_es text,
  triggers text[] NOT NULL DEFAULT '{}',
  capabilities jsonb NOT NULL DEFAULT '[]',
  example_solutions jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read active templates
CREATE POLICY "Anyone can view active goal templates"
  ON public.goal_templates FOR SELECT TO public
  USING (is_active = true);

-- Admins can manage
CREATE POLICY "Admins can manage goal templates"
  ON public.goal_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role full access
CREATE POLICY "Service role goal templates"
  ON public.goal_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Insert 10 initial goal templates
INSERT INTO public.goal_templates (slug, domain, display_name, display_name_es, description, description_es, triggers, capabilities, example_solutions) VALUES
('outbound-sales', 'sales', 'Outbound Sales Automation', 'Automatización de Outbound Sales', 'Automate prospecting, lead enrichment, and cold email outreach', 'Automatizá prospección, enriquecimiento de leads y cold email', 
 ARRAY['outbound', 'cold email', 'prospecting', 'lead gen', 'SDR', 'sales automation', 'ventas'],
 '[{"name":"Lead prospecting","type":"data_source","required":true,"keywords":["prospecting","lead generation","LinkedIn","Apollo"]},{"name":"Lead enrichment","type":"data_enrichment","required":true,"keywords":["enrichment","email finder","company data"]},{"name":"Email writing","type":"content_generation","required":true,"keywords":["cold email","personalization","copywriting"]},{"name":"Email delivery","type":"action_execution","required":true,"keywords":["email send","SMTP","Resend","SendGrid"]},{"name":"Follow-up automation","type":"workflow","required":false,"keywords":["follow-up","sequence","drip"]}]'::jsonb,
 '[{"name":"Apollo + Custom emails","types":["mcp","skill","mcp"],"search_hints":["apollo","cold email","resend email"]}]'::jsonb),

('content-marketing', 'marketing', 'Content Marketing', 'Marketing de Contenidos', 'Plan, create, optimize and distribute content', 'Planificá, creá, optimizá y distribuí contenido',
 ARRAY['content', 'blog', 'social media', 'content calendar', 'contenido', 'redes sociales', 'copywriting'],
 '[{"name":"Content planning","type":"planning","required":true,"keywords":["content calendar","editorial","planning"]},{"name":"Content writing","type":"content_generation","required":true,"keywords":["blog","copywriting","article","post"]},{"name":"SEO optimization","type":"analysis","required":false,"keywords":["SEO","keyword","optimization"]},{"name":"Social publishing","type":"action_execution","required":false,"keywords":["social media","publish","schedule"]}]'::jsonb,
 '[{"name":"Full content stack","types":["skill","skill","mcp"],"search_hints":["content calendar","blog writer","social media"]}]'::jsonb),

('competitive-intel', 'strategy', 'Competitive Intelligence', 'Inteligencia Competitiva', 'Monitor competitors pricing, features, and market moves', 'Monitoreá pricing, features y movimientos del mercado de competidores',
 ARRAY['competidores', 'competitive', 'monitor', 'benchmarking', 'competitor analysis', 'market research'],
 '[{"name":"Web monitoring","type":"data_source","required":true,"keywords":["web scraping","monitoring","change detection"]},{"name":"Social listening","type":"data_source","required":false,"keywords":["social media","mentions","twitter"]},{"name":"Analysis","type":"analysis","required":true,"keywords":["analysis","comparison","report"]},{"name":"Reporting","type":"content_generation","required":true,"keywords":["report","summary","dashboard"]}]'::jsonb,
 '[{"name":"Firecrawl + Analysis","types":["mcp","skill"],"search_hints":["firecrawl","competitive analysis"]}]'::jsonb),

('dev-setup', 'engineering', 'Dev Environment Setup', 'Setup de Entorno de Desarrollo', 'Set up development tools, best practices, and workflows', 'Configurá herramientas, mejores prácticas y workflows de desarrollo',
 ARRAY['dev setup', 'development', 'nextjs', 'react', 'project setup', 'coding', 'programar', 'desarrollo'],
 '[{"name":"Framework best practices","type":"knowledge","required":true,"keywords":["react","nextjs","best practices","patterns"]},{"name":"Component generation","type":"content_generation","required":false,"keywords":["component","UI","generator"]},{"name":"Database access","type":"data_source","required":false,"keywords":["database","supabase","postgres"]},{"name":"Deployment","type":"action_execution","required":false,"keywords":["deploy","vercel","CI/CD"]}]'::jsonb,
 '[{"name":"Full dev kit","types":["skill","skill","mcp"],"search_hints":["react best practices","frontend design","supabase"]}]'::jsonb),

('customer-support', 'support', 'Customer Support Automation', 'Automatización de Soporte al Cliente', 'Automate support responses, FAQ management, and ticket routing', 'Automatizá respuestas de soporte, FAQs y ruteo de tickets',
 ARRAY['support', 'customer service', 'help desk', 'soporte', 'atención al cliente', 'tickets', 'FAQ'],
 '[{"name":"Knowledge base","type":"data_source","required":true,"keywords":["FAQ","knowledge base","documentation"]},{"name":"Response generation","type":"content_generation","required":true,"keywords":["response","reply","template"]},{"name":"Ticket management","type":"action_execution","required":false,"keywords":["ticket","zendesk","intercom"]},{"name":"Analytics","type":"analysis","required":false,"keywords":["analytics","metrics","satisfaction"]}]'::jsonb,
 '[{"name":"Support automation","types":["skill","mcp"],"search_hints":["customer support","zendesk"]}]'::jsonb),

('data-analysis', 'data', 'Data Analysis', 'Análisis de Datos', 'Analyze, visualize, and extract insights from data', 'Analizá, visualizá y extraé insights de datos',
 ARRAY['data analysis', 'analytics', 'datos', 'analizar datos', 'dashboard', 'excel', 'csv', 'SQL'],
 '[{"name":"Data extraction","type":"data_source","required":true,"keywords":["csv","excel","database","extract"]},{"name":"Analysis","type":"analysis","required":true,"keywords":["analysis","statistics","trends"]},{"name":"Visualization","type":"content_generation","required":false,"keywords":["chart","graph","visualization","dashboard"]},{"name":"Reporting","type":"content_generation","required":false,"keywords":["report","summary","insights"]}]'::jsonb,
 '[{"name":"Data stack","types":["skill","mcp"],"search_hints":["data analysis","postgres"]}]'::jsonb),

('project-management', 'operations', 'Project Management', 'Gestión de Proyectos', 'Plan sprints, track progress, and manage team workflows', 'Planificá sprints, seguí el progreso y gestioná workflows del equipo',
 ARRAY['project management', 'sprint', 'agile', 'scrum', 'jira', 'linear', 'gestión de proyectos', 'product manager'],
 '[{"name":"Sprint planning","type":"planning","required":true,"keywords":["sprint","backlog","planning","user stories"]},{"name":"Task tracking","type":"action_execution","required":false,"keywords":["jira","linear","notion","task"]},{"name":"Documentation","type":"content_generation","required":false,"keywords":["PRD","documentation","spec"]},{"name":"Reporting","type":"content_generation","required":false,"keywords":["standup","report","progress"]}]'::jsonb,
 '[{"name":"PM toolkit","types":["skill","mcp","skill"],"search_hints":["sprint planning","linear","PRD generator"]}]'::jsonb),

('design-workflow', 'design', 'Design Workflow', 'Flujo de Diseño', 'Streamline UI/UX design with components, specs, and guidelines', 'Optimizá el diseño UI/UX con componentes, specs y guidelines',
 ARRAY['design', 'UI', 'UX', 'figma', 'diseño', 'interfaz', 'componentes', 'tailwind'],
 '[{"name":"Design system","type":"knowledge","required":true,"keywords":["design system","components","UI","guidelines"]},{"name":"Prototyping","type":"content_generation","required":false,"keywords":["prototype","wireframe","mockup"]},{"name":"Accessibility","type":"analysis","required":false,"keywords":["accessibility","a11y","WCAG"]},{"name":"Design tools","type":"action_execution","required":false,"keywords":["figma","sketch","design tool"]}]'::jsonb,
 '[{"name":"Design kit","types":["skill","skill"],"search_hints":["web design guidelines","UI UX"]}]'::jsonb),

('qa-testing', 'engineering', 'QA & Testing', 'QA y Testing', 'Automate testing, generate test cases, and improve code quality', 'Automatizá testing, generá casos de prueba y mejorá la calidad del código',
 ARRAY['testing', 'QA', 'test', 'quality', 'bug', 'automatizar tests', 'unit test', 'e2e'],
 '[{"name":"Test generation","type":"content_generation","required":true,"keywords":["test","unit test","e2e","test case"]},{"name":"Code analysis","type":"analysis","required":false,"keywords":["lint","code review","static analysis"]},{"name":"CI/CD","type":"action_execution","required":false,"keywords":["CI","pipeline","github actions"]},{"name":"Bug reporting","type":"content_generation","required":false,"keywords":["bug report","issue","reproduction"]}]'::jsonb,
 '[{"name":"QA automation","types":["skill","mcp"],"search_hints":["testing","github"]}]'::jsonb),

('reporting', 'operations', 'Business Reporting', 'Reportes de Negocio', 'Generate professional reports, presentations, and dashboards', 'Generá reportes profesionales, presentaciones y dashboards',
 ARRAY['report', 'reporting', 'presentación', 'presentation', 'dashboard', 'KPI', 'métricas', 'slide', 'powerpoint', 'pptx'],
 '[{"name":"Data gathering","type":"data_source","required":true,"keywords":["data","metrics","KPI","analytics"]},{"name":"Report generation","type":"content_generation","required":true,"keywords":["report","document","PDF","PPTX"]},{"name":"Visualization","type":"content_generation","required":false,"keywords":["chart","dashboard","graph"]},{"name":"Distribution","type":"action_execution","required":false,"keywords":["email","share","publish"]}]'::jsonb,
 '[{"name":"Reporting stack","types":["skill","skill"],"search_hints":["PPTX","report generator"]}]'::jsonb);
