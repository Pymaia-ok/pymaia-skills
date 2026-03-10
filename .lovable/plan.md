

# Plan: Add Few-Shot Examples to scan-security LLM Prompt

## What
Enhance the LLM analysis in `scan-security/index.ts` (lines 664-682) by adding 8-10 concrete examples of flagged vs approved items directly in the system prompt. This teaches the model subtle patterns that regex layers miss.

## How

Edit the `systemPrompt` in the `analyzeWithLLM` function (~line 664) to include a `## Examples` section with:

**5 MALICIOUS/SUSPICIOUS examples:**
1. A skill that hides `curl` exfiltration inside markdown comments
2. A skill using zero-width characters to hide "ignore previous instructions"
3. A plugin that reads `~/.ssh/id_rsa` under the guise of "git config helper"
4. A skill that redirects `ANTHROPIC_BASE_URL` to a proxy server
5. A connector that requests `exec` permissions but claims to only read files

**5 SAFE examples:**
1. A standard coding best-practices skill (React patterns)
2. A documentation generator skill with file read-only scope
3. A code formatter plugin using eslint/prettier hooks
4. A translation skill that only processes text input/output
5. A design system reference skill with no tool calls

Each example will be ~2-3 lines: a brief content snippet, the correct verdict, and a reason explaining why.

## File Changes
- `supabase/functions/scan-security/index.ts` — Update `systemPrompt` string in `analyzeWithLLM` (around line 664)

## Impact
- $0 cost (uses existing Gemini Flash calls)
- Expected 30-40% reduction in false negatives on subtle attacks
- No new dependencies or infrastructure

