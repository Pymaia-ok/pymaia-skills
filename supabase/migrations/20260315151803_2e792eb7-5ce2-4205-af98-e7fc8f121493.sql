
-- 1. Materialized view for directory stats (avoid 1000-row limit)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.directory_stats_mv AS
SELECT
  (SELECT count(*) FROM public.skills WHERE status = 'approved') AS skills_count,
  (SELECT count(*) FROM public.mcp_servers WHERE status = 'approved') AS connectors_count,
  (SELECT count(*) FROM public.plugins WHERE status = 'approved') AS plugins_count,
  (SELECT count(*) FROM public.goal_templates WHERE is_active = true) AS goal_templates_count,
  (SELECT count(DISTINCT category) FROM public.skills WHERE status = 'approved') AS categories_count,
  now() AS refreshed_at;

-- Create unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS directory_stats_mv_unique ON public.directory_stats_mv (refreshed_at);

-- 2. Add install_count_source and install_count_verified to skills
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS install_count_source text NOT NULL DEFAULT 'imported';
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS install_count_verified boolean NOT NULL DEFAULT false;

-- 3. Create slug_redirects table
CREATE TABLE IF NOT EXISTS public.slug_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  item_type text NOT NULL DEFAULT 'skill',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(old_slug, item_type)
);

-- Enable RLS on slug_redirects
ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;

-- Anyone can read redirects
CREATE POLICY "Anyone can view slug redirects" ON public.slug_redirects FOR SELECT TO public USING (true);

-- Service role can manage redirects
CREATE POLICY "Service role can manage slug redirects" ON public.slug_redirects FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to refresh the materialized view (called by pg_cron)
CREATE OR REPLACE FUNCTION public.refresh_directory_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  REFRESH MATERIALIZED VIEW public.directory_stats_mv;
$$;
