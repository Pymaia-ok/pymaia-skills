-- Fix 3: Resolve 686 slug collisions with robust dedup
-- Also check new_slug doesn't collide with existing skills
WITH collisions AS (
  SELECT
    s.id,
    s.slug as old_slug,
    s.github_url,
    CASE
      WHEN s.github_url LIKE 'https://github.com/%' THEN
        split_part(replace(s.github_url, 'https://github.com/', ''), '/', 1) || '-' || s.slug
      ELSE
        'skill-' || s.slug || '-' || substr(s.id::text, 1, 4)
    END as base_new_slug
  FROM skills s
  JOIN mcp_servers m ON s.slug = m.slug
  WHERE NOT EXISTS (SELECT 1 FROM slug_redirects sr WHERE sr.old_slug = s.slug AND sr.item_type = 'skill')
),
-- Check for collisions with existing skills AND within the batch
numbered AS (
  SELECT
    id,
    old_slug,
    base_new_slug,
    ROW_NUMBER() OVER (PARTITION BY base_new_slug ORDER BY id) as rn
  FROM collisions
),
deduped AS (
  SELECT
    id,
    old_slug,
    CASE
      WHEN rn > 1 OR EXISTS (SELECT 1 FROM skills s2 WHERE s2.slug = base_new_slug AND s2.id != id)
      THEN base_new_slug || '-' || substr(id::text, 1, 6)
      ELSE base_new_slug
    END as final_slug
  FROM numbered
)
-- First just insert redirects (no update yet)
INSERT INTO slug_redirects (old_slug, new_slug, item_type)
SELECT old_slug, final_slug, 'skill' FROM deduped
ON CONFLICT (old_slug, item_type) DO NOTHING;