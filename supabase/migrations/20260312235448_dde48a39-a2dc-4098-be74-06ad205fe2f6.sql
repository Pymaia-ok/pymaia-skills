
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS changelog text;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS is_stale boolean DEFAULT false;
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS is_stale boolean DEFAULT false;
ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS is_stale boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified_publisher boolean DEFAULT false;
