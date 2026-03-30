
-- Expand catalog_health_check with orphaned reference detection
CREATE OR REPLACE FUNCTION public.catalog_health_check()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'missing_install_command', (
      SELECT count(*) FROM skills WHERE status = 'approved' AND (install_command IS NULL OR install_command = '' OR install_command = 'npx skills add ' || slug)
    ),
    'missing_readme', (
      SELECT count(*) FROM skills WHERE status = 'approved' AND (readme_raw IS NULL OR readme_raw = '')
    ),
    'low_trust_score', (
      SELECT count(*) FROM skills WHERE status = 'approved' AND (trust_score IS NULL OR trust_score < 20)
    ),
    'pending_over_7_days', (
      SELECT count(*) FROM skills WHERE status = 'pending' AND created_at < now() - interval '7 days'
    ),
    'duplicate_github_urls', (
      SELECT count(*) FROM (
        SELECT github_url, count(*) as cnt
        FROM skills
        WHERE github_url IS NOT NULL AND github_url != '' AND status = 'approved'
        GROUP BY github_url
        HAVING count(*) > 1
      ) dupes
    ),
    'total_approved', (SELECT count(*) FROM skills WHERE status = 'approved'),
    'total_pending', (SELECT count(*) FROM skills WHERE status = 'pending'),
    'total_rejected', (SELECT count(*) FROM skills WHERE status = 'rejected'),
    'trust_score_distribution', (
      SELECT jsonb_build_object(
        'excellent', (SELECT count(*) FROM skills WHERE status = 'approved' AND trust_score >= 80),
        'good', (SELECT count(*) FROM skills WHERE status = 'approved' AND trust_score >= 60 AND trust_score < 80),
        'caution', (SELECT count(*) FROM skills WHERE status = 'approved' AND trust_score >= 40 AND trust_score < 60),
        'low', (SELECT count(*) FROM skills WHERE status = 'approved' AND trust_score >= 1 AND trust_score < 40),
        'unscored', (SELECT count(*) FROM skills WHERE status = 'approved' AND (trust_score IS NULL OR trust_score = 0))
      )
    ),
    'category_distribution', (
      SELECT jsonb_object_agg(category, cnt)
      FROM (SELECT category, count(*) as cnt FROM skills WHERE status = 'approved' GROUP BY category ORDER BY cnt DESC LIMIT 20) cats
    ),
    'orphaned_bundle_refs', (
      SELECT count(*) FROM (
        SELECT unnest(skill_slugs) AS ref_slug FROM skill_bundles WHERE is_active = true
      ) refs
      WHERE ref_slug NOT IN (SELECT slug FROM skills WHERE status = 'approved')
    ),
    'orphaned_course_skill_refs', (
      SELECT count(*) FROM (
        SELECT unnest(recommended_skill_slugs) AS ref_slug FROM course_modules
      ) refs
      WHERE ref_slug NOT IN (SELECT slug FROM skills WHERE status = 'approved')
    ),
    'orphaned_course_connector_refs', (
      SELECT count(*) FROM (
        SELECT unnest(recommended_connector_slugs) AS ref_slug FROM course_modules
      ) refs
      WHERE ref_slug NOT IN (SELECT slug FROM mcp_servers WHERE status = 'approved')
    ),
    'stale_skills', (
      SELECT count(*) FROM skills WHERE status = 'approved' AND is_stale = true
    ),
    'missing_category_in_db', (
      SELECT count(DISTINCT s.category) FROM skills s
      WHERE s.status = 'approved'
        AND s.category NOT IN (SELECT slug FROM categories)
    )
  ) INTO result;
  RETURN result;
END;
$function$;
