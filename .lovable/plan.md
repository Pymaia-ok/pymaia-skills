

## Plan: SEO, LLM Discovery & Geo Best Practices for Blog

### Current State
The blog has basic SEO (meta tags, JSON-LD Article, canonical, keywords in content) but lacks several high-impact optimizations for search ranking, rich snippets, and AI agent discovery.

### Changes

#### 1. Add FAQ Schema extraction (high SEO impact)
**File**: `supabase/functions/generate-blog-post/index.ts`
- Add `faq_items` to the tool schema: array of `{question, answer}` pairs
- Store in a new `faq_json` column on `blog_posts`

**File**: `src/pages/BlogPost.tsx`
- Inject `FAQPage` JSON-LD alongside the existing `Article` schema
- This enables Google FAQ rich snippets (expandable Q&A in search results)

**DB migration**: Add `faq_json jsonb default '[]'` column to `blog_posts`

#### 2. Add `hreflang` tags for bilingual content
**File**: `src/hooks/useSEO.ts`
- Accept optional `hreflang` param: `{es: url, en: url}`
- Inject `<link rel="alternate" hreflang="es" href="...">` and `<link rel="alternate" hreflang="en" href="...">`

**File**: `src/pages/BlogPost.tsx`
- Pass hreflang with both language versions pointing to the same URL (single-URL bilingual)

#### 3. Add `BreadcrumbList` schema
**File**: `src/pages/BlogPost.tsx`
- Add BreadcrumbList JSON-LD: Home > Blog > Category > Article title
- Helps Google show breadcrumb trail in search results

#### 4. Dynamic blog sitemap
**File**: `supabase/functions/generate-blog-post/index.ts`
- After inserting a post, regenerate a `blog-sitemap.xml` and upload to storage
- OR create an edge function `blog-sitemap` that returns XML dynamically

**New file**: `supabase/functions/blog-sitemap/index.ts`
- Returns XML sitemap of all published blog posts with `lastmod`, `changefreq`, `priority`
- Reference this from `robots.txt`

#### 5. LLM discovery for blog posts
**File**: `supabase/functions/generate-blog-post/index.ts`
- After inserting, append entry to `llms.txt` or create a separate `blog-llms.txt`

**File**: `src/pages/BlogPost.tsx`
- Add `<meta name="ai:description">` and `<meta name="ai:content_type" content="article">` tags

#### 6. Geo-aware content hints
**File**: `src/pages/BlogPost.tsx`
- Add `<meta name="geo.region">` tag based on `geo_target` field (e.g., `geo.region=419` for LATAM)

**File**: `src/pages/Blog.tsx`
- Optionally surface geo-targeted posts first based on browser language (already partially done via i18n)

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/generate-blog-post/index.ts` | Add FAQ extraction to AI tool schema, store faq_json |
| `src/hooks/useSEO.ts` | Add hreflang support, geo meta |
| `src/pages/BlogPost.tsx` | FAQPage schema, BreadcrumbList schema, hreflang, ai:description meta |
| `src/pages/Blog.tsx` | Minor: geo-aware sorting hint |
| DB migration | Add `faq_json` column |
| New: `supabase/functions/blog-sitemap/index.ts` | Dynamic XML sitemap for blog posts |

### Impact
- FAQ rich snippets can increase CTR 20-30%
- hreflang prevents duplicate content penalties for bilingual pages
- BreadcrumbList improves SERP appearance
- Dynamic sitemap ensures new posts are indexed within hours
- LLM meta tags make blog discoverable by AI agents (Claude, GPT, Perplexity)

