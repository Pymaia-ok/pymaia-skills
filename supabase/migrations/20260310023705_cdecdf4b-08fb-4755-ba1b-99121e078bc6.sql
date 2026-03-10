
-- Phase 4: Platform tables

-- Community goal template submissions
CREATE TABLE public.community_goal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL,
  display_name text NOT NULL,
  domain text NOT NULL DEFAULT 'general',
  description text NOT NULL DEFAULT '',
  triggers text[] NOT NULL DEFAULT '{}',
  capabilities jsonb NOT NULL DEFAULT '[]',
  example_solutions jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  upvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slug)
);

ALTER TABLE public.community_goal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved community templates" ON public.community_goal_templates
  FOR SELECT TO public USING (status = 'approved');

CREATE POLICY "Authenticated users can submit templates" ON public.community_goal_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending templates" ON public.community_goal_templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can manage community templates" ON public.community_goal_templates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role community templates" ON public.community_goal_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enterprise catalogs
CREATE TABLE public.enterprise_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_slug text NOT NULL UNIQUE,
  owner_user_id uuid NOT NULL,
  description text DEFAULT '',
  private_tool_slugs text[] NOT NULL DEFAULT '{}',
  allowed_domains text[] NOT NULL DEFAULT '{}',
  custom_goal_templates jsonb NOT NULL DEFAULT '[]',
  settings jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own catalog" ON public.enterprise_catalogs
  FOR ALL TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admins can manage all catalogs" ON public.enterprise_catalogs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role enterprise catalogs" ON public.enterprise_catalogs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Agent analytics events  
CREATE TABLE public.agent_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}',
  tool_name text,
  goal text,
  items_recommended text[] DEFAULT '{}',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics" ON public.agent_analytics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role analytics" ON public.agent_analytics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can insert analytics" ON public.agent_analytics
  FOR INSERT TO anon, authenticated WITH CHECK (true);
