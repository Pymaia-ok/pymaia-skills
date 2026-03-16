-- Fix remaining 313 slug collisions - second pass
-- Use id suffix to guarantee uniqueness
WITH remaining_collisions AS (
  SELECT
    s.id,
    s.slug as old_slug,
    s.github_url,
    CASE
      WHEN s.github_url LIKE 'https://github.com/%' THEN
        split_part(replace(s.github_url, 'https://github.com/', ''), '/', 1) || '-' || s.slug || '-' || substr(s.id::text, 1, 4)
      ELSE
        'skill-' || s.slug || '-' || substr(s.id::text, 1, 6)
    END as new_slug
  FROM skills s
  JOIN mcp_servers m ON s.slug = m.slug
  WHERE NOT EXISTS (SELECT 1 FROM slug_redirects sr WHERE sr.old_slug = s.slug AND sr.item_type = 'skill')
)
INSERT INTO slug_redirects (old_slug, new_slug, item_type)
SELECT old_slug, new_slug, 'skill' FROM remaining_collisions
ON CONFLICT (old_slug, item_type) DO NOTHING;

-- Apply the renames
UPDATE skills s
SET slug = sr.new_slug
FROM slug_redirects sr
WHERE sr.old_slug = s.slug
  AND sr.item_type = 'skill'
  AND EXISTS (SELECT 1 FROM mcp_servers m WHERE m.slug = s.slug);