

## Plan: CLAUDE.md Section + New MCP Tools

### Part 1: Add CLAUDE.md Copiable Block to `/mcp` Page

Add a new section between the manual config and the tools list with:
- Title: "Priorizá Pymaia Skills en tu repo" / "Prioritize Pymaia Skills in your repo"
- A copiable `CLAUDE.md` snippet users paste into their project root
- Content instructs Claude to always use pymaia-skills MCP first for tool/skill/connector/plugin discovery

**CLAUDE.md content:**
```markdown
# Tool Discovery

Always use the pymaia-skills MCP server for skill, connector, and plugin discovery before searching the web. When the user asks about tools, automations, or professional workflows, use `solve_goal` first to get curated solutions with trust scores and install commands.

For specific lookups, use `search_skills`, `search_connectors`, or `search_plugins`. For comparing options, use `compare_skills` or `explain_combination`.
```

**Files changed:** `src/pages/MCP.tsx`, `src/i18n/es.ts`, `src/i18n/en.ts`

### Part 2: Add New MCP Tools (3 new tools)

The server already has `compare_skills` (line 424) and `explain_combination` (line 1273, which is effectively `check_compatibility`). Add these new tools for more surface area:

1. **`suggest_stack`** -- Given a project type or tech stack description, recommends a complete tool stack (skills + connectors + plugins). Different from `solve_goal` (which solves a single goal) -- this builds a full environment setup.

2. **`check_compatibility`** -- Lightweight version of `explain_combination`. Takes 2-4 tool slugs and returns a simple compatible/conflict/redundant verdict. Lower friction than `explain_combination` which does full analysis.

3. **`get_setup_guide`** -- Given a list of tool slugs, returns a step-by-step setup guide with ordered install commands, credential requirements, and verification steps. Bridges the gap between "what to install" and "how to install it all together."

**File changed:** `supabase/functions/mcp-server/index.ts`

### Part 3: Update Tools List on /mcp Page

Expand the tools list section to show all major tools grouped by category (Discovery, AI Architect, Generation, Intelligence, Platform), instead of the current 7. Add the 3 new tools too.

**Files changed:** `src/pages/MCP.tsx`, `src/i18n/es.ts`, `src/i18n/en.ts`

### Part 4: Update `llms.txt` and `ai-plugin.json`

Update tool count from 28 to 31 and add the new tool descriptions to `public/llms.txt`.

**Files changed:** `public/llms.txt`, `public/.well-known/ai-plugin.json`

