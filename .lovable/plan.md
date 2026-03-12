

## Analysis: Pymaia vs Skills 2.0

### What is Skills 2.0?

Anthropic's Skills 2.0 (March 2026) adds four modes to their `skill-creator` plugin:
1. **Create** -- generates SKILL.md from a description
2. **Eval** -- writes test cases and runs them via sub-agents in parallel (forked context)
3. **Improve** -- auto-refines the skill based on eval failures
4. **Benchmark** -- tracks pass rate, tokens, and elapsed time across model updates

Key capabilities: A/B testing, description refinement for triggering accuracy, multi-agent parallel testing (no context bleed), and iterative self-improvement loops.

### What Pymaia Already Has

| Capability | Status | Notes |
|---|---|---|
| Conversational skill creation (interview) | Done | `skill-interviewer` edge function |
| SKILL.md generation following Anthropic standard | Done | `generate-skill` with frontmatter, decision tree, workflow, pitfalls |
| Quality scoring (AI judge) | Done | 10-point rubric, strengths/improvements |
| E2E testing (5 test cases, real execution, AI judge) | Done | `test-skill` with 3 phases: generate cases, execute, judge |
| Refinement based on feedback | Done | `refine` action in `generate-skill` |
| Playground (live skill simulation) | Done | `test-skill-playground` |
| Plugin wrapping | Done | `wrap_plugin` action |
| MCP server generation | Done | `generate_mcp` action |
| Export (ZIP, copy SKILL.md) | Done | `SkillPlayground.tsx` |
| Publish to Pymaia catalog | Done | Skills table with approval flow |
| MCP tool `generate_custom_skill` | Done | Agents can generate skills via MCP |

### What's Missing vs Skills 2.0

| Skills 2.0 Feature | Gap in Pymaia |
|---|---|
| **Auto-improve loop** | We test and score, but don't automatically refine based on test failures. The user must manually request refinement. |
| **Benchmark mode** | No tracking of pass rate / token usage across iterations or model updates. |
| **Description refinement for triggering** | No automatic optimization of the `description` field to improve when the skill activates. |
| **Forked context / parallel eval** | Our test runs sequentially in one function call. No isolation between test cases. |
| **Direct Claude Code integration** | Users can't push skills from Pymaia directly into their Claude Code environment. They download ZIP or copy. |
| **Import from Claude Code** | Users can't import skills they created in Claude Code into Pymaia for sharing. |

### Proposed Plan

#### 1. Auto-Improve Loop (high impact)
**File**: `supabase/functions/generate-skill/index.ts`
- Add new action `auto_improve` that:
  1. Runs the existing test pipeline (`test-skill` logic)
  2. Analyzes failures
  3. Auto-refines the skill targeting the specific failures
  4. Re-tests to verify improvement
  5. Returns both versions with before/after scores
- Cap at 3 improvement cycles to stay within edge function time limits

**File**: `src/components/crear-skill/SkillScoreCard.tsx` (or new component)
- Add "Auto-mejorar" button that triggers the loop
- Show before/after comparison with score deltas

#### 2. Import Skills from Claude Code
**File**: New component `src/components/crear-skill/SkillImporter.tsx`
- Accept SKILL.md paste or file upload
- Parse frontmatter (name, description, compatibility)
- Preview the parsed skill
- Publish to Pymaia catalog (insert into `skills` table)

**File**: `supabase/functions/generate-skill/index.ts`
- Add action `import_skill` that parses a raw SKILL.md into structured fields
- Uses AI to extract category, roles, industry from content

#### 3. Claude Code Push Integration
**File**: `src/components/crear-skill/SkillPlayground.tsx`
- Add "Install in Claude Code" button that generates and copies the CLI command:
  `claude skill add --from-url https://pymaiaskills.lovable.app/api/skill/{slug}/raw`
- New edge function `supabase/functions/skill-raw/index.ts` that serves raw SKILL.md content at a URL Claude Code can fetch

#### 4. Benchmark Tracking (nice-to-have)
**DB migration**: New table `skill_eval_runs` with columns: `skill_id`, `run_at`, `pass_rate`, `avg_score`, `token_usage`, `model_version`, `test_cases_json`
- Track eval history per skill
- Show sparkline of score over time in the creator dashboard

#### 5. MCP Tool for Skill Import
**File**: `supabase/functions/mcp-server/index.ts`
- Add tool `import_skill_from_agent` that accepts a SKILL.md string from any agent and publishes it to Pymaia catalog (pending approval)
- This enables agents using Pymaia MCP to share skills they create

### Files to modify/create

| File | Change |
|---|---|
| `supabase/functions/generate-skill/index.ts` | Add `auto_improve` and `import_skill` actions |
| `src/components/crear-skill/SkillImporter.tsx` | New: paste/upload SKILL.md importer |
| `src/components/crear-skill/SkillScoreCard.tsx` | Add auto-improve button + before/after UI |
| `src/components/crear-skill/SkillPlayground.tsx` | Add Claude Code install command + raw URL |
| `supabase/functions/skill-raw/index.ts` | New: serve raw SKILL.md for Claude Code fetch |
| `supabase/functions/mcp-server/index.ts` | Add `import_skill_from_agent` tool |
| `src/pages/CrearSkill.tsx` | Add import tab/option |
| DB migration | `skill_eval_runs` table for benchmark tracking |

### Priority

1. **Auto-improve loop** -- highest differentiation, directly mirrors Skills 2.0's core value
2. **Import from Claude Code** -- enables the sharing flywheel
3. **Claude Code push** -- seamless install from Pymaia
4. **MCP import tool** -- agents can share skills bidirectionally
5. **Benchmark tracking** -- long-term quality monitoring

