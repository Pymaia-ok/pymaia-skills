
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  title_es text,
  excerpt text NOT NULL DEFAULT '',
  excerpt_es text,
  content text NOT NULL DEFAULT '',
  content_es text,
  meta_description text,
  meta_description_es text,
  keywords text[] DEFAULT '{}',
  category text NOT NULL DEFAULT 'security',
  geo_target text NOT NULL DEFAULT 'global',
  related_skill_slugs text[] DEFAULT '{}',
  related_connector_slugs text[] DEFAULT '{}',
  cover_image_prompt text,
  status text NOT NULL DEFAULT 'published',
  reading_time_minutes int DEFAULT 5,
  view_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published blog posts"
  ON public.blog_posts FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role blog posts"
  ON public.blog_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status_created ON public.blog_posts(status, created_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);
