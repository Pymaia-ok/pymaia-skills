
-- Sprint 4: Catalog Expansion tables

-- 1. skills_import_staging table
CREATE TABLE IF NOT EXISTS public.skills_import_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'skills.sh',
  source_slug TEXT,
  source_install_count INTEGER DEFAULT 0,
  name TEXT NOT NULL,
  repo_url TEXT,
  repo_owner TEXT,
  repo_name TEXT,
  skill_folder TEXT,
  install_command TEXT,
  description TEXT,
  category TEXT,
  dedup_status TEXT NOT NULL DEFAULT 'pending',
  matched_existing_slug TEXT,
  dedup_reason TEXT,
  import_status TEXT NOT NULL DEFAULT 'pending',
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dedup lookups
CREATE INDEX idx_staging_dedup_status ON public.skills_import_staging(dedup_status);
CREATE INDEX idx_staging_import_status ON public.skills_import_staging(import_status);
CREATE INDEX idx_staging_repo_owner_name ON public.skills_import_staging(repo_owner, repo_name);
CREATE UNIQUE INDEX idx_staging_source_slug ON public.skills_import_staging(source, source_slug);

-- RLS
ALTER TABLE public.skills_import_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role staging" ON public.skills_import_staging
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view staging" ON public.skills_import_staging
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. sync_log table
CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'skills.sh',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  total_scraped INTEGER DEFAULT 0,
  new_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_log JSONB,
  duration_seconds INTEGER
);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role sync_log" ON public.sync_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view sync_log" ON public.sync_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
