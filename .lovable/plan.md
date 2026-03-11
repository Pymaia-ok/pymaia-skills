

## Plan: Add Observability Logs + Diagnose Empty Results

### Problem

Two issues:
1. **No observability**: The MCP server only logs boot/shutdown. There's no way to see what queries come in, what keywords are extracted, how many results are found, etc.
2. **Empty results for "cold email outbound"**: The `crossCatalogSearch` uses `ILIKE %keyword%` matching. When the AI classifier returns keywords like "cold email", "outbound", "sales automation", the ILIKE search likely finds zero matches because no skill/connector name or tagline contains those exact substrings. The system falls back but still returns nothing meaningful. Claude then honestly says "nothing found" instead of surfacing the `email-mcp` connectors it apparently did find separately via `search_connectors`.

### Root Cause of Poor Results

The `crossCatalogSearch` function (used by `solve_goal`) searches each keyword via `ILIKE %keyword%` against `display_name`, `tagline`, `slug`, and `category`. For a query like "cold email outbound":
- Keywords from AI: `["cold email", "outbound", "sales automation", "email sequences"]`
- `ILIKE %cold email%` won't match `email-mcp` (no "cold" in it)
- `ILIKE %outbound%` won't match anything
- The search misses `email-mcp` because it only contains "email" not "cold email"

The individual `search_skills` and `search_connectors` tools have a `wordSplitSearch` fallback that breaks multi-word queries into individual words, but `crossCatalogSearch` does NOT have this fallback. It searches each keyword as-is.

### Changes

#### 1. Add structured console.log to key tools (~15 lines each)

In `supabase/functions/mcp-server/index.ts`, add logging at:

- **`solve_goal` handler** (after intent classification): Log the goal, extracted keywords, intent classification, and result counts
- **`search_skills` handler**: Log query, matched count, fallback used
- **`search_connectors` handler**: Log query, matched count, fallback used
- **`crossCatalogSearch` function**: Log each keyword search and result counts

Format: `console.log(JSON.stringify({ tool: "...", ... }))` for structured parsing in logs.

#### 2. Fix `crossCatalogSearch` to split multi-word keywords

The core bug: `crossCatalogSearch` receives keywords like `"cold email"` and searches them as-is via ILIKE. It should also break multi-word keywords into individual words for broader matching.

In the `crossCatalogSearch` function:
- Before the main loop, expand `keywords` by also splitting multi-word entries into individual words (e.g., `"cold email"` → also add `"cold"`, `"email"`)
- Deduplicate the expanded list
- This ensures `email-mcp` gets matched when the AI returns `"cold email"` as a keyword

#### Files Modified

- `supabase/functions/mcp-server/index.ts` — add ~40 lines of logging + ~5 lines to fix keyword splitting in `crossCatalogSearch`

