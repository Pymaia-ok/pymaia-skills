

## Plan: Fix Quality Monitor + Investigate "polynod"

### Bug 1: Quality Monitor can't find events

**Root cause**: The `mcp-quality-monitor` queries `agent_analytics` filtering by `event_type = 'tool_call'`, but the MCP server inserts events with `event_type = 'solve_goal'`. The filter never matches, so the monitor always reports "no events."

**Data proof**: There are 4 `solve_goal` events in `agent_analytics` (including "crear contenido con IA" from minutes ago), but 0 rows match `event_type = 'tool_call'`.

**Fix**: In `supabase/functions/mcp-quality-monitor/index.ts` line 26, change:
```
.eq("event_type", "tool_call")
```
to:
```
.eq("event_type", "solve_goal")
```

Also update the `crossCatalogSearch` results logging: the monitor reads `event_data` fields like `skills_count`, `connectors_count`, `plugins_count` but the MCP server stores different field names (`option_a_count`, `option_b_count`, `classifier_category`, etc.). Need to adjust the monitor to read the actual field names, or better: add result counts to the `event_data` in the MCP server's `solve_goal` insert.

**Changes in `mcp-server/index.ts`** (line ~1144): Add `skills_count`, `connectors_count`, `plugins_count` and `keywords` to the `event_data` so the quality monitor can analyze result quality.

**Changes in `mcp-quality-monitor/index.ts`**: Fix the `event_type` filter and update the empty-result detection logic to use the new fields.

### Bug 2: "polynod" not in catalog

Searched all tables (`skills`, `mcp_servers`, `plugins`). No item named "polynod" or similar exists. This is not a search bug — the tool simply isn't in the catalog. If you want it added, I'd need the GitHub URL or more details about what "polynod" is.

### Files Modified

1. `supabase/functions/mcp-quality-monitor/index.ts` — fix `event_type` filter
2. `supabase/functions/mcp-server/index.ts` — add result counts to `solve_goal` analytics insert

