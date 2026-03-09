
CREATE TABLE public.plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  name_es text,
  description text NOT NULL DEFAULT '',
  description_es text,
  platform text NOT NULL DEFAULT 'claude-code',
  is_anthropic_verified boolean NOT NULL DEFAULT false,
  is_official boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'official',
  install_count integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'development',
  homepage text,
  github_url text,
  icon_url text,
  security_status text NOT NULL DEFAULT 'unverified',
  creator_id uuid,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved plugins"
  ON public.plugins FOR SELECT TO public
  USING (status = 'approved');

CREATE POLICY "Admins can manage plugins"
  ON public.plugins FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can insert plugins"
  ON public.plugins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);
