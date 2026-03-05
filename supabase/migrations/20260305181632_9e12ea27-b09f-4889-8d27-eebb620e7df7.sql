
-- GIN trigram indexes for fuzzy search performance on 46K+ rows
CREATE INDEX IF NOT EXISTS idx_skills_display_name_trgm ON public.skills USING gin (lower(display_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skills_tagline_trgm ON public.skills USING gin (lower(tagline) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skills_description_trgm ON public.skills USING gin (lower(description_human) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills USING btree (category) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_skills_status ON public.skills USING btree (status);
