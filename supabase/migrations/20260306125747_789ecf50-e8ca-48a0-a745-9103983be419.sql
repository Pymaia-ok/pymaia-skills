
-- Add visibility columns to skills
ALTER TABLE public.skills 
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE DEFAULT NULL;

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_skills_share_token ON public.skills(share_token) WHERE share_token IS NOT NULL;

-- Update RLS: allow viewing private skills via share_token
-- Drop and recreate the public viewing policy to include share_token access
DROP POLICY IF EXISTS "Approved skills are viewable by everyone" ON public.skills;

CREATE POLICY "Approved skills are viewable by everyone"
ON public.skills
FOR SELECT
USING (
  (status = 'approved' AND is_public = true)
  OR (auth.uid() = creator_id)
);

-- Separate policy for share_token access (no auth needed)
CREATE POLICY "Private skills viewable via share token"
ON public.skills
FOR SELECT
USING (
  share_token IS NOT NULL 
  AND status = 'approved'
);
