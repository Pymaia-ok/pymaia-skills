
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
  id uuid, slug text, display_name text, tagline text, tagline_es text,
  description_human text, description_human_es text, category text,
  industry text[], target_roles text[], install_command text, github_url text,
  video_url text, time_to_install_minutes integer, install_count integer,
  avg_rating numeric, review_count integer, github_stars integer,
  use_cases jsonb, creator_id uuid, created_at timestamptz, status text,
  similarity_score real, total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  query_lower text := lower(trim(search_query));
  offset_val integer := page_num * page_size;
BEGIN
  -- Set similarity threshold so the % operator pre-filters using GIN indexes
  PERFORM extensions.set_limit(0.08);

  RETURN QUERY
  WITH candidates AS (
    SELECT s.*
    FROM skills s
    WHERE s.status = 'approved'
      AND (filter_category IS NULL OR s.category = filter_category)
      AND (filter_industry IS NULL OR s.industry @> ARRAY[filter_industry])
      AND (filter_roles IS NULL OR s.target_roles && filter_roles)
      AND (
        lower(s.display_name) % query_lower
        OR lower(s.tagline) % query_lower
        OR lower(COALESCE(s.tagline_es, '')) % query_lower
        OR lower(s.description_human) % query_lower
        OR lower(COALESCE(s.description_human_es, '')) % query_lower
        OR lower(s.category) % query_lower
        OR lower(s.display_name) ILIKE '%' || query_lower || '%'
        OR lower(s.tagline) ILIKE '%' || query_lower || '%'
        OR lower(COALESCE(s.tagline_es, '')) ILIKE '%' || query_lower || '%'
        OR lower(s.description_human) ILIKE '%' || query_lower || '%'
        OR lower(COALESCE(s.description_human_es, '')) ILIKE '%' || query_lower || '%'
      )
  ),
  scored AS (
    SELECT
      c.*,
      GREATEST(
        extensions.similarity(lower(c.display_name), query_lower),
        extensions.similarity(lower(c.tagline), query_lower),
        extensions.similarity(lower(COALESCE(c.tagline_es, '')), query_lower),
        extensions.similarity(lower(c.description_human), query_lower),
        extensions.similarity(lower(COALESCE(c.description_human_es, '')), query_lower),
        CASE WHEN lower(c.display_name) ILIKE '%' || query_lower || '%' THEN 0.8 ELSE 0 END,
        CASE WHEN lower(c.tagline) ILIKE '%' || query_lower || '%' THEN 0.6 ELSE 0 END,
        CASE WHEN lower(COALESCE(c.tagline_es, '')) ILIKE '%' || query_lower || '%' THEN 0.6 ELSE 0 END,
        CASE WHEN lower(c.description_human) ILIKE '%' || query_lower || '%' THEN 0.4 ELSE 0 END,
        CASE WHEN lower(COALESCE(c.description_human_es, '')) ILIKE '%' || query_lower || '%' THEN 0.4 ELSE 0 END
      ) AS sim_score
    FROM candidates c
  ),
  counted AS (
    SELECT count(*) AS cnt FROM scored
  )
  SELECT
    f.id, f.slug, f.display_name, f.tagline, f.tagline_es,
    f.description_human, f.description_human_es, f.category,
    f.industry, f.target_roles, f.install_command, f.github_url,
    f.video_url, f.time_to_install_minutes, f.install_count,
    f.avg_rating, f.review_count, f.github_stars, f.use_cases,
    f.creator_id, f.created_at, f.status,
    f.sim_score AS similarity_score,
    c.cnt AS total_count
  FROM scored f, counted c
  ORDER BY
    CASE WHEN sort_by = 'installs' THEN f.github_stars ELSE 0 END DESC,
    f.sim_score DESC,
    CASE WHEN sort_by != 'installs' THEN f.avg_rating ELSE 0 END DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$function$;
