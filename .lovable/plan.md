

## Plan: Fix Agent Tabs, Add Clay/Instantly MCPs, and UX Audit

### 1. Agent tabs: Replace logos with text names

**Problem**: The agent logos at 16x16px are unreadable tiny blobs (see screenshots). Users cannot tell which tab is which.

**Fix**: In `MultiAgentInstall.tsx`, change the `AgentTab` component to render the agent **name as text** instead of the logo image. Use `AGENT_LOGOS[agentKey].label` as plain text.

```
// Before: tiny unreadable logo
<img src={agent.logo} className="w-4 h-4" />

// After: clear text label
<span className="text-xs font-medium">{agent.label}</span>
```

### 2. Add Clay MCP and Instantly MCP to the catalog

Insert two new rows into `mcp_servers` via a database migration:

- **Clay** (`@clayhq/clay-mcp`): category `automation`, install command `npx -y @anthropic-ai/claude-code mcp add clay-mcp -- npx -y @clayhq/clay-mcp`, source `curated`, homepage `https://clay.com`
- **Instantly** (official MCP): category `communication`, install command based on their documented MCP endpoint, source `curated`, homepage `https://instantly.ai`

### 3. UX Audit -- Issues Found and Fixes

After reviewing all three detail pages as a UX expert, here are the issues:

#### A. Skill Detail (`SkillDetail.tsx`)

1. **"What this skill does" still in English when in ES mode** (line 222). The heading uses `t("detail.whatItDoes")` which seems correct, but the readme_summary headers ("Key features", "Requirements", "How to use") still render in English for some skills. The regex translation only fires for exact matches. Need to also translate "What this skill does" -> "Que hace esta skill" if it appears in the summary.

2. **Content hierarchy is confusing**: The page shows Install -> "What it does" description -> readme_summary (with duplicate info) -> SKILL.md parsed sections -> Required MCPs -> Use Cases -> Full README -> Reviews -> Install Guide -> FAQ. This is too many sections. The "Installation guide" at the bottom repeats the install command already shown at the top.

3. **Section header "What this skill does" is too generic**. Better: just use the skill name or "Description" / "Descripcion".

4. **Mobile order**: sidebar appears first (order-1) which pushes install and description way down. On mobile, the install action should come first.

**Proposed fixes for Skills**:
- Change "What this skill does" to "Description" / "Descripcion" 
- Remove the redundant "Installation guide" section at the bottom (the MultiAgentInstall at top already covers this)
- Ensure mobile order puts install first, then description, then sidebar

#### B. Connector Detail (`ConectorDetail.tsx`)

5. **Polynod icon is broken** (screenshot shows broken image). The `icon_url` loads but the image element overflows. The icon has no error fallback in the hero area (only the card grid has fallback).

6. **No ShareButton** on connectors (Skills and Plugins have it, connectors don't).

7. **"How to set up" section is generic** -- steps 1/2/3 are hardcoded translations that say the same thing for every connector. Not very helpful.

**Proposed fixes for Connectors**:
- Add `onError` fallback to the hero icon (show initial letter if image fails)
- Add `ShareButton` to sidebar

#### C. Plugin Detail (`PluginDetail.tsx`)

8. **Section headers are inconsistent** -- uses `text-sm font-semibold` while Skills use `text-2xl font-semibold`. Plugins feel cramped compared to Skills.

9. **No install count displayed** even though the data exists.

**Proposed fixes for Plugins**:
- Increase section header sizes for consistency with Skills
- Show install count in sidebar stats

#### D. Cross-cutting UX improvements

10. **Consistent section spacing**: Skills use `mb-10` between sections, Connectors use `mb-8`, Plugins use `mb-8`. Standardize to `mb-10`.

11. **"Install in" label is disconnected** from the tabs -- it floats above without visual connection. Wrap it in a card/container with the tabs.

### Summary of files to modify

| File | Changes |
|------|---------|
| `MultiAgentInstall.tsx` | Replace logo images with text labels in tabs |
| `SkillDetail.tsx` | Rename "What this skill does" heading, remove redundant install guide section at bottom |
| `ConectorDetail.tsx` | Add icon fallback in hero, add ShareButton |
| `PluginDetail.tsx` | Increase section header sizes, show install count |
| DB migration | Insert Clay and Instantly MCP connectors |

