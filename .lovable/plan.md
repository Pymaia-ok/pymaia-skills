

## Problem Analysis

The MCP server's search works correctly — querying "instagram" returns 10+ relevant connectors. The issue is **Claude's interpretation and behavior**, not the search engine itself. Specifically:

1. Claude confused "Pymaia Instagram connector" with a locally connected/installed connector and abandoned the MCP results to try the browser instead
2. Tool response format lacks clear **actionable guidance** — it returns raw listings without explaining what to do with the results
3. The `search_connectors` response doesn't clarify that these are **MCP servers the user can install**, not pre-connected APIs
4. `solve_goal` is described as the primary tool but Claude sometimes bypasses it for direct search tools, getting less helpful responses

## Changes

### 1. Improve `search_connectors` response format
**File**: `supabase/functions/mcp-server/index.ts`

Add a contextual header to the response that explains what the results are and how to use them:
```
"Found {N} MCP connectors for '{query}'. These are installable MCP servers 
that give your AI agent access to {service}. Pick one and use `get_install_command` 
or `get_connector_details` for setup instructions."
```

Also include `slug` in the response so Claude can call `get_connector_details` or `get_install_command` next.

### 2. Improve `search_connectors` tool description
Make the description clearer about what connectors ARE and what the user should do with results:
```
"Search 500+ installable MCP connectors by name. These are MCP servers users 
can add to Claude, Cursor, or any AI agent. Returns name, install command, 
and GitHub stars. Use get_connector_details(slug) for full setup guide."
```

### 3. Improve `explore_directory` and `solve_goal` response with actionable next steps
Add footer text to results suggesting specific next actions:
- "Use `get_connector_details('instagram')` for full setup instructions"
- "Use `get_install_command('instagram')` for the exact install command"

### 4. Add `display_name` and `homepage` to connector search results
Currently `search_connectors` returns description but not homepage/docs — Claude lacks the info to tell the user what the connector actually does beyond a one-liner. Add `homepage, docs_url` to the select query so Claude can provide richer answers.

### 5. Enhance response when multiple similar connectors exist
When searching "instagram" returns 10 results, add a summary header grouping them by use case:
- Publishing/scheduling
- Analytics/insights  
- DMs/messaging
- Ads (Meta Marketing)

This helps Claude (and the user) pick the right one instead of being overwhelmed.

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/mcp-server/index.ts` | Improve tool descriptions, response headers, result formatting for `search_connectors`, `explore_directory`, and `solve_goal` |

