SELECT cron.unschedule('regen-truncated-blogs');

SELECT cron.schedule(
  'regen-truncated-blogs',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url:='https://zugqvdqactbhzlilwyds.supabase.co/functions/v1/generate-blog-post',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3F2ZHFhY3RiaHpsaWx3eWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzI3MjUsImV4cCI6MjA4ODE0ODcyNX0.zwmNMXvqjdn_5m2vfrsgWpdavwiH_4n8nLMq5huLfMg"}'::jsonb,
    body:='{"mode": "regenerate", "batch_size": 1, "min_content_length": 5000}'::jsonb
  ) as request_id;
  $$
);