

## Plan: Update Pymaia Skills MCP documentation to reflect all 28 tools

### Problem
The response from Claude is technically correct but suboptimal. Claude used the basic `search_connectors` tool instead of `solve_goal` (the AI Solutions Architect) because **the documentation doesn't advertise the 11 agent tools**. Three places are outdated:

1. **`public/llms.txt`** — Lists only 17 tools, missing all agent tools (solve_goal, get_role_kit, etc.)
2. **`public/.well-known/ai-plugin.json`** — Says "17 tools" in description_for_model
3. **Database record** (`mcp_servers` where slug='pymaia-skills') — Description says "10 tools"

### Changes

**1. Update `public/llms.txt`**
- Change "Available Tools (17)" to "Available Tools (28)"
- Add new section **"AI Solutions Architect (7):"** listing: `solve_goal`, `get_role_kit`, `explain_combination`, `rate_recommendation`, `generate_custom_skill`, `suggest_for_skill_creation`, `trending_solutions`
- Add new section **"Platform & Community (4):"** listing: `submit_goal_template`, `browse_community_templates`, `agent_analytics`, `a2a_query`
- Add a recommendation at the top of the tools section: "For complex goals, use `solve_goal` — it searches across all catalogs and returns two curated options with trust scores and install commands"

**2. Update `public/.well-known/ai-plugin.json`**
- Update `description_for_model` to mention 28 tools and the AI Solutions Architect capability
- Update `description_for_human` to reflect the expanded scope

**3. Update database description via migration**
- SQL UPDATE to `mcp_servers` where slug='pymaia-skills' to reflect 28 tools and AI Solutions Architect capabilities

**4. Update `public/llms-full.txt`** (if it exists with similar outdated content)
- Sync with the same tool list

### Impact
After this update, when Claude reads `llms.txt` or the plugin manifest, it will know about `solve_goal` and prefer it for complex queries like "outbound por Gmail", giving users the full two-option response with trust scores, compatibility analysis, and step-by-step install commands.

