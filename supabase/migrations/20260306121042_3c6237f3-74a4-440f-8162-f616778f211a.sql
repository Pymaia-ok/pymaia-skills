
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS github_stars integer DEFAULT 0;
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS github_url text;
