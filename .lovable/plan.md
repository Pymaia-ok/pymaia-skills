

## Plan: Refocus Blog Content for Non-Technical Productivity Users

### Problem
The current `TOPIC_POOL` in `generate-blog-post/index.ts` is heavily skewed toward security and technical MCP topics. Only ~8 of 30 topics target non-technical users. The system prompt also frames the writer as a "technical writer" speaking to "smart colleagues," which produces content too developer-oriented.

### Changes

#### 1. Rewrite `TOPIC_POOL` (~50 topics, new distribution)
**File**: `supabase/functions/generate-blog-post/index.ts`

New category distribution:
- **productivity** (~20 topics): GTM automation, competitive research with AI, content creation workflows, email automation, meeting summaries, CRM management, social media scheduling, financial reporting, HR onboarding, project management
- **agents** (new category, ~12 topics): Claude new features, Manus capabilities, Cursor for non-devs, Antigravity workflows, Gemini updates, OpenAI agent mode, ClawBot, multi-agent collaboration, comparing agents
- **industry** (~10 topics): Legal + AI, Sales pipelines, Marketing campaigns, E-commerce, Education, Freelancers, Consulting, Real estate
- **security** (~5 topics): Keep a few but reframe for non-technical readers (e.g., "How to know if an AI tool is safe to use")
- **mcp** (~5 topics): Reframe as "connectors" for end users (e.g., "Connect your Gmail, Slack, and Notion to your AI assistant")

Example new topics:
```
"How to automate your Go-To-Market strategy with AI agents"
"5 ways to do competitive research in minutes using AI"
"Create a week of social media content in 10 minutes with AI"
"Claude vs Gemini vs Manus: which AI assistant fits your workflow?"
"How to connect Slack, Gmail, and Notion to your AI assistant"
"AI-powered sales prospecting: from lead to close automatically"
"Non-technical guide: what are AI skills and how to use them"
```

#### 2. Rewrite system prompt for non-technical audience
**File**: `supabase/functions/generate-blog-post/index.ts` (L104-114)

Change from "expert technical writer" to a productivity-focused content writer:
- Tone: conversational, practical, like a smart friend showing you shortcuts
- No jargon unless explained
- Every article must include step-by-step "how to do this" sections
- Reference specific skills/connectors/plugins from the Pymaia catalog with links
- Include real use cases and before/after comparisons

#### 3. Smarter related content queries
**File**: `supabase/functions/generate-blog-post/index.ts` (L82-102)

Currently queries skills by category match which is too loose. Change to:
- Query skills using keyword-based text search matching the topic keywords
- Query connectors relevant to the topic (e.g., Gmail connector for email topics, Slack for team topics)
- Query plugins related to the use case

#### 4. Add "agents" category to frontend
**Files**: `src/pages/Blog.tsx`, `src/components/landing/BlogSection.tsx`

Add the new "agents" category with a Bot/Cpu icon to the category filters and card badges.

#### 5. Update blog category in database
Add "agents" to the allowed values if there's a constraint (check needed — likely no enum constraint since it's stored as text).

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/generate-blog-post/index.ts` | Rewrite TOPIC_POOL (~50 productivity-first topics), update system prompt, improve related content queries |
| `src/pages/Blog.tsx` | Add "agents" category filter |
| `src/components/landing/BlogSection.tsx` | Add "agents" category icon/color |
| `src/components/blog/BlogArticle.tsx` | Add "agents" category icon |

