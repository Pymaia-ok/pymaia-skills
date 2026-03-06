

## Plan

### 1. Add 4 new curated connectors to the database

Insert PostHog (official), Omnisend (community), ClickUp (community), and Resend (community) into `mcp_servers` with proper metadata, icons, descriptions in EN/ES, and `is_official` flag.

### 2. Redesign the Official/Community filter

Replace the current row of filter buttons ("Todos / Oficiales / Comunitarios") with a filter icon button next to the search bar. Clicking it opens a small popover/dropdown with three options: All, Official, Community. This saves vertical space and matches the reference screenshot better.

**Layout change:**
- Search bar gets a filter icon button on the right side (inside or adjacent to the input)
- Popover with 3 toggle options appears on click
- Remove the current standalone filter row below categories

### 3. Technical details

**Database inserts** (via insert tool):
- PostHog: `is_official: true`, icon from Simple Icons, `github_url: https://github.com/PostHog/mcp`, category: analytics
- Omnisend: `is_official: false`, category: marketing, `github_url: https://github.com/plutzilla/omnisend-mcp`
- ClickUp: `is_official: false`, category: productivity, `github_url: https://github.com/smithery-ai/clickup-mcp-server`
- Resend: `is_official: false`, category: communication, `github_url: https://github.com/Hawstein/resend-mcp`

**UI changes** in `src/pages/Conectores.tsx`:
- Add a `Filter` icon (from lucide) next to the search input
- Use Radix Popover to show filter options on click
- Remove the existing official/community filter row (lines ~195-212)
- Keep the same `officialFilter` state logic

