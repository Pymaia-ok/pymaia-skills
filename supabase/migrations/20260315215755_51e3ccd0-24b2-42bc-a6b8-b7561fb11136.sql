
-- Sprint 5: Ecosystem Features tables

-- 1. Creators table
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  company TEXT,
  skill_count INTEGER NOT NULL DEFAULT 0,
  connector_count INTEGER NOT NULL DEFAULT 0,
  plugin_count INTEGER NOT NULL DEFAULT 0,
  total_installs INTEGER NOT NULL DEFAULT 0,
  avg_rating FLOAT NOT NULL DEFAULT 0,
  avg_trust_score FLOAT NOT NULL DEFAULT 0,
  top_category TEXT,
  github_followers INTEGER NOT NULL DEFAULT 0,
  is_organization BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creators_skill_count ON public.creators(skill_count DESC);
CREATE INDEX idx_creators_verified ON public.creators(verified);

ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creators" ON public.creators
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role creators" ON public.creators
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Usage events table
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  item_slug TEXT,
  item_type TEXT,
  query_text TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_events_slug_time ON public.usage_events(item_slug, created_at DESC);
CREATE INDEX idx_usage_events_type_time ON public.usage_events(event_type, created_at DESC);
CREATE INDEX idx_usage_events_time ON public.usage_events(created_at);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role usage_events" ON public.usage_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can insert usage events" ON public.usage_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view usage events" ON public.usage_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add connector_slugs and plugin_slugs to skill_bundles (expand existing table)
ALTER TABLE public.skill_bundles
  ADD COLUMN IF NOT EXISTS connector_slugs TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS plugin_slugs TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_items INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_regenerated_at TIMESTAMPTZ;

-- Add unique index on role_slug for bundle lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_bundles_role_slug ON public.skill_bundles(role_slug) WHERE is_active = true;
