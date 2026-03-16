## Plan: PRD Round 2 Fixes — Estado: ✅ Implementado

### Fix 1: solve_goal Classification (P0) ✅
- Expandido KEYWORD_DOMAIN_MAP: +2 dominios nuevos (healthcare, personal-finance), +30 keywords en finance/advertising/hr
- Fuzzy prefix matching en detectDomainByKeywords() (prefijos ≥5 chars)
- Threshold de keyword override bajado de 0.75 → 0.5
- Threshold de LLM override bajado de 0.9 → 0.85
- Score mínimo bajado de 2 → 1

### Fix 2: 36 Slug Collisions skills↔mcp_servers ✅
- 36 skills renombrados a formato {owner}-{repo} con suffix dedup
- Redirects insertados en slug_redirects
- 0 colisiones restantes verificado

### Fix 3: Install Count Clusters ✅
- Reset install_count=0, install_count_source='imported' para todos los clusters >100 con duplicados

### Fix 4: solve_goal Relevance ✅
- GENERIC_TOOL_SLUGS blacklist: 10 meta-tools filtrados antes del scoring
- Goal-word relevance penalty: 70% penalización si ninguna palabra del goal aparece en la descripción

### Fix 5: Hero Subtitle ✅
- EN: "The only directory that unifies AI skills, MCP connectors, and plugins. Security-scanned and ready to use."
- ES: "El único directorio que unifica skills de IA, conectores MCP y plugins. Escaneados por seguridad y listos para usar."

### Fix 6: StatsBar ✅ (ya estaba implementado)
