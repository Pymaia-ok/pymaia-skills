
CREATE TABLE public.monorepo_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_full_name text NOT NULL UNIQUE,
  skill_count integer DEFAULT 0,
  github_stars integer DEFAULT 0,
  last_synced_at timestamptz,
  discovered_via text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monorepo_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role monorepo_registry" ON public.monorepo_registry
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view monorepo_registry" ON public.monorepo_registry
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
