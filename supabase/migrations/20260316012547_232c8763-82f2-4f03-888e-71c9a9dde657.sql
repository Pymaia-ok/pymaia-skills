
-- Table: courses
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  title_es text,
  description text NOT NULL DEFAULT '',
  description_es text,
  role_slug text NOT NULL DEFAULT 'general',
  difficulty text NOT NULL DEFAULT 'beginner',
  emoji text DEFAULT '📚',
  estimated_minutes integer NOT NULL DEFAULT 60,
  module_count integer NOT NULL DEFAULT 0,
  cover_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role courses" ON public.courses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table: course_modules
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  title_es text,
  content_md text NOT NULL DEFAULT '',
  content_md_es text,
  quiz_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_skill_slugs text[] NOT NULL DEFAULT '{}',
  recommended_connector_slugs text[] NOT NULL DEFAULT '{}',
  estimated_minutes integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course modules" ON public.course_modules
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage course modules" ON public.course_modules
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role course modules" ON public.course_modules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table: course_progress
CREATE TABLE public.course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  quiz_score integer,
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.course_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.course_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.course_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role course progress" ON public.course_progress
  FOR ALL TO service_role USING (true) WITH CHECK (true);
