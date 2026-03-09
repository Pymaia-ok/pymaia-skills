
-- Security incidents table for incident response workflow
CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  item_type text NOT NULL,
  item_slug text NOT NULL,
  severity text NOT NULL DEFAULT 'P3',
  status text NOT NULL DEFAULT 'open',
  trigger_type text NOT NULL DEFAULT 'manual',
  description text NOT NULL,
  scan_result jsonb,
  affected_users_count integer DEFAULT 0,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid,
  notified_users boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage incidents" ON public.security_incidents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access incidents" ON public.security_incidents
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Version hashes table for rug pull detection
CREATE TABLE public.version_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  item_type text NOT NULL,
  item_slug text NOT NULL,
  content_hash text NOT NULL,
  tool_descriptions_hash text,
  version_tag text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.version_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manage hashes" ON public.version_hashes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view hashes" ON public.version_hashes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Security advisories table for public advisories
CREATE TABLE public.security_advisories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.security_incidents(id),
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  item_type text NOT NULL,
  item_slug text NOT NULL,
  item_name text NOT NULL,
  action_taken text NOT NULL,
  is_public boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_advisories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public advisories" ON public.security_advisories
  FOR SELECT TO public
  USING (is_public = true);

CREATE POLICY "Admins can manage advisories" ON public.security_advisories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role advisories" ON public.security_advisories
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Add approved_content_hash to track rug pulls on existing tables
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS approved_content_hash text;
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS approved_content_hash text;
ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS approved_content_hash text;
