
-- ================================================
-- Fix 5: Resolve slug collisions using DO block with conflict handling
-- ================================================
DO $$
DECLARE
  r RECORD;
  new_slug_val TEXT;
  suffix INT;
BEGIN
  FOR r IN
    SELECT s.id, s.slug AS old_slug, s.github_url
    FROM public.skills s
    INNER JOIN public.mcp_servers m ON s.slug = m.slug
    WHERE s.status = 'approved' AND m.status = 'approved'
  LOOP
    -- Try org-repo pattern first
    IF r.github_url IS NOT NULL AND r.github_url ~ 'github\.com/([^/]+)/([^/\?#]+)' THEN
      new_slug_val := regexp_replace(
        regexp_replace(r.github_url, '^.*github\.com/([^/]+)/([^/\?#]+).*$', '\1-\2'),
        '\.git$', ''
      );
    ELSE
      new_slug_val := r.old_slug || '-skill';
    END IF;
    
    -- If new slug already exists, append numeric suffix
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM public.skills WHERE slug = new_slug_val AND id != r.id) LOOP
      IF r.github_url IS NOT NULL AND r.github_url ~ 'github\.com/([^/]+)/([^/\?#]+)' THEN
        new_slug_val := regexp_replace(
          regexp_replace(r.github_url, '^.*github\.com/([^/]+)/([^/\?#]+).*$', '\1-\2'),
          '\.git$', ''
        ) || '-' || suffix::text;
      ELSE
        new_slug_val := r.old_slug || '-skill-' || suffix::text;
      END IF;
      suffix := suffix + 1;
      EXIT WHEN suffix > 10; -- safety valve
    END LOOP;
    
    -- Update skill slug
    UPDATE public.skills SET slug = new_slug_val, updated_at = now() WHERE id = r.id;
    
    -- Insert redirect
    INSERT INTO public.slug_redirects (old_slug, new_slug, item_type)
    VALUES (r.old_slug, new_slug_val, 'skill')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ================================================
-- Fix 11: Cleanup duplicate crons
-- ================================================
SELECT cron.unschedule('generate-embeddings-6h');
SELECT cron.unschedule('recompute-quality-ranks');
SELECT cron.unschedule('refresh-directory-stats');
SELECT cron.unschedule('bulk-fetch-skill-content-daily');
SELECT cron.unschedule('bulk-skillmd-imports');
SELECT cron.unschedule('enrich-github-metadata-daily');

-- Update embeddings cron to batch_size 100
SELECT cron.unschedule('generate-embeddings-auto');
SELECT cron.schedule(
  'generate-embeddings-auto',
  '*/3 * * * *',
  $$SELECT net.http_post(
    url:='https://zugqvdqactbhzlilwyds.supabase.co/functions/v1/generate-embeddings',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z3F2ZHFhY3RiaHpsaWx3eWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzI3MjUsImV4cCI6MjA4ODE0ODcyNX0.zwmNMXvqjdn_5m2vfrsgWpdavwiH_4n8nLMq5huLfMg"}'::jsonb,
    body:='{"batch_size":100,"table":"skills"}'::jsonb
  ) AS request_id;$$
);
