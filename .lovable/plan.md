

## Audit: 9,104 Pending Skills — What to Approve, Reject, and Clean

### Findings

**Total pending: 9,104 skills**

| Category | Count | Action |
|----------|-------|--------|
| Pipe `\|` taglines (parsing residue) | 3,482 | **Reject** — unusable metadata |
| Monorepo duplicates (inflated stars) | ~200+ | **Reject** — fake star counts from `awesome-llm-apps` (100k), `everything-claude-code` (63k), `antigravity-awesome-skills` (22k) |
| Anthropic official skills (pending) | ~15 | **Approve** — legitimate tools from `anthropics/` and `anthropics/knowledge-work-plugins` |
| Good unique skills | ~5,500 | Need enrichment pipeline (future) |

### Priority 1: Approve Anthropic Official Skills

These are real, high-quality skills stuck in pending because they have 0 GitHub stars (Anthropic hosts them as subdirectories):

- `call-prep` — Sales call prep with Common Room (8.8k stars)
- `content-creation` — Marketing content drafting
- `campaign-planning` — Campaign strategy and KPIs
- `check-model` — Financial model debugging
- `analyzing-financial-statements` — Financial ratio analysis
- `performance-analytics` — Marketing metrics analysis
- `canned-responses` — Legal templated responses
- `legal-risk-assessment` — Legal risk scoring
- `weekly-prep-brief` — Weekly call briefing
- `skill-development` — Skill creation guidance
- `configured-agent` — Plugin configuration patterns

### Priority 2: Mass-Reject Bad Data

SQL migration to reject 3,482 skills with pipe `|` taglines and ~200 monorepo duplicates with inflated stars:

- Skills from `awesome-llm-apps` with generic "Collection of awesome" taglines
- Skills from `everything-claude-code` sharing identical taglines
- Skills from `antigravity-awesome-skills` with "Ultimate Collection" taglines

### Priority 3: Approve Select High-Quality Unique Skills

- `cpp-testing` (61k stars, unique tagline about GoogleTest)
- `zlibrary-to-notebooklm` (1.4k stars, unique tool)
- `anthropic-usage-skill` (Anthropic API usage checker)
- `gh-aw` / Prowler cloud security (13k stars, real tool)

### Implementation

1. **DB migration** — Single SQL with 3 UPDATE statements:
   - Approve ~15 Anthropic official skills
   - Approve ~4 high-quality unique skills  
   - Reject ~3,500 pipe-tagline skills
   - Reject ~200 monorepo-inflated skills
2. **Log all actions** to `automation_logs` for audit trail

### Impact
- Approves ~20 high-quality skills covering sales, marketing, legal, finance
- Removes ~3,700 junk records from pending queue
- Reduces pending from 9,104 to ~5,400 (all needing AI enrichment)

