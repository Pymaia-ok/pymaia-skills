ALTER TABLE public.skills 
  ADD COLUMN IF NOT EXISTS readme_raw text,
  ADD COLUMN IF NOT EXISTS readme_summary text;