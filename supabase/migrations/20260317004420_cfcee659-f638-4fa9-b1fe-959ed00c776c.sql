
-- Fix 6: Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_creator_id ON public.skills(creator_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON public.mcp_servers(category);
CREATE INDEX IF NOT EXISTS idx_plugins_creator_id ON public.plugins(creator_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_order ON public.course_modules(course_id, sort_order);

-- Fix 2: Add key_salt column to api_keys for salted hashing
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_salt text;
