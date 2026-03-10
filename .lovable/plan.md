

## Research: 2,989 `mcp_misclassified` Skills — Should We Migrate?

### Summary

**No, we should NOT bulk-migrate them to `mcp_servers`.** Here's why:

### Findings

| Segment | Count | Action |
|---------|-------|--------|
| Already in `mcp_servers` (duplicate slugs) | 92 | **Delete** from skills — redundant |
| Monorepo junk (awesome-copilot, clawdis inflated stars) | ~200+ | **Reject** — fake data |
| Junk taglines (pipes, < 10 chars) | 12 | **Reject** |
| Legit MCP servers (github-mcp-server, blender-mcp, whatsapp-mcp, etc.) | ~250 | **Migrate** to `mcp_servers` if not already there |
| Low-quality MCP mentions (0 stars, generic taglines) | ~2,400 | **Reject** — no value |

### Why Not Bulk Migrate

1. **92 already exist as connectors** — migrating would create duplicates
2. **~2,400 are low-quality** (0 stars, generic auto-generated taglines like "Skill del ecosistema: X") — would pollute the connector catalog
3. **The connector table has curated quality standards** (brand icons, install commands, descriptions) — these records don't meet them

### Recommended Plan

1. **Reject ~2,700 junk records** — monorepo dupes, 0-star generics, broken taglines
2. **Migrate ~250 legit MCP servers** not already in `mcp_servers` — real tools like `github-mcp-server` (27k stars), `blender-mcp` (17k stars), `whatsapp-mcp` (5k stars), `notion-mcp-server` (4k stars), `mcp-playwright` (5k stars)
3. **Delete 92 duplicates** already present in both tables

### Migration Logic (SQL)

The migration would:
- INSERT into `mcp_servers` from `skills` where `status = 'mcp_misclassified'` AND `github_stars > 50` AND not already in `mcp_servers` AND not from monorepo junk
- Map fields: `display_name` -> `name`, `tagline` -> `description`, `github_url`, `github_stars`, etc.
- Set `status = 'approved'`, `source = 'skills-migration'`
- Then UPDATE all `mcp_misclassified` skills to `status = 'rejected'` with reason logged

### Impact
- Adds ~250 real MCP servers to the connector catalog (GitHub, Blender, WhatsApp, Notion, Playwright, Xcode, Atlassian, etc.)
- Cleans up ~2,700 junk records
- Eliminates the `mcp_misclassified` status entirely

