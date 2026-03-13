
-- Add version column to skills for semantic versioning
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0.0';

-- Add recommended_skills, difficulty, estimated_time to goal_templates
ALTER TABLE public.goal_templates ADD COLUMN IF NOT EXISTS recommended_skills text[] DEFAULT '{}';
ALTER TABLE public.goal_templates ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'intermediate';
ALTER TABLE public.goal_templates ADD COLUMN IF NOT EXISTS estimated_time_minutes integer DEFAULT 30;
