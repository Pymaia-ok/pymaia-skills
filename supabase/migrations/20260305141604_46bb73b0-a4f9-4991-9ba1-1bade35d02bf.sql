
-- Leads table: captures emails from non-authenticated users
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text NOT NULL DEFAULT 'skill_install',
  skill_id uuid REFERENCES public.skills(id),
  user_id uuid,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a lead (for non-auth install gate)
CREATE POLICY "Anyone can create leads" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view leads
CREATE POLICY "Admins can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view own leads by email match (via authenticated)
CREATE POLICY "Service role full access leads" ON public.leads
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Email sequences definition
CREATE TABLE public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  trigger_event text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sequences" ON public.email_sequences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role sequences" ON public.email_sequences
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Email queue
CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  sequence_id uuid REFERENCES public.email_sequences(id),
  step_index integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view queue" ON public.email_queue
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role queue" ON public.email_queue
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Email logs (sent history)
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  sequence_name text,
  step_index integer,
  status text NOT NULL,
  resend_id text,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role logs" ON public.email_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Sequence enrollments (tracks which user/lead is in which sequence)
CREATE TABLE public.sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  sequence_id uuid REFERENCES public.email_sequences(id) NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  UNIQUE(email, sequence_id)
);

ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role enrollments" ON public.sequence_enrollments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view enrollments" ON public.sequence_enrollments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
