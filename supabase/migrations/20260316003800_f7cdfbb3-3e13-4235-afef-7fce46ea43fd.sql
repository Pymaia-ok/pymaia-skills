
-- ================================================
-- Fix 4: Cleanup inflated install counts
-- ================================================
UPDATE public.skills
SET install_count = 0,
    install_count_source = 'imported',
    install_count_verified = false
WHERE install_count > 0
  AND install_count_source != 'tracked'
  AND status = 'approved';

-- ================================================
-- Fix 9: Update recompute_quality_ranks() with adaptive weights
-- ================================================
CREATE OR REPLACE FUNCTION public.recompute_quality_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.skills s
  SET quality_rank = (
    CASE 
      WHEN gm.stars IS NOT NULL THEN
        0.25 * LEAST(COALESCE(gm.stars, 0), 10000) / 10000.0
        + 0.20 * COALESCE(s.avg_rating, 0) / 5.0
        + 0.15 * COALESCE(s.trust_score, 0) / 100.0
        + 0.15 * CASE
            WHEN length(COALESCE(s.skill_md, '')) > 200 THEN 1.0
            WHEN length(COALESCE(s.skill_md, '')) > 50 THEN 0.5
            ELSE 0.0
          END
        + 0.10 * CASE
            WHEN COALESCE(gm.last_commit_at, s.last_commit_at) > now() - interval '90 days' THEN 1.0
            WHEN COALESCE(gm.last_commit_at, s.last_commit_at) > now() - interval '365 days' THEN 0.5
            ELSE 0.0
          END
        + 0.10 * CASE
            WHEN s.install_count_source = 'tracked' THEN LEAST(s.install_count, 1000) / 1000.0
            ELSE 0.0
          END
        + 0.05 * LEAST(COALESCE(s.review_count, 0), 50) / 50.0
      ELSE
        0.30 * COALESCE(s.avg_rating, 0) / 5.0
        + 0.25 * COALESCE(s.trust_score, 0) / 100.0
        + 0.20 * CASE
            WHEN length(COALESCE(s.skill_md, '')) > 200 THEN 1.0
            WHEN length(COALESCE(s.skill_md, '')) > 50 THEN 0.5
            ELSE 0.0
          END
        + 0.15 * CASE
            WHEN s.install_count_source = 'tracked' THEN LEAST(s.install_count, 1000) / 1000.0
            ELSE 0.0
          END
        + 0.10 * LEAST(COALESCE(s.review_count, 0), 50) / 50.0
    END
  )
  FROM (
    SELECT s2.id AS skill_id, gm2.stars, gm2.last_commit_at
    FROM public.skills s2
    LEFT JOIN public.github_metadata gm2
      ON gm2.repo_full_name = (
        CASE WHEN s2.github_url IS NOT NULL
          THEN regexp_replace(regexp_replace(s2.github_url, '\.git$', ''), '^https?://github\.com/', '')
          ELSE NULL
        END
      )
      AND gm2.fetch_status = 'success'
    WHERE s2.status = 'approved'
  ) AS gm
  WHERE s.id = gm.skill_id;
END;
$function$;
