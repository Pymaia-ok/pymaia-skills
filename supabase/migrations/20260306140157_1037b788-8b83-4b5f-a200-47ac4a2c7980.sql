
-- Drop the flawed policy that exposes private skills in listings
DROP POLICY IF EXISTS "Private skills viewable via share token" ON public.skills;

-- Create a SECURITY DEFINER function to fetch skills by share token
CREATE OR REPLACE FUNCTION public.fetch_skill_by_share_token(_slug text, _token text)
RETURNS SETOF public.skills
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.skills
  WHERE slug = _slug
    AND share_token = _token
    AND status = 'approved';
$$;
