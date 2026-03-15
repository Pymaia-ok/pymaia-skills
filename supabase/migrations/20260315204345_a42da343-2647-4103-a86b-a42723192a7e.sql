
-- 1. Create github_metadata table
CREATE TABLE IF NOT EXISTS public.github_metadata (
  repo_full_name TEXT PRIMARY KEY,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  license TEXT,
  last_commit_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  contributor_count INTEGER NOT NULL DEFAULT 0,
  topics TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  fetch_status TEXT NOT NULL DEFAULT 'pending'
);

-- RLS: service role full access, anyone can read
ALTER TABLE public.github_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view github metadata" ON public.github_metadata
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role github metadata" ON public.github_metadata
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Add skill_md and skill_md_status columns to skills
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS skill_md TEXT;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS skill_md_status TEXT NOT NULL DEFAULT 'pending';

-- 3. Schedule enrich-github-metadata daily at 3:00 AM UTC
SELECT cron.schedule(
  'enrich-github-metadata-daily',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/enrich-github-metadata',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"batchSize": 400}'::jsonb
  );$$
);

-- 4. Schedule bulk-fetch-skill-content daily at 4:00 AM UTC
SELECT cron.schedule(
  'bulk-fetch-skill-content-daily',
  '0 4 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/bulk-fetch-skill-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"batchSize": 100}'::jsonb
  );$$
);
