ALTER TABLE public.plugins 
  ADD COLUMN IF NOT EXISTS github_stars integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_commit_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_notes text;