

## Problem
1. The skill created before the draft auto-save was implemented is lost (no record in the database).
2. `/mis-skills` only shows published skills — there's no section to view or resume drafts from `skill_drafts`.

## Plan: Add Drafts Section to Mis Skills

### 1. Update `src/pages/MisSkills.tsx`
- Fetch drafts from `skill_drafts` table where `status != 'published'` for the current user
- Add a "Borradores" (Drafts) section above the published skills list
- Each draft card shows: skill name (from `generated_skill.name`), quality score, status, date
- Add a "Continuar" button that navigates to `/crear-skill?draft=<draft_id>`
- Add a delete button to remove unwanted drafts

### 2. Update `src/pages/CrearSkill.tsx`
- On mount, check for `?draft=<id>` URL parameter
- If present, load the draft from `skill_drafts` and restore: conversation messages, generated skill, quality data, test results
- Set the appropriate step based on draft status (`interviewing` → chat, `generated`/`tested` → preview)
- Set `draftId` so subsequent saves update the same record

### 3. Add i18n keys
- Add translation keys for drafts section labels in `src/i18n/es.ts` and `src/i18n/en.ts`

### Files to modify
1. `src/pages/MisSkills.tsx` — add drafts fetch + UI section
2. `src/pages/CrearSkill.tsx` — load draft from URL param on mount
3. `src/i18n/es.ts` and `src/i18n/en.ts` — add translation keys

