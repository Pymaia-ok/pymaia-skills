
-- Remove generic/junk connectors with no useful identity
UPDATE mcp_servers 
SET status = 'duplicate', updated_at = now()
WHERE status = 'approved' 
AND lower(regexp_replace(name, '[-_ ](mcp|server|connector)$', '', 'i')) IN ('mcp', 'server', 'test', 'demo', 'example', 'hello world', 'hello');
