
-- Fix old install_command format in skills table (pending skills from skills.sh imports)
UPDATE public.skills 
SET install_command = 'claude skill add --from-url https://raw.githubusercontent.com/' || 
  regexp_replace(regexp_replace(github_url, '^https?://github.com/', ''), '\.git$', '') || 
  '/main/skills/' || 
  split_part(slug, '-', array_length(string_to_array(slug, '-'), 1)) || 
  '/SKILL.md'
WHERE status = 'pending' 
  AND install_command LIKE 'npx skills add%'
  AND github_url IS NOT NULL;

-- Fix old install_command format in staging table
UPDATE public.skills_import_staging
SET install_command = 'claude skill add --from-url https://raw.githubusercontent.com/' || 
  repo_owner || '/' || repo_name || '/main/skills/' || skill_folder || '/SKILL.md'
WHERE install_command LIKE 'npx skills add%';
