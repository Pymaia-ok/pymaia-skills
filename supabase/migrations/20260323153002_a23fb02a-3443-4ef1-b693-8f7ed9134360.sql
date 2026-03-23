
-- ═══ Experience Layer v2.0: Tables, Views, RPC, RLS ═══

-- 1. experience_executions: logs every solve_goal call
CREATE TABLE public.experience_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id text NOT NULL UNIQUE,
  goal text NOT NULL,
  domain text,
  recommended_slugs text[] NOT NULL DEFAULT '{}',
  recommended_types text[] NOT NULL DEFAULT '{}',
  caller_hash text,
  model_version text DEFAULT 'v1',
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_experience_executions_created ON public.experience_executions (created_at DESC);
CREATE INDEX idx_experience_executions_exec_id ON public.experience_executions (execution_id);

ALTER TABLE public.experience_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role experience_executions" ON public.experience_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view experience_executions" ON public.experience_executions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon can insert experience_executions" ON public.experience_executions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 2. experience_outcomes: feedback from callers
CREATE TABLE public.experience_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id text NOT NULL REFERENCES public.experience_executions(execution_id) ON DELETE CASCADE,
  tool_slug text NOT NULL,
  tool_type text NOT NULL DEFAULT 'skill',
  outcome text NOT NULL CHECK (outcome IN ('success', 'partial', 'failure', 'skipped')),
  feedback_text text,
  caller_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_experience_outcomes_tool ON public.experience_outcomes (tool_slug, tool_type);
CREATE INDEX idx_experience_outcomes_created ON public.experience_outcomes (created_at DESC);

ALTER TABLE public.experience_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role experience_outcomes" ON public.experience_outcomes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view experience_outcomes" ON public.experience_outcomes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon can insert experience_outcomes" ON public.experience_outcomes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. scoring_config: dynamic scoring weights
CREATE TABLE public.scoring_config (
  key text PRIMARY KEY,
  value numeric NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role scoring_config" ON public.scoring_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage scoring_config" ON public.scoring_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. rate_limit_log: atomic rate limiting
CREATE TABLE public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  UNIQUE (identifier, action, window_start)
);

CREATE INDEX idx_rate_limit_window ON public.rate_limit_log (window_start);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role rate_limit_log" ON public.rate_limit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Materialized view: aggregated tool scores from outcomes
CREATE MATERIALIZED VIEW public.experience_tool_scores AS
SELECT
  eo.tool_slug,
  eo.tool_type,
  COUNT(*) AS total_outcomes,
  COUNT(*) FILTER (WHERE eo.outcome = 'success') AS success_count,
  COUNT(*) FILTER (WHERE eo.outcome = 'failure') AS failure_count,
  ROUND(
    COUNT(*) FILTER (WHERE eo.outcome = 'success')::numeric / NULLIF(COUNT(*), 0) * 100, 1
  ) AS success_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE eo.outcome = 'success') * 1.0
     + COUNT(*) FILTER (WHERE eo.outcome = 'partial') * 0.5)
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS weighted_score,
  MAX(eo.created_at) AS last_outcome_at
FROM public.experience_outcomes eo
WHERE eo.created_at > now() - interval '90 days'
GROUP BY eo.tool_slug, eo.tool_type;

CREATE UNIQUE INDEX idx_experience_tool_scores_slug ON public.experience_tool_scores (tool_slug, tool_type);

-- 6. RPC: upsert_rate_limit (atomic increment, returns current count)
CREATE OR REPLACE FUNCTION public.upsert_rate_limit(
  _identifier text,
  _action text,
  _max_requests integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current integer;
  _window timestamptz := date_trunc('hour', now());
BEGIN
  INSERT INTO public.rate_limit_log (identifier, action, request_count, window_start)
  VALUES (_identifier, _action, 1, _window)
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET request_count = rate_limit_log.request_count + 1
  RETURNING request_count INTO _current;

  RETURN _current;
END;
$$;

-- 7. RPC: refresh_experience_scores (called by cron)
CREATE OR REPLACE FUNCTION public.refresh_experience_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.experience_tool_scores;
  -- Cleanup old rate limit entries
  DELETE FROM public.rate_limit_log WHERE window_start < now() - interval '24 hours';
END;
$$;

-- 8. Seed scoring_config with all current weights
INSERT INTO public.scoring_config (key, value, description) VALUES
  ('keyword_match_weight', 1, 'Base score per keyword match'),
  ('keyword_strong_match_weight', 3, 'Score for strong keyword match'),
  ('domain_mismatch_penalty', 0.8, 'Multiplier when domain does not match (80%)'),
  ('stars_bonus_high', 5, 'Bonus for repos with >1000 stars'),
  ('stars_bonus_medium', 3, 'Bonus for repos with >100 stars'),
  ('stars_bonus_low', 1, 'Bonus for repos with >10 stars'),
  ('trust_score_bonus', 2, 'Bonus when trust_score >= 70'),
  ('install_bonus_high', 3, 'Bonus for >100 installs'),
  ('install_bonus_low', 1, 'Bonus for >10 installs'),
  ('rating_bonus', 2, 'Bonus when avg_rating >= 4.0'),
  ('corrupted_tagline_penalty', -15, 'Penalty for corrupted/garbage taglines'),
  ('tagline_name_mismatch_penalty', -5, 'Penalty when tagline duplicates name'),
  ('zero_signal_penalty', -8, 'Penalty for zero stars + zero installs + no trust'),
  ('connector_overlap_penalty', 0.9, 'Multiplier for connectors with zero goal-word overlap'),
  ('outcome_weight', 0.4, 'Weight of outcome success rate in dynamic scoring'),
  ('recency_weight', 0.3, 'Weight of recency in dynamic scoring'),
  ('volume_weight', 0.3, 'Weight of volume in dynamic scoring');
