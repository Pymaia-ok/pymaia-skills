
-- Enterprise applications table
CREATE TABLE public.enterprise_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_description TEXT,
  contact_email TEXT NOT NULL,
  plugin_slugs TEXT[] NOT NULL DEFAULT '{}',
  api_documentation_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  tier TEXT NOT NULL DEFAULT 'free',
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_applications ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own applications
CREATE POLICY "Users can view own enterprise applications"
  ON public.enterprise_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create enterprise applications"
  ON public.enterprise_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending applications"
  ON public.enterprise_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins full access
CREATE POLICY "Admins can manage enterprise applications"
  ON public.enterprise_applications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_enterprise_applications_updated_at
  BEFORE UPDATE ON public.enterprise_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
