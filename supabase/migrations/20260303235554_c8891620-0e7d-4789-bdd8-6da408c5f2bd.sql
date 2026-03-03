
-- Add a structured category column for better organization
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Create an index for fast category filtering
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);

-- Update existing skills with proper categories based on industry
UPDATE public.skills SET category = 'desarrollo' WHERE industry && ARRAY['tecnologia', 'frontend', 'backend'];
UPDATE public.skills SET category = 'diseño' WHERE industry && ARRAY['diseno', 'ux'] AND category = 'general';
UPDATE public.skills SET category = 'marketing' WHERE industry && ARRAY['marketing', 'seo', 'contenido'] AND category = 'general';
UPDATE public.skills SET category = 'automatización' WHERE industry && ARRAY['automatizacion'] AND category = 'general';
UPDATE public.skills SET category = 'productividad' WHERE industry && ARRAY['productividad', 'estrategia'] AND category = 'general';
UPDATE public.skills SET category = 'legal' WHERE industry && ARRAY['legal', 'documentos'] AND category = 'general';
UPDATE public.skills SET category = 'negocios' WHERE industry && ARRAY['negocios', 'presentaciones'] AND category = 'general';
UPDATE public.skills SET category = 'creatividad' WHERE industry && ARRAY['creatividad', 'video'] AND category = 'general';
UPDATE public.skills SET category = 'datos' WHERE industry && ARRAY['datos'] AND category = 'general';
UPDATE public.skills SET category = 'ia' WHERE industry && ARRAY['ia'] AND category = 'general';
