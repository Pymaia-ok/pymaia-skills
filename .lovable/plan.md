

## Add ZIP Download to Skill Detail Page

### What changes

**`src/pages/SkillDetail.tsx`**:
1. Add a "Download ZIP" button next to the existing "Install" button (line ~171-176)
2. Import `JSZip` and add a `downloadZip` handler that creates a ZIP with `{skill-name}/SKILL.md` containing `skill.install_command`
3. The button uses the `Download` icon with text like "ZIP para Claude.ai"
4. Style it as a secondary/outline button to differentiate from the primary install CTA

**`src/i18n/es.ts` + `src/i18n/en.ts`**:
- Add strings: `detail.downloadZip` ("ZIP para Claude.ai" / "ZIP for Claude.ai"), `detail.zipDownloaded` toast message

### Implementation detail

- Reuse the same JSZip pattern already in `SkillPreview.tsx`: kebab-case folder name from `skill.display_name`, containing `SKILL.md` with `skill.install_command` content
- The ZIP download also triggers `trackInstallation` and email gate for non-authenticated users (same flow as copy)
- No new dependencies needed (JSZip already installed)

