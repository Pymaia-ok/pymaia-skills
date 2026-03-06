

## Plan: Trust & Security Signals for Skills and Connectors

### What we have today
- **Skills**: `github_stars` (shown as Hearts/Favorites), `review_count`, `avg_rating`, `install_count`, `github_url`, `readme_raw`
- **Connectors**: `github_stars`, `external_use_count`, `is_official`, `github_url`
- No security verification system exists for either

### What to build

#### 1. Security Verification System

**New columns** on both `skills` and `mcp_servers`:

| Column | Type | Purpose |
|--------|------|---------|
| `security_status` | text | `'unverified'` / `'verified'` / `'flagged'` |
| `security_checked_at` | timestamptz | When last checked |
| `security_notes` | text | Internal notes from review |

**Automated checks via new Edge Function `verify-security`**:
- Has a valid GitHub repo (not a dead link)
- README exists and is non-trivial (>100 chars)
- Repo has a license file
- Repo is not archived/disabled
- For skills created via our app: auto-mark as `verified` since we control the generation

**Admin UI**: Add a column in the Admin page to manually override security status.

**User-facing badges**: Show a shield icon with "Verified" badge on SkillCard and connector cards when `security_status = 'verified'`. Show nothing for unverified (no negative signal), and a warning for `flagged`.

#### 2. Enhanced Popularity/Trust Metrics

**Already working**:
- GitHub stars synced via `sync-connector-stars` for connectors
- Skills have `github_stars` but need a similar sync function

**New: Skill GitHub stars sync** — Create `sync-skill-stars` edge function (mirrors the existing `sync-connector-stars` pattern) to periodically update `github_stars` for skills with a `github_url`.

**New columns on both tables**:

| Column | Type | Purpose |
|--------|------|---------|
| `last_commit_at` | timestamptz | Shows if project is actively maintained |

The `verify-security` and star-sync functions will also fetch `pushed_at` from GitHub API to populate `last_commit_at`.

**UI enhancements**:
- **SkillCard**: Add a small shield icon for verified skills. Show "Active" badge if `last_commit_at` is within last 6 months.
- **SkillDetail**: Show a trust section with verified badge, last updated date, GitHub stars, and license info.
- **Connector cards**: Add verified shield badge. Show "Active" tag for recently maintained repos.
- **ConectorDetail**: Add trust metrics section similar to skills.
- **Explore/Conectores pages**: Add a "Verified" filter option alongside existing filters.

### Implementation steps

1. **DB migration**: Add `security_status`, `security_checked_at`, `security_notes`, `last_commit_at` to both `skills` and `mcp_servers` tables
2. **Edge Function `verify-security`**: Batch-check GitHub repos for both skills and connectors (license, readme, activity, archive status)
3. **Edge Function `sync-skill-stars`**: Mirror `sync-connector-stars` for the skills table
4. **Update star sync functions** to also fetch `pushed_at` → `last_commit_at`
5. **Auto-verify app-created skills**: In the skill creation flow, set `security_status = 'verified'` for skills created through our platform
6. **UI badges**: Add verified shield + "Active" indicator to SkillCard, connector cards, and detail pages
7. **Filter options**: Add "Verified" filter to Explore and Conectores pages
8. **Admin panel**: Add security status column with manual override
9. **i18n**: Add translation keys for all new labels

### Technical notes
- The `verify-security` function uses the existing `GITHUB_TOKEN` secret
- Reuses the same batch processing pattern as `sync-connector-stars` (30 items per run, respects rate limits)
- `security_status` defaults to `'unverified'` so existing records start neutral
- Skills without `github_url` stay `unverified` unless manually verified by admin
- The `config.toml` needs entries for the two new edge functions with `verify_jwt = false`

