-- Fix remaining 6 slug collisions (skills vs mcp_servers)
DO $$
DECLARE
  r RECORD;
  new_slug TEXT;
  suffix INT;
BEGIN
  FOR r IN
    SELECT s.id, s.slug, s.github_url, s.display_name
    FROM skills s
    INNER JOIN mcp_servers m ON s.slug = m.slug
    WHERE s.status = 'approved' AND m.status = 'approved'
  LOOP
    -- Generate new slug from github_url or display_name
    IF r.github_url IS NOT NULL AND r.github_url ~ 'github\.com/([^/]+)/([^/?#]+)' THEN
      new_slug := lower(regexp_replace(
        (regexp_match(r.github_url, 'github\.com/([^/]+/[^/?#]+)'))[1],
        '[^a-z0-9]+', '-', 'g'
      ));
      new_slug := trim(both '-' from new_slug);
    ELSE
      new_slug := r.slug || '-skill';
    END IF;

    -- Dedup if needed
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM skills WHERE slug = new_slug AND id != r.id)
       OR EXISTS (SELECT 1 FROM mcp_servers WHERE slug = new_slug)
    LOOP
      new_slug := new_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;

    -- Rename and create redirect
    UPDATE skills SET slug = new_slug WHERE id = r.id;
    INSERT INTO slug_redirects (old_slug, new_slug, item_type)
    VALUES (r.slug, new_slug, 'skill')
    ON CONFLICT (old_slug, item_type) DO UPDATE SET new_slug = EXCLUDED.new_slug;

    RAISE NOTICE 'Renamed skill slug: % -> %', r.slug, new_slug;
  END LOOP;
END $$;