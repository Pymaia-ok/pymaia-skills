CREATE OR REPLACE FUNCTION public.find_truncated_blog_posts(min_len integer DEFAULT 5000, batch_limit integer DEFAULT 3)
RETURNS SETOF blog_posts
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.blog_posts
  WHERE status = 'published'
    AND (length(content) < min_len OR length(coalesce(content_es, '')) < 2000)
  ORDER BY length(content) ASC
  LIMIT batch_limit;
$$;