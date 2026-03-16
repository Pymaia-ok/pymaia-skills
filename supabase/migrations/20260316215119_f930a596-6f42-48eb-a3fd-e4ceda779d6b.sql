-- Fix 2: Add error_message column to staging
ALTER TABLE public.skills_import_staging ADD COLUMN IF NOT EXISTS error_message text;