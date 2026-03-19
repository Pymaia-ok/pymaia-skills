

# Fix: Intelligent Install Command Resolution for MCP Connectors

## Problem

The `get_install_command` and `get_connector_details` tools return the raw `install_command` field from the database as-is. This field has **inconsistent formats** across 6,400+ connectors:

| Format | Count | Example |
|---|---|---|
| Bare URL | ~4,773 | `https://mcp.itsgloria.ai/mcp` |
| npx command | ~1,679 | `npx -y @smithery/cli install ...` |
| JSON config block | ~10 | `{"mcpServers":{"polynod":{...}}}` |
| `claude mcp add` | ~4 | `claude mcp add foo --transport sse ...` |
| Empty | unknown | `` |

When Claude Code receives a JSON config (like Polynod's), it doesn't know how to use it — it tries `claude mcp add --transport http` which fails because `streamable-http` is not supported by the CLI.

## Solution

Add an **install command normalizer** in the MCP server that wraps all `install_command` outputs with multi-agent install instructions. For each connector, generate **3 formats**:

1. **JSON config** (for manual `~/.claude.json` or `mcp.json` editing) — works for ALL transport types
2. **CLI command** (when possible: `claude mcp add` for stdio/sse, `npx @anthropic-ai/mcp-remote` bridge for streamable-http)
3. **Cursor/Windsurf** config variant

## Changes

### 1. `supabase/functions/mcp-server/index.ts` — Add `normalizeInstallCommand()` helper

A function that takes the raw `install_command` and returns a formatted, multi-format install guide:

- **If JSON config**: Parse it, extract transport type. If `streamable-http`, output the JSON config for manual editing + `npx @anthropic-ai/mcp-remote` bridge command as CLI alternative
- **If bare URL**: Generate both a JSON config block (with `streamable-http` type) and a `npx @anthropic-ai/mcp-remote` bridge command
- **If npx command**: Return as-is for CLI, also generate equivalent JSON config with `command`/`args`
- **If `claude mcp add`**: Return as-is for CLI
- **If empty**: Return "No install command available. Visit the homepage/GitHub for setup instructions."

### 2. Apply normalizer in 3 tool handlers

- `get_install_command` (line ~2853, ~2866)
- `get_connector_details` (line ~931)
- `search_connectors` result formatting

### 3. Output format example (for Polynod)

```
## Install Polynod

### Option A — Edit config file (~/.claude.json or mcp.json)
```json
{
  "mcpServers": {
    "polynod": {
      "type": "streamable-http",
      "url": "https://polynod.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY_HERE" }
    }
  }
}
```

### Option B — CLI with mcp-remote bridge
```
npx -y @anthropic-ai/mcp-remote https://polynod.com/mcp --header "Authorization: Bearer YOUR_API_KEY_HERE"
```

⚠️ This server uses streamable-http transport. `claude mcp add` doesn't support this transport natively — use Option A or the mcp-remote bridge.
```

## Files to modify

| File | Change |
|---|---|
| `supabase/functions/mcp-server/index.ts` | Add `normalizeInstallCommand()` helper, apply to `get_install_command`, `get_connector_details`, and `search_connectors` output |

