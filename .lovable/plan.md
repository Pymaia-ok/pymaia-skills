

## Analysis: Translation Coverage

The UI chrome (navbar, buttons, labels, page titles) is fully translated via i18n dictionaries. However, **the actual skill content is NOT translated** — and it shouldn't be, because:

1. **Skill content comes from the database** (`display_name`, `tagline`, `description_human`) — these are scraped/synced from GitHub repos and are overwhelmingly in English.
2. Translating ~14,000 skill descriptions would require either:
   - Storing dual-language columns (`tagline_es`, `tagline_en`) and running LLM translation on all 14k records
   - Or runtime translation via an API, which would be slow and expensive

3. **Category labels** ARE translated via `t('categories.${key}')` in the i18n dictionaries — this works correctly.

### What IS translated (UI chrome)
- Navbar links, auth page, explore page labels, filters, pagination
- Category chips (IA, Development, Design, etc.)
- Skill card labels ("installs", "min", "See how to install →")
- All static pages: MCP, Teams, Getting Started, Publish, 404

### What is NOT translated (dynamic content)
- `display_name`, `tagline`, `description_human` — these come from GitHub/DB in their original language (mostly English)
- This is **expected and correct** for a directory of open-source tools — the names and descriptions should match their source repos

### Recommendation

No code changes needed. The i18n setup is complete for all UI elements. Skill content stays in its original language (matching the source repos), which is the standard approach for tool/package directories (like npm, PyPI, VS Code Marketplace).

If you want skill descriptions translated to Spanish, that would be a separate large effort requiring LLM-based batch translation of all 14k records and dual-language column storage. Let me know if you want to pursue that.

