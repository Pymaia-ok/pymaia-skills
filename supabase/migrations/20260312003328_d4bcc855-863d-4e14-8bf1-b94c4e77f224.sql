
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Add embedding columns to skills, mcp_servers, plugins
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS embedding vector(64);
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS embedding vector(64);
ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS embedding vector(64);

-- 3. Create HNSW indexes for fast cosine similarity
CREATE INDEX IF NOT EXISTS idx_skills_embedding_hnsw ON public.skills
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_embedding_hnsw ON public.mcp_servers
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_plugins_embedding_hnsw ON public.plugins
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 4. Create semantic search function for skills
CREATE OR REPLACE FUNCTION public.semantic_search_skills(
  query_embedding vector(64),
  filter_category text DEFAULT NULL,
  filter_roles text[] DEFAULT NULL,
  match_count integer DEFAULT 24,
  similarity_threshold float DEFAULT 0.2
)
RETURNS TABLE (
  id uuid,
  slug text,
  display_name text,
  display_name_es text,
  tagline text,
  tagline_es text,
  description_human text,
  description_human_es text,
  category text,
  industry text[],
  target_roles text[],
  install_command text,
  github_url text,
  video_url text,
  time_to_install_minutes integer,
  install_count integer,
  avg_rating numeric,
  review_count integer,
  github_stars integer,
  use_cases jsonb,
  creator_id uuid,
  created_at timestamptz,
  status text,
  similarity_score float
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    s.id, s.slug, s.display_name, s.display_name_es,
    s.tagline, s.tagline_es, s.description_human, s.description_human_es,
    s.category, s.industry, s.target_roles, s.install_command,
    s.github_url, s.video_url, s.time_to_install_minutes,
    s.install_count, s.avg_rating, s.review_count, s.github_stars,
    s.use_cases, s.creator_id, s.created_at, s.status,
    (1 - (s.embedding <=> query_embedding))::float AS similarity_score
  FROM public.skills s
  WHERE s.status = 'approved'
    AND s.is_public = true
    AND s.embedding IS NOT NULL
    AND (filter_category IS NULL OR s.category = filter_category)
    AND (filter_roles IS NULL OR s.target_roles && filter_roles)
    AND (1 - (s.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
$$;
