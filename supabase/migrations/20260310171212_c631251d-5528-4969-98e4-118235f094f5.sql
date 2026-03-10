
-- API Keys table for personal MCP authentication
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  label text NOT NULL DEFAULT 'default',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (key_hash)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role api_keys"
  ON public.api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Function to validate API key by hash (used by MCP server with service_role)
CREATE OR REPLACE FUNCTION public.validate_api_key(_key_hash text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT user_id FROM public.api_keys
  WHERE key_hash = _key_hash AND revoked_at IS NULL
  LIMIT 1;
$$;
