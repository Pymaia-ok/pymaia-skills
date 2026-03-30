-- Create categories table with descriptions
CREATE TABLE IF NOT EXISTS public.categories (
  slug text PRIMARY KEY,
  display_name text NOT NULL,
  display_name_es text,
  description text,
  description_es text,
  emoji text DEFAULT '📦',
  sort_order integer DEFAULT 0,
  skill_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT TO public USING (true);

-- Service role can manage
CREATE POLICY "Service role categories" ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins can manage
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create catalog_health_check RPC for admin dashboard
CREATE OR REPLACE FUNCTION public.catalog_health_check()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'missing_install_command', (
      SELECT count(*) FROM skills WHERE status = 'approved' AND (install_command IS NULL OR install_command = '' OR install_command = 'npx skills add ' || slug)
    ),
    'missing_readme', (
      SELECT count(*) FROM skills WHERE status = 'approved' AND (readme_raw IS NULL OR readme_raw = '')
    ),
    'low_trust_score', (
      SELECT count(*) FROM skills WHERE status = 'approved' AND (trust_score IS NULL OR trust_score < 20)
    ),
    'pending_over_7_days', (
      SELECT count(*) FROM skills WHERE status = 'pending' AND created_at < now() - interval '7 days'
    ),
    'duplicate_github_urls', (
      SELECT count(*) FROM (
        SELECT github_url, count(*) as cnt
        FROM skills
        WHERE github_url IS NOT NULL AND github_url != '' AND status = 'approved'
        GROUP BY github_url
        HAVING count(*) > 1
      ) dupes
    ),
    'total_approved', (SELECT count(*) FROM skills WHERE status = 'approved'),
    'total_pending', (SELECT count(*) FROM skills WHERE status = 'pending'),
    'total_rejected', (SELECT count(*) FROM skills WHERE status = 'rejected'),
    'trust_score_distribution', (
      SELECT jsonb_build_object(
        'excellent', (SELECT count(*) FROM skills WHERE status = 'approved' AND trust_score >= 80),
        'good', (SELECT count(*) FROM skills WHERE status = 'approved' AND trust_score >= 60 AND trust_score < 80),
        'caution', (SELECT count(*) FROM skills WHERE status = 'approved' AND trust_score >= 40 AND trust_score < 60),
        'low', (SELECT count(*) FROM skills WHERE status = 'approved' AND trust_score >= 1 AND trust_score < 40),
        'unscored', (SELECT count(*) FROM skills WHERE status = 'approved' AND (trust_score IS NULL OR trust_score = 0))
      )
    ),
    'category_distribution', (
      SELECT jsonb_object_agg(category, cnt)
      FROM (SELECT category, count(*) as cnt FROM skills WHERE status = 'approved' GROUP BY category ORDER BY cnt DESC LIMIT 20) cats
    )
  ) INTO result;
  RETURN result;
END;
$$;