-- Add security verification columns to skills
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS security_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS security_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_notes text,
  ADD COLUMN IF NOT EXISTS last_commit_at timestamptz;

-- Add security verification columns to mcp_servers
ALTER TABLE public.mcp_servers
  ADD COLUMN IF NOT EXISTS security_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS security_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_notes text,
  ADD COLUMN IF NOT EXISTS last_commit_at timestamptz;