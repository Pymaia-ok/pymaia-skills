<p align="center">
  <img src="https://skills.pymaia.com/favicon.ico" width="80" alt="Pymaia Skills Logo" />
</p>

<h1 align="center">Pymaia Skills</h1>

<p align="center">
  <strong>The largest curated AI skill directory — now as an MCP server.</strong>
</p>

<p align="center">
  <a href="https://skills.pymaia.com">Website</a> ·
  <a href="https://mcp.pymaia.com">MCP Endpoint</a> ·
  <a href="https://skills.pymaia.com/api-docs">API Docs</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/skills-35%2C000%2B-blue" alt="35K+ Skills" />
  <img src="https://img.shields.io/badge/MCP%20connectors-500%2B-green" alt="500+ Connectors" />
  <img src="https://img.shields.io/badge/plugins-100%2B-orange" alt="100+ Plugins" />
  <img src="https://img.shields.io/badge/MCP%20tools-27-purple" alt="27 MCP Tools" />
  <img src="https://img.shields.io/badge/transport-Streamable%20HTTP-brightgreen" alt="Streamable HTTP" />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="MIT License" />
</p>

---

## What is Pymaia Skills?

Pymaia Skills is a comprehensive discovery platform and **MCP server** that gives AI agents access to the largest curated directory of AI skills, MCP connectors, and plugins. Instead of searching manually, your agent can find, compare, and recommend the right tools for any task.

**Key capabilities:**
- Search across 35,000+ skills, 500+ MCP connectors, and 100+ plugins
- Get AI-powered recommendations based on business goals
- Compare tools side by side
- Get role-specific toolkits (marketer, developer, lawyer, designer, etc.)
- Generate custom skills on demand

---

## Quick Start

### Claude Desktop / Claude Code

Add to your MCP config file (`~/.claude.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "pymaia-skills": {
      "type": "streamable-http",
      "url": "https://mcp.pymaia.com"
    }
  }
}
```

### Claude Code CLI

```bash
npx -y @anthropic-ai/mcp-remote https://mcp.pymaia.com
```

### Cursor / Windsurf / Other MCP Clients

Use the Streamable HTTP endpoint:

```
https://mcp.pymaia.com
```

---

## MCP Tools (27)

### Discovery

| Tool | Description |
|------|-------------|
| `search_skills` | Search 35K+ skills by keyword, category, or role |
| `get_skill_details` | Get full details for a specific skill |
| `list_popular_skills` | Browse top-rated and most-installed skills |
| `list_new_skills` | Discover recently added skills |
| `list_categories` | List all available categories |
| `search_by_role` | Find skills tailored to a professional role |
| `search_connectors` | Search 500+ MCP connectors |
| `get_connector_details` | Get details for a specific connector |
| `list_popular_connectors` | Browse most popular MCP connectors |
| `search_plugins` | Search 100+ plugins for Claude Code and Cowork |
| `get_plugin_details` | Get details for a specific plugin |
| `list_popular_plugins` | Browse most popular plugins |
| `explore_directory` | Browse the full directory with filters |
| `get_directory_stats` | Get aggregate stats for the entire catalog |
| `trending_solutions` | Discover trending tools and rising stars |

### AI Solutions Architect

| Tool | Description |
|------|-------------|
| `solve_goal` | Given a business goal, recommends the best tools and teaches installation |
| `get_role_kit` | Pre-built solution stacks for specific roles (marketer, dev, lawyer, etc.) |
| `recommend_for_task` | Task-specific tool recommendations |
| `compare_skills` | Side-by-side comparison of similar tools |
| `explain_combination` | How to integrate multiple tools together |
| `rate_recommendation` | Rate how helpful a recommendation was |
| `agent_analytics` | Usage analytics for your agent's tool discovery |

### Generation & Community

| Tool | Description |
|------|-------------|
| `generate_custom_skill` | Generate a custom skill via AI based on your needs |
| `suggest_for_skill_creation` | Get suggestions to improve a skill you're building |
| `submit_goal_template` | Share a goal template with the community |
| `browse_community_templates` | Browse goal templates from other users |
| `a2a_query` | Agent-to-agent protocol for tool discovery |

---

## Example Usage

Once connected, ask your AI agent:

- *"Search for the best email marketing tools"*
- *"I need to automate my sales pipeline, what tools should I use?"*
- *"Compare Resend vs SendGrid MCP connectors"*
- *"Give me the starter kit for a digital marketer"*
- *"Generate a custom skill for tracking my competitors' pricing"*

---

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **MCP Transport:** Streamable HTTP
- **Search:** Semantic search with vector embeddings
- **Auth:** API keys (`pymsk_` prefix) for programmatic access

---

## API Access

Get an API key at [skills.pymaia.com/api-docs](https://skills.pymaia.com/api-docs) to use the MCP server with authentication for higher rate limits and personalized recommendations.

```
Authorization: Bearer pymsk_YOUR_API_KEY
```

---

## Links

- **Website:** [skills.pymaia.com](https://skills.pymaia.com)
- **MCP Endpoint:** [mcp.pymaia.com](https://mcp.pymaia.com)
- **API Documentation:** [skills.pymaia.com/api-docs](https://skills.pymaia.com/api-docs)

---

## License

MIT
