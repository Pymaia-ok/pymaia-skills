

## Research Results: Real MCP Servers/Skills/Plugins for Missing Tools

I researched each of the 14 tools with no/weak coverage. Here's what actually exists and is verifiable:

### Verified Real MCP Servers/Tools Found

| Tool | What Exists | Source | Reliability |
|------|------------|--------|-------------|
| **Cline** | MCP Marketplace (cline/mcp-marketplace) -- Cline IS an MCP client, not a server. But has its own marketplace with 705+ stars | Official (cline org) | High |
| **Luma Dream Machine** | `lumalabs/luma-api-mcp` -- Official MCP by Luma Labs (20 stars). Also `bobtista/luma-ai-mcp-server` community | Official | High |
| **Leonardo AI** | `ish-joshi/leonardo-mcp-server` -- Community MCP (2 stars), HTTP+stdio | Community | Low |
| **Ideogram** | `Sunwood-ai-labs/ideagram-mcp-server` -- Community MCP (5 stars), npm package | Community | Medium |
| **Napkin AI** | `LouisChanCLY/napkin-ai-mcp` -- Community MCP, npm 0.1.2, MIT license | Community | Medium |
| **Replit** | `NOVA-3951/Replit-MCP` -- Community MCP (1 star). Also Replit itself is an MCP client with native MCP support | Community | Low |
| **Lovable** | `hiromima/lovable-mcp-server` -- Unofficial community MCP for analyzing Lovable projects | Community | Low |
| **Kiro** | Kiro is AWS's AI IDE -- it's an MCP client, not a server. Uses `awslabs/mcp` servers | N/A (is a client) | N/A |

### Nothing Reliable Found

| Tool | Finding |
|------|---------|
| **Pomelli** | Google Labs marketing tool (Oct 2025). No MCP server, no GitHub integration, no API. It's a closed Google experiment |
| **v0** | Vercel's UI generator. No MCP server exists for v0 itself. Vercel has `mcp.vercel.com` for Vercel platform, but not v0 specifically |
| **Bolt.new** | StackBlitz product. No official or community MCP server found. It's an MCP client (supports connecting TO MCP servers) |
| **Windsurf** | Codeium's AI IDE. It's an MCP client, not a server. No MCP server exists to connect TO Windsurf |
| **Writesonic** | No MCP server found. No GitHub repos. Only internal repos (langchain fork, etc.) |
| **Jasper** | No MCP server found. Closed platform, no public API for MCP |
| **udio** | No MCP server found. Only unofficial Python wrappers for the music API, not MCP |

### Recommended Action Plan

**Add as curated connectors (real, verifiable MCP servers):**
1. **Luma Dream Machine** -- `lumalabs/luma-api-mcp` (official, 20 stars)
2. **Ideogram** -- `Sunwood-ai-labs/ideagram-mcp-server` (community, npm package, 5 stars)
3. **Napkin AI** -- `LouisChanCLY/napkin-ai-mcp` (community, npm 0.1.2)

**Add as curated connectors with caveat (low reliability but real):**
4. **Leonardo AI** -- `ish-joshi/leonardo-mcp-server` (2 stars, but functional)
5. **Replit** -- `NOVA-3951/Replit-MCP` (1 star, but has Smithery integration)

**Clarify as MCP clients (not servers) -- already covered by existing skills/connectors:**
- Cline, Kiro, Windsurf, Bolt.new -- These are MCP clients (AI IDEs). They USE skills/connectors, they don't need to be listed AS connectors

**Do NOT add (nothing real exists):**
- Pomelli (closed Google experiment, no API)
- v0 (no MCP server)
- Lovable (only unofficial analyzer, not useful)
- Writesonic, Jasper, udio (no MCP/API integrations)

### Implementation

One SQL migration inserting 5 new curated connectors into `mcp_servers` with:
- Real GitHub URLs and install commands
- `source = 'curated'`, `status = 'approved'`
- Accurate star counts and descriptions
- `ON CONFLICT (slug) DO NOTHING` for safety

Also fix the 8 rejected Ideogram skills -- re-approve the best one if the content is valid, since we now have a real MCP server backing it.

