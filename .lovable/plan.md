

# Auto-Discovery Pipeline for Official/High-Authority MCP Servers

## Problem
High-profile official MCPs like Freepik exist but aren't in our catalog. We only find them manually. Current sync sources (Smithery, official registry, awesome-mcp-servers, Glama) miss MCPs that are announced on company docs/blogs but not yet listed in registries.

## Solution: New Edge Function `discover-official-mcps`

A scheduled function that uses **3 discovery strategies** to find official MCP servers from authoritative companies, then inserts them as `pending` for admin review (or `approved` if confidence is high enough).

### Strategy 1 — GitHub Search for Official MCP Repos
Search GitHub for repos matching patterns like `*-mcp` or `mcp-server` from organizations with high authority (verified orgs, >1000 followers, or known brands). Queries:
- `"mcp" in:name org:freepik-company` (known orgs watchlist)
- `topic:mcp-server stars:>100 pushed:>LAST_30_DAYS`
- `"modelcontextprotocol" in:readme stars:>50 created:>LAST_30_DAYS`
- `filename:mcp.json stars:>200` (repos exposing MCP config)

### Strategy 2 — AI-Powered Web Discovery
Use Lovable AI (Gemini Flash) to generate a list of **known SaaS companies likely to have MCP servers**, then verify each one:
1. Maintain a curated **watchlist** table (`mcp_discovery_watchlist`) with ~100 high-value companies (Figma, Notion, Stripe, Vercel, Datadog, etc.)
2. For each company, check: `{domain}/mcp`, `{docs_domain}/mcp`, GitHub org repos matching `*mcp*`
3. If a valid MCP endpoint or repo is found → queue for indexing

### Strategy 3 — Social Signal Monitoring
Search GitHub trending + HackerNews/Reddit via web search for announcements:
- Query: `"launched MCP" OR "MCP server" OR "MCP integration" site:github.com`
- Parse results for new official announcements from companies not yet in our catalog

## Database Changes

**New table: `mcp_discovery_watchlist`**
| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| company_name | text | e.g. "Freepik" |
| domain | text | e.g. "freepik.com" |
| github_org | text | e.g. "freepik-company" |
| docs_url | text | Known docs URL pattern |
| last_checked_at | timestamptz | When we last checked |
| status | text | `watching` / `found` / `indexed` |
| discovered_mcp_url | text | If found, the MCP endpoint |

Pre-seed with ~50-100 high-value companies (Adobe, Figma, Canva, Stripe, Vercel, Datadog, Sentry, Linear, Notion, Shopify, HubSpot, Twilio, SendGrid, Cloudflare, DigitalOcean, etc.)

## Edge Function: `discover-official-mcps`

3 modes triggered by cron:
1. **`check_watchlist`** (daily) — Iterate watchlist companies, check GitHub org for `*mcp*` repos, check `{domain}/mcp` endpoint. If found → insert into `mcp_servers` as `pending` + update watchlist status.
2. **`github_search`** (daily) — Run GitHub search queries for new high-star MCP repos not in our catalog. Auto-approve if >500 stars + verified org.
3. **`ai_expand_watchlist`** (weekly) — Use Gemini Flash to suggest new companies to add to watchlist based on industry trends and recent MCP ecosystem growth.

## Auto-Approval Logic
- **Auto-approve** if: verified GitHub org + >500 stars + has README with MCP setup instructions
- **Pending** otherwise, for admin review
- Always set `source: 'auto-discovery'`, `is_official: true` for verified org repos

## Cron Schedule
- `check_watchlist`: daily at 04:00 UTC
- `github_search`: daily at 05:00 UTC  
- `ai_expand_watchlist`: weekly on Mondays at 03:00 UTC

## Files to Create/Modify

| File | Change |
|---|---|
| `supabase/functions/discover-official-mcps/index.ts` | New function with 3 modes |
| DB migration | Create `mcp_discovery_watchlist` table + seed ~80 companies |
| Cron jobs | 3 new scheduled invocations |

