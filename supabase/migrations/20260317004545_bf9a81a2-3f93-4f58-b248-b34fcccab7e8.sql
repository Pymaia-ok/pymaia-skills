
-- Update validate_api_key to support both salted and unsalted keys (backward compat)
CREATE OR REPLACE FUNCTION public.validate_api_key(_key_hash text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT user_id FROM public.api_keys
  WHERE key_hash = _key_hash AND revoked_at IS NULL
  LIMIT 1;
$$;

-- Add a salted variant that checks salt+hash
CREATE OR REPLACE FUNCTION public.validate_api_key_salted(_plain_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _user uuid;
  _row RECORD;
BEGIN
  -- First try salted keys
  FOR _row IN
    SELECT user_id, key_hash, key_salt FROM public.api_keys
    WHERE key_prefix = left(_plain_key, 14) AND revoked_at IS NULL AND key_salt IS NOT NULL
  LOOP
    IF _row.key_hash = encode(digest(_row.key_salt || _plain_key, 'sha256'), 'hex') THEN
      RETURN _row.user_id;
    END IF;
  END LOOP;
  
  -- Fallback: unsalted legacy keys
  SELECT user_id INTO _user FROM public.api_keys
  WHERE key_prefix = left(_plain_key, 14) AND revoked_at IS NULL AND key_salt IS NULL
    AND key_hash = encode(digest(_plain_key, 'sha256'), 'hex')
  LIMIT 1;
  
  RETURN _user;
END;
$$;
