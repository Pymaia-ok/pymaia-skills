

## Plan: Expansión completa de fuentes de skills — IMPLEMENTADO ✅

### Sources implementados en `sync-skills`

| Source | Invocación | Descripción |
|--------|-----------|-------------|
| `skillsmp` | `{"source":"skillsmp","letter":"react"}` | API paginada de skillsmp.com |
| `skillsmp-bigrams` | `{"source":"skillsmp-bigrams","letter":"a"}` | 26 bigramas aa-az automáticos |
| `skillssh` | `{"source":"skillssh","letter":"a"}` | Firecrawl map (legacy) |
| `skillssh-crawl` | `{"source":"skillssh-crawl"}` | Firecrawl crawl async |
| `claudeplugins` | `{"source":"claudeplugins","letter":"a"}` | Firecrawl map (legacy) |
| `claudeplugins-crawl` | `{"source":"claudeplugins-crawl"}` | Firecrawl crawl async |
| `github-search` | `{"source":"github-search","topic":"mcp-server"}` | GitHub Search API por topics |
| `github-enrich` | `{"source":"github-enrich","batchSize":50}` | Enriquece skills existentes con GitHub API |
| `smithery-crawl` | `{"source":"smithery-crawl"}` | Crawl de smithery.ai |
| `mcpso-crawl` | `{"source":"mcpso-crawl"}` | Crawl de mcp.so |
| `glama-crawl` | `{"source":"glama-crawl"}` | Crawl de glama.ai/mcp/servers |
| `pulsemcp-crawl` | `{"source":"pulsemcp-crawl"}` | Crawl de pulsemcp.com |
| `awesome-lists` | `{"source":"awesome-lists"}` | Scrape READMEs de awesome-mcp-servers |

### Secrets requeridos
- `SKILLSMP_API_KEY` ✅
- `FIRECRAWL_API_KEY` ✅ (connector)
- `GITHUB_TOKEN` ✅
