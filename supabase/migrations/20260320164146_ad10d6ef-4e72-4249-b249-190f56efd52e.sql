
-- Create a helper function to build auth headers dynamically
-- Uses the anon key stored in vault (inserted by Supabase automatically)
CREATE OR REPLACE FUNCTION public.edge_function_auth_headers()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('request.jwt.claim.role', true)
  );
$$;

-- Alternative: use a dedicated helper that reads from config
CREATE OR REPLACE FUNCTION public.get_edge_headers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  _key text;
BEGIN
  -- Try vault first
  SELECT decrypted_secret INTO _key
  FROM vault.decrypted_secrets
  WHERE name = 'edge_function_anon_key'
  LIMIT 1;
  
  -- Fallback: try supabase.anon_key setting
  IF _key IS NULL THEN
    _key := current_setting('supabase.anon_key', true);
  END IF;
  
  RETURN jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || COALESCE(_key, '')
  );
END;
$$;

-- Store the anon key in vault for cron job access
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3F2ZHFhY3RiaHpsaWx3eWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzI3MjUsImV4cCI6MjA4ODE0ODcyNX0.zwmNMXvqjdn_5m2vfrsgWpdavwiH_4n8nLMq5huLfMg',
  'edge_function_anon_key',
  'Anon key for edge function cron jobs'
);
