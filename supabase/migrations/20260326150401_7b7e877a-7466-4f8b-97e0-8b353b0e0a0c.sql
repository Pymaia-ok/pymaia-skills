
-- Fix weekly-trending-blog cron: replace hardcoded JWT with get_edge_headers()
SELECT cron.unschedule('weekly-trending-blog');
SELECT cron.schedule(
  'weekly-trending-blog',
  '0 14 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-blog-post',
    headers := public.get_edge_headers(),
    body := '{"mode": "trending_to_blog", "min_stars": 500, "lookback_days": 7}'::jsonb
  ) AS request_id;
  $$
);
