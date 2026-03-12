
-- Mark duplicate MCP connectors: keep best per brand (official > trust_score > stars)
-- Uses status = 'duplicate' so they're hidden from queries but recoverable
WITH brands AS (
  SELECT id, 
    lower(regexp_replace(name, '[-_ ](mcp|server|connector|MCP|Server)$', '', 'i')) as brand
  FROM mcp_servers WHERE status = 'approved'
),
dupes AS (
  SELECT brand FROM brands GROUP BY brand HAVING COUNT(*) > 1
),
ranked AS (
  SELECT b.id, b.brand,
    ROW_NUMBER() OVER (
      PARTITION BY b.brand 
      ORDER BY m.is_official DESC, coalesce(m.trust_score,0) DESC, coalesce(m.github_stars,0) DESC, m.created_at ASC
    ) as rn
  FROM brands b 
  JOIN dupes d ON b.brand = d.brand
  JOIN mcp_servers m ON m.id = b.id
)
UPDATE mcp_servers 
SET status = 'duplicate', updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
