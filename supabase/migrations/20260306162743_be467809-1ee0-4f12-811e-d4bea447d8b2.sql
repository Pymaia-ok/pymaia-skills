-- Drop and recreate the status check constraint to allow 'mcp_misclassified'
ALTER TABLE skills DROP CONSTRAINT skills_status_check;
ALTER TABLE skills ADD CONSTRAINT skills_status_check CHECK (status = ANY (ARRAY['pending', 'approved', 'rejected', 'mcp_misclassified']));

-- Now reclassify MCP servers that were misclassified as skills
UPDATE skills
SET status = 'mcp_misclassified',
    updated_at = now()
WHERE status = 'approved'
  AND lower(display_name) LIKE '%mcp%'
  AND install_command NOT LIKE '%SKILL.md%'
  AND install_command NOT LIKE '%skills/%'
  AND install_command NOT LIKE '%.claude/%';