
-- Sprint 3: Add quality_rank column and daily recomputation

-- 1. Add quality_rank column to skills
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS quality_rank float DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_skills_quality_rank ON public.skills (quality_rank DESC);

-- 2. Create function to recompute quality_rank for all skills
CREATE OR REPLACE FUNCTION public.recompute_quality_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.skills s
  SET quality_rank = (
    -- GitHub stars (25%): capped at 10K
    0.25 * LEAST(COALESCE(gm.stars, s.github_stars, 0), 10000) / 10000.0
    -- User rating (20%)
    + 0.20 * COALESCE(s.avg_rating, 0) / 5.0
    -- Trust score (15%)
    + 0.15 * COALESCE(s.trust_score, 0) / 100.0
    -- Content quality (15%): has skill_md
    + 0.15 * CASE
        WHEN length(COALESCE(s.skill_md, '')) > 200 THEN 1.0
        WHEN length(COALESCE(s.skill_md, '')) > 50 THEN 0.5
        ELSE 0.0
      END
    -- Recency (10%): last commit
    + 0.10 * CASE
        WHEN COALESCE(gm.last_commit_at, s.last_commit_at) > now() - interval '90 days' THEN 1.0
        WHEN COALESCE(gm.last_commit_at, s.last_commit_at) > now() - interval '365 days' THEN 0.5
        ELSE 0.0
      END
    -- Verified installs (10%)
    + 0.10 * CASE
        WHEN s.install_count_source = 'tracked' THEN LEAST(s.install_count, 1000) / 1000.0
        ELSE 0.0
      END
    -- Community engagement (5%)
    + 0.05 * LEAST(COALESCE(s.review_count, 0), 50) / 50.0
  )
  FROM (
    SELECT s2.id AS skill_id, gm2.*
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
$$;

-- 3. Run initial computation
SELECT public.recompute_quality_ranks();

-- 4. Schedule daily at 5 AM UTC
SELECT cron.schedule(
  'recompute-quality-ranks',
  '0 5 * * *',
  $$SELECT public.recompute_quality_ranks();$$
);
