

## Review Summary

I checked the current state of the three issues from the previous round:

### 1. Hero Title — Fixed
The `\n` was removed from the translation strings. The title now renders naturally across lines. No further changes needed.

### 2. Agent Logos Scroll — Still Broken
**Root cause**: The outer `div` has `overflow-hidden` which clips the scrollable content. The inner `div` has `overflow-x-auto` but since the parent clips overflow, the scroll gesture is suppressed on mobile.

**Fix**: Remove `overflow-hidden` from the outer wrapper and instead apply `overflow-x-auto scrollbar-hide` directly. Simplify to a single container:
```
<div className="w-full overflow-x-auto scrollbar-hide">
  <div className="flex items-center gap-8 px-4 md:px-0 md:justify-center w-max md:w-auto">
    ...logos with shrink-0...
  </div>
</div>
```
Using `w-max` on the inner div forces it wider than the viewport on mobile, enabling horizontal scroll. On `md:` screens, `md:w-auto` + `md:justify-center` centers them normally.

### 3. Email Templates — Two Issues
**a) Logo not displaying**: The URL `https://pymaiaskills.lovable.app/images/pymaia-skills-icon.png` should work if the file exists at `public/images/pymaia-skills-icon.png`. File is listed in the project, so the URL should resolve. However, many email clients block images by default. To improve reliability:
- Add `width` and `height` attributes to the `<img>` tag for proper layout even when images are blocked
- Add `alt` text that serves as fallback

**b) `post_install_day7` — skill cards are present** in the template code (3 hardcoded cards). If the user's screenshot shows only a button, it may be that the email was sent *before* the cards were added in the last edit. The current template code looks correct.

**Proposed fix**: Redeploy the edge function (it auto-deploys on save) and add inline sizing to all logo `<img>` tags across all templates for better email client compatibility.

### Changes

| File | Change |
|---|---|
| `src/components/AgentLogos.tsx` | Fix scroll container structure — single scrollable wrapper with `w-max` inner |
| `supabase/functions/enroll-sequence/index.ts` | Add `width="40" height="40"` and `display:block` to all logo `<img>` tags for email client compatibility |

