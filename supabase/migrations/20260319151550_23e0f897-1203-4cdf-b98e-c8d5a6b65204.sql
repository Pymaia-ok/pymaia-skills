-- Fix 3: Change default for plugins.is_official to false
ALTER TABLE public.plugins ALTER COLUMN is_official SET DEFAULT false;