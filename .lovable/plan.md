

## Plan: New MCP Tools for Agent Workflows

### Analysis of Gaps

After reviewing all 31 existing tools, I identified 6 high-value tools that agents like Claude lack today:

| Gap | Why it matters |
|-----|---------------|
| No way to read raw SKILL.md content | Agent can't inspect or fork a skill |
| No way to test/validate before importing | Agent publishes blind, no quality gate |
| No "my skills" listing | Authenticated users can't manage their catalog |
| No semantic search via MCP | 38K skills but agents can only do keyword search |
| No trust/security detail tool | Agent sees a number but can't explain why |
| No changelog/what's new tool | Agent can't tell user what changed recently |

### New Tools to Add

**File**: `supabase/functions/mcp-server/index.ts`

#### 1. `get_skill_content` — Read raw SKILL.md
- Returns the raw `install_command` (which contains the SKILL.md) for a given slug
- Enables agents to read, fork, or adapt existing skills
- Uses the same logic as `skill-raw` edge function but accessible via MCP

#### 2. `validate_skill` — Quality check without publishing
- Accepts raw SKILL.md text, sends it to `generate-skill` with `import_skill` action (parse only)
- Returns quality score, parsed fields, and improvement suggestions
- Does NOT insert into the catalog — pure validation
- No auth required (read-only operation)

#### 3. `my_skills` — List authenticated user's skills
- Requires API key auth (pymsk_...)
- Returns all skills owned by the authenticated user (any status: pending, approved, rejected)
- Shows quality score, status, install count, eval history

#### 4. `semantic_search` — AI-powered meaning-based search
- Calls the existing `generate-embeddings` edge function to embed the query
- Uses the existing `semantic_search_skills` RPC for vector similarity search
- Falls back to keyword search if embeddings fail
- Much better for natural language queries like "help me write better pull request descriptions"

#### 5. `get_trust_report` — Detailed security breakdown
- Given a slug, returns the full trust score breakdown: security scan result, VirusTotal status, GitHub activity, review sentiment
- Helps agents make informed security recommendations

#### 6. `whats_new` — Recent catalog changes
- Returns recently added/updated skills, connectors, and plugins (last N days)
- Useful for agents to proactively suggest new tools

### Implementation Details

All 6 tools go in `supabase/functions/mcp-server/index.ts`. Version bump to 8.5.0. Update the tools array in the GET `/` response.

- `get_skill_content`: query `skills` table for `install_command` by slug
- `validate_skill`: POST to `generate-skill` with `action: "import_skill"`, return parsed result without inserting
- `my_skills`: filter `skills` by `creator_id = currentApiKeyUserId`, join with `skill_eval_runs` for eval history
- `semantic_search`: POST to `generate-embeddings` to get vector, then call `semantic_search_skills` RPC
- `get_trust_report`: query `skills` or `mcp_servers` or `plugins` for security fields (scan result, trust score, VT status, last commit, stars)
- `whats_new`: query all 3 tables ordered by `created_at DESC` with date filter

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/mcp-server/index.ts` | Add 6 new tools, bump version to 8.5.0 |

No DB migrations needed — all tools use existing tables and RPCs.

