ALTER TABLE public.mcp_servers 
  ADD COLUMN IF NOT EXISTS homepage text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_use_count integer DEFAULT 0;