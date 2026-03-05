
-- 1. Add search_vector column (stored, not generated, so we can use a trigger)
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create function to build the search vector
CREATE OR REPLACE FUNCTION public.skills_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.display_name_es, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.tagline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.tagline_es, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description_human, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description_human_es, '')), 'C');
  RETURN NEW;
END;
$$;

-- 3. Create trigger to auto-update search_vector
DROP TRIGGER IF EXISTS trg_skills_search_vector ON public.skills;
CREATE TRIGGER trg_skills_search_vector
  BEFORE INSERT OR UPDATE OF display_name, display_name_es, tagline, tagline_es, description_human, description_human_es
  ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.skills_search_vector_update();

-- 4. Backfill existing rows
UPDATE public.skills SET search_vector =
  setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(display_name_es, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(tagline_es, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description_human, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(description_human_es, '')), 'C');

-- 5. GIN index on search_vector (only approved skills)
CREATE INDEX IF NOT EXISTS idx_skills_search_vector ON public.skills USING gin(search_vector) WHERE status = 'approved';

-- 6. Partial index on approved skills
CREATE INDEX IF NOT EXISTS idx_skills_approved ON public.skills(id) WHERE status = 'approved';

-- 7. Replace search_skills function with FTS-first approach
CREATE OR REPLACE FUNCTION public.search_skills(
  search_query text,
  filter_category text DEFAULT NULL,
  filter_industry text DEFAULT NULL,
  filter_roles text[] DEFAULT NULL,
  sort_by text DEFAULT 'rating',
  page_num integer DEFAULT 0,
  page_size integer DEFAULT 24
)
RETURNS TABLE(
  id uuid, slug text, display_name text, display_name_es text,
  tagline text, tagline_es text, description_human text, description_human_es text,
  category text, industry text[], target_roles text[], install_command text,
  github_url text, video_url text, time_to_install_minutes integer,
  install_count integer, avg_rating numeric, review_count integer,
  github_stars integer, use_cases jsonb, creator_id uuid,
  created_at timestamptz, status text, similarity_score real, total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  query_lower text := lower(trim(search_query));
  ts_query tsquery;
  offset_val integer := page_num * page_size;
BEGIN
  -- Build tsquery: try plainto first, websearch as fallback
  ts_query := plainto_tsquery('english', search_query);

  PERFORM set_limit(0.25);

  RETURN QUERY
  WITH candidates AS (
    SELECT s.*
    FROM skills s
    WHERE s.status = 'approved'
      AND (filter_category IS NULL OR s.category = filter_category)
      AND (filter_industry IS NULL OR s.industry @> ARRAY[filter_industry])
      AND (filter_roles IS NULL OR s.target_roles && filter_roles)
      AND (
        -- Primary: Full-text search on tsvector
        s.search_vector @@ ts_query
        -- Fallback: trigram fuzzy on display_name only
        OR lower(s.display_name) % query_lower
        OR lower(COALESCE(s.display_name_es, '')) % query_lower
        -- Exact substring match on name/tagline
        OR lower(s.display_name) ILIKE '%' || query_lower || '%'
        OR lower(COALESCE(s.display_name_es, '')) ILIKE '%' || query_lower || '%'
        OR lower(s.tagline) ILIKE '%' || query_lower || '%'
        OR lower(COALESCE(s.tagline_es, '')) ILIKE '%' || query_lower || '%'
      )
  ),
  scored AS (
    SELECT
      c.*,
      GREATEST(
        -- FTS rank (normalized to 0-1 range, boosted)
        CASE WHEN c.search_vector @@ ts_query THEN ts_rank(c.search_vector, ts_query) + 0.5 ELSE 0 END,
        -- Trigram on display_name only
        similarity(lower(c.display_name), query_lower),
        similarity(lower(COALESCE(c.display_name_es, '')), query_lower),
        -- ILIKE bonuses
        CASE WHEN lower(c.display_name) ILIKE '%' || query_lower || '%' THEN 0.8 ELSE 0 END,
        CASE WHEN lower(COALESCE(c.display_name_es, '')) ILIKE '%' || query_lower || '%' THEN 0.8 ELSE 0 END,
        CASE WHEN lower(c.tagline) ILIKE '%' || query_lower || '%' THEN 0.6 ELSE 0 END,
        CASE WHEN lower(COALESCE(c.tagline_es, '')) ILIKE '%' || query_lower || '%' THEN 0.6 ELSE 0 END
      )::real AS sim_score
    FROM candidates c
  ),
  counted AS (
    SELECT count(*) AS cnt FROM scored
  )
  SELECT
    f.id, f.slug, f.display_name, f.display_name_es, f.tagline, f.tagline_es,
    f.description_human, f.description_human_es, f.category,
    f.industry, f.target_roles, f.install_command, f.github_url,
    f.video_url, f.time_to_install_minutes, f.install_count,
    f.avg_rating, f.review_count, f.github_stars, f.use_cases,
    f.creator_id, f.created_at, f.status,
    f.sim_score AS similarity_score,
    co.cnt AS total_count
  FROM scored f, counted co
  ORDER BY
    CASE WHEN sort_by = 'installs' THEN f.github_stars ELSE 0 END DESC,
    f.sim_score DESC,
    CASE WHEN sort_by != 'installs' THEN f.avg_rating ELSE 0 END DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$$;
