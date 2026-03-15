

## Fix broken blog cover images and add visual variety

### Problems identified

1. **Broken image**: The post "launch-marketing-campaigns-5x-faster-with-ai-a-step-by-step-playbook" has a `cover_image_url` set in the DB but the actual file returns 404 from storage (image generation failed silently, URL was saved anyway).

2. **No broken-image fallback**: The `<img>` tag in `Blog.tsx` and `BlogArticle.tsx` has no `onError` handler, so broken images show the alt text or broken icon instead of a placeholder.

3. **All covers look the same**: The `stylePool` in `regen-blog-covers` has 8 entries but they're all variations of "professional workspace / office photography". Every cover ends up looking like the same stock photo of people at laptops.

### Plan

**1. Add `onError` fallback to blog images (Blog.tsx + BlogArticle.tsx)**
- Add `onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}` to all blog cover `<img>` tags
- This immediately fixes the broken image display

**2. Diversify cover image generation (regen-blog-covers/index.ts)**
- Replace the generic `stylePool` with category-specific style arrays that are visually distinct:
  - **productivity**: flat-lay desks, colorful sticky notes, hands writing, coffee + notebook
  - **agents**: close-up of phone screens, person talking to device, futuristic-but-warm interfaces
  - **industry**: real professionals in context (courtroom, hospital, warehouse, store), diverse settings
  - **security**: padlocks, server rooms, calm blue tones, hands typing on keyboard
  - **mcp**: cables, USB connections, dashboard close-ups, hardware details
- Add a **composition variety** dimension (close-up, wide shot, over-the-shoulder, bird's-eye) randomly combined with the category style
- Include the post title keywords in the prompt to make each image topic-specific, not generic

**3. Fix the upload-before-URL-save logic (regen-blog-covers/index.ts)**
- Check the upload response for errors before saving the URL to the DB
- Only update `cover_image_url` if the upload actually succeeded

**4. Trigger regen for posts with missing/broken covers**
- Add a startup check: before processing the oldest post, first query for posts whose `cover_image_url` returns a storage path that doesn't exist (or null the URL for the broken post via migration so the regen cron picks it up)
- Null out the `cover_image_url` for the broken post so the cron regenerates it

### Technical details

- The `regen-blog-covers` function uses `google/gemini-3.1-flash-image-preview` for image gen — this stays the same
- The fix adds ~15 category-specific style strings (3 per category) + 4 composition modifiers = much higher visual diversity
- The `onError` fallback is a standard React pattern, no dependencies needed

