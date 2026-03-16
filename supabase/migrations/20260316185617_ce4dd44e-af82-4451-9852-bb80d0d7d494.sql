-- Fix the one slug that conflicts: git-mcp -> idosal-git-mcp already exists, use a longer suffix
UPDATE slug_redirects SET new_slug = 'idosal-git-mcp-skill' 
WHERE old_slug = 'git-mcp' AND item_type = 'skill' AND new_slug = 'idosal-git-mcp';

-- Now apply ALL slug renames
UPDATE skills s
SET slug = sr.new_slug
FROM slug_redirects sr
WHERE sr.old_slug = s.slug
  AND sr.item_type = 'skill'
  AND EXISTS (SELECT 1 FROM mcp_servers m WHERE m.slug = s.slug);