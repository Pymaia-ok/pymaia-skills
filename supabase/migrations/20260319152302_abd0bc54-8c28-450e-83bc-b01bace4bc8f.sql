
-- Add last_verified_at to skills, mcp_servers, plugins
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
