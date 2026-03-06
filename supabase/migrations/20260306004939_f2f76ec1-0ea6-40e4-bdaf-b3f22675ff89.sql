-- Step 1: Delete generic/placeholder connectors
DELETE FROM mcp_servers WHERE (
  lower(name) IN ('mcp', 'mcp server', 'test', 'server', 'template', 'mcp-server', 'test-mcp', 'my mcp server', 'my mcp serv', 'template server', 'smithery scaffold', 'untitled', 'example')
  OR lower(name) LIKE 'untitled%'
  OR lower(name) LIKE 'example %'
  OR length(name) < 3
);

-- Step 2: Deduplicate by name - keep only the one with highest external_use_count per name
DELETE FROM mcp_servers
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY COALESCE(external_use_count, 0) DESC, created_at ASC) as rn
    FROM mcp_servers
  ) ranked
  WHERE rn > 1
);