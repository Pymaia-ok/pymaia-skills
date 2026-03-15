DROP FUNCTION IF EXISTS public.find_truncated_blog_posts(integer, integer);

CREATE FUNCTION public.find_truncated_blog_posts(min_len int DEFAULT 7000, batch_limit int DEFAULT 2)
RETURNS TABLE(id uuid, slug text, title text, title_es text, category text, keywords text[], content text, content_es text, related_skill_slugs text[], related_connector_slugs text[])
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT bp.id, bp.slug, bp.title, bp.title_es, bp.category, bp.keywords, bp.content, bp.content_es, bp.related_skill_slugs, bp.related_connector_slugs
  FROM blog_posts bp
  WHERE bp.status = 'published' AND length(bp.content) < min_len
  ORDER BY length(bp.content) ASC
  LIMIT batch_limit;
$$;

SELECT cron.schedule('regen-truncated-blogs', '*/3 * * * *',
$$SELECT net.http_post(
  url := current_setting('app.settings.service_url') || '/functions/v1/generate-blog-post',
  headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'), 'Content-Type', 'application/json'),
  body := '{"mode":"regenerate","min_content_length":7000,"batch_size":1}'::jsonb
)$$);