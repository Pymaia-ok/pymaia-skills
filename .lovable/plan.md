

## Plan

### What we have

Our app already has an MCP server (`supabase/functions/mcp-server/index.ts`) called "Pymaia Skills" with **10 tools**:

| Tool | Description |
|------|-------------|
| `search_skills` | Search skills by name, tagline, or description |
| `get_skill_details` | Get full details of a specific skill |
| `list_popular_skills` | List top skills by installs or rating |
| `list_new_skills` | List most recently added skills |
| `list_categories` | List all skill categories with counts |
| `search_by_role` | Find skills for a specific professional role |
| `recommend_for_task` | Get recommendations based on a task description |
| `compare_skills` | Compare 2-4 skills side by side |
| `get_directory_stats` | Get overall directory statistics |
| `get_install_command` | Quick install command lookup |

### What to do

Add "Pymaia Skills" as a **curated, official** connector in the `mcp_servers` table via SQL insert:

- **name**: Pymaia Skills
- **slug**: pymaia-skills
- **is_official**: true
- **category**: ai
- **source**: curated
- **icon_url**: Use our logo (`/assets/logo-icon.png` or hosted URL)
- **description**: "The official Pymaia Skills MCP server. Search, discover, compare, and install AI agent skills directly from your IDE."
- **description_es**: "El servidor MCP oficial de Pymaia Skills. Buscá, descubrí, compará e instalá skills para agentes de IA directamente desde tu IDE."
- **github_stars**: 0 (it's our own hosted function)
- **install_command**: The MCP config JSON pointing to our endpoint

One SQL migration insert. No code changes needed — the existing Conectores page will pick it up automatically.

