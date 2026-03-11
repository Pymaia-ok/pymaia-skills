
CREATE TABLE public.quality_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  insight_type text NOT NULL DEFAULT 'keyword_gap',
  goal text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_taken text,
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quality_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quality insights" ON public.quality_insights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role quality insights" ON public.quality_insights
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
