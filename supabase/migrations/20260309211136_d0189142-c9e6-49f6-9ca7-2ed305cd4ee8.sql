
-- Add trust_score column to skills, mcp_servers, and plugins
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS security_scan_result jsonb DEFAULT NULL;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS security_scanned_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0;
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS security_scan_result jsonb DEFAULT NULL;
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS security_scanned_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0;
ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS security_scan_result jsonb DEFAULT NULL;
ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS security_scanned_at timestamp with time zone DEFAULT NULL;

-- Create security_reports table for abuse reporting
CREATE TABLE public.security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('skill', 'connector', 'plugin')),
  item_id uuid NOT NULL,
  item_slug text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('data_exfiltration', 'malicious_behavior', 'excessive_permissions', 'prompt_injection', 'other')),
  description text NOT NULL,
  reporter_email text,
  reporter_user_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolution_notes text,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a report
CREATE POLICY "Anyone can submit security reports"
  ON public.security_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can view and manage all reports
CREATE POLICY "Admins can manage security reports"
  ON public.security_reports FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view own reports
CREATE POLICY "Users can view own reports"
  ON public.security_reports FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());
