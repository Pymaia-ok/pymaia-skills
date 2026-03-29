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
  <img src="https://img.shields.io/badge/skills-43%2C000%2B-blue" alt="43K+ Skills" />
  <img src="https://img.shields.io/badge/MCP%20connectors-500%2B-green" alt="500+ Connectors" />
  <img src="https://img.shields.io/badge/plugins-100%2B-orange" alt="100+ Plugins" />
  <img src="https://img.shields.io/badge/MCP%20tools-48-purple" alt="48 MCP Tools" />
  <img src="https://img.shields.io/badge/transport-Streamable%20HTTP-brightgreen" alt="Streamable HTTP" />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="MIT License" />
</p>

---

## What is Pymaia Skills?

Pymaia Skills is a comprehensive discovery platform and **MCP server** that gives AI agents access to the largest curated directory of AI skills, MCP connectors, and plugins. Instead of searching manually, your agent can find, compare, and recommend the right tools for any task.

**Key capabilities:**
- Search across 43,000+ skills, 500+ MCP connectors, and 100+ plugins
- Get AI-powered recommendations based on business goals
- Compare tools side by side
- Get role-specific toolkits (marketer, developer, lawyer, designer, etc.)
- Generate custom skills on demand
- 13-layer security scanning with Trust Scores (0–100)

---

## Quick Start

### Claude Code (Global — recommended)

```bash
claude mcp add pymaia-skills --transport http --scope user https://mcp.pymaia.com
```

### Claude Desktop

Add to your MCP config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "pymaia-skills": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote", "https://mcp.pymaia.com"]
    }
  }
}
```

### Cursor / Windsurf / Antigravity / OpenClaw

Use the Streamable HTTP endpoint:

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

---

## MCP Tools (48)

### Discovery (15)

| Tool | Description |
|------|-------------|
| `search_skills` | Search 43K+ skills by keyword, category, or role |
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
| `get_install_command` | Get install command for any skill |

### AI Solutions Architect (8)

| Tool | Description |
|------|-------------|
| `solve_goal` | Given a business goal, recommends the best tools with trust scores and install commands |
| `get_role_kit` | Pre-built solution stacks for specific roles (marketer, dev, lawyer, etc.) |
| `suggest_stack` | Recommend complete environment setups |
| `recommend_for_task` | Task-specific tool recommendations |
| `compare_skills` | Side-by-side comparison of similar tools |
| `explain_combination` | How to integrate multiple tools together |
| `check_compatibility` | Check if tools work well together |
| `get_setup_guide` | Step-by-step setup guide for a tool |

### Generation (2)

| Tool | Description |
|------|-------------|
| `generate_custom_skill` | Generate a custom skill via AI based on your needs |
| `suggest_for_skill_creation` | Get suggestions to improve a skill you're building |

### Intelligence (4)

| Tool | Description |
|------|-------------|
| `trending_solutions` | Discover trending tools and rising stars |
| `rate_recommendation` | Rate how helpful a recommendation was |
| `personalized_feed` | Get personalized tool recommendations |
| `get_top_creators` | Browse top skill creators |

### Security & Quality (3)

| Tool | Description |
|------|-------------|
| `scan_skill` | Security scan a skill |
| `run_skill_evals` | Run evaluation tests on a skill |
| `get_skill_analytics` | Get usage analytics for a skill |

### Skills 2.0 (6)

| Tool | Description |
|------|-------------|
| `get_skill_content` | Get full SKILL.md content |
| `validate_skill` | Validate a skill's structure |
| `my_skills` | List your published skills |
| `semantic_search` | Vector-based semantic search |
| `get_trust_report` | Get detailed trust/security report |
| `whats_new` | See what's new in the catalog |

### Lifecycle (5)

| Tool | Description |
|------|-------------|
| `publish_skill` | Publish a skill to the marketplace |
| `import_skill_from_agent` | Import a skill directly from an agent |
| `update_skill` | Update an existing skill |
| `unpublish_skill` | Remove a skill from the marketplace |
| `report_skill` | Report a problematic skill |

### Platform & Community (5)

| Tool | Description |
|------|-------------|
| `submit_goal_template` | Share a goal template with the community |
| `browse_community_templates` | Browse goal templates from other users |
| `a2a_query` | Agent-to-agent protocol for tool discovery |
| `agent_analytics` | Usage analytics for your agent's tool discovery |
| `install_bundle` | Install a curated bundle of tools |

---

## Example Usage

Once connected, ask your AI agent:

- *"Search for the best email marketing tools"*
- *"I need to automate my sales pipeline, what tools should I use?"*
- *"Compare Resend vs SendGrid MCP connectors"*
- *"Give me the starter kit for a digital marketer"*
- *"Generate a custom skill for tracking my competitors' pricing"*

---

## Compatible Agents

Skills use the open AgentSkills standard (SKILL.md) and work with:
- **Claude Code** — `claude skill add` CLI command
- **Claude.ai** — Upload ZIP in Settings → Features
- **Manus** — Upload ZIP or import from GitHub
- **Cursor** — Copy to `.cursor/skills/` directory
- **Google Antigravity** — Copy to `.antigravity/skills/` directory
- **OpenClaw** — Copy to `skills/` directory

---

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **MCP Transport:** Streamable HTTP
- **Search:** Semantic search with vector embeddings
- **Security:** 13-layer scanning pipeline with Trust Scores
- **Auth:** API keys (`pymsk_` prefix) for programmatic access

---

## API Access

Get an API key at [skills.pymaia.com/mis-skills](https://skills.pymaia.com/mis-skills) to use the MCP server with authentication for higher rate limits and personalized recommendations.

```
Authorization: Bearer pymsk_YOUR_API_KEY
```

Authenticated users get 120 req/min (vs 60 req/min anonymous).

---

## Links

- **Website:** [skills.pymaia.com](https://skills.pymaia.com)
- **MCP Endpoint:** [mcp.pymaia.com](https://mcp.pymaia.com)
- **API Documentation:** [skills.pymaia.com/api-docs](https://skills.pymaia.com/api-docs)
- **llms.txt:** [skills.pymaia.com/llms.txt](https://skills.pymaia.com/llms.txt)

---

## License

MIT
