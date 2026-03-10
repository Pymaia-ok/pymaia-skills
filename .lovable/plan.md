

## Plan: Fix Meta Ads discoverability in MCP tools

### Root Cause
Two issues combined:

1. **Claude didn't use `solve_goal`** — it used basic `search_skills` + `search_connectors` separately. The llms.txt/ai-plugin.json updates from the previous session should help, but they may not be deployed yet.

2. **The skill "Facebook Ads" has `status: pending`** — so `search_skills` correctly returns nothing for "meta ads". The Meta Ads tools exist as **connectors** (`meta-ads`, `meta-mcp`, `armavita-meta-ads-mcp`) with status `approved`, but Claude's search may not have matched them due to the query terms used.

### Changes

**1. Approve the "Facebook Ads" skill (DB migration)**
- `UPDATE skills SET status = 'approved' WHERE slug = 'facebook-ads'` — this is a real skill for Facebook/Meta Ads campaign management that should be discoverable.

**2. Improve `search_connectors` search to include `name` synonyms**
- The current `search_connectors` searches `name.ilike`, `slug.ilike`, `description.ilike`. When Claude searches "meta ads", it should match "Meta Ads Manager" (slug: `meta-ads`). This already works — the issue was Claude not calling the right tool.

**3. Update `solve_goal` tool description to be more assertive**
- In the MCP server, make the `solve_goal` description clearer that it's the PRIMARY tool for any goal-based query, so Claude picks it first.
- Add explicit instruction in tool descriptions of `search_skills` and `search_connectors` to suggest using `solve_goal` instead for goal-oriented queries.

**4. Add cross-references in search tool responses**
- When `search_skills` finds no results, append a hint: "Try `solve_goal` for a cross-catalog search including MCP connectors and plugins."
- When `search_connectors` finds no results, do the same.

### Impact
- "Meta Ads" queries will now return the approved skill AND the 3 approved connectors.
- Claude will be nudged toward `solve_goal` which searches skills + connectors + plugins simultaneously.

