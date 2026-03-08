
CREATE TABLE public.skill_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_es text,
  description text NOT NULL,
  description_es text,
  hero_emoji text DEFAULT '📦',
  skill_slugs text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.skill_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bundles" ON public.skill_bundles FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage bundles" ON public.skill_bundles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
