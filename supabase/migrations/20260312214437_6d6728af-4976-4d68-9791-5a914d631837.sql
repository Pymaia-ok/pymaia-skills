
CREATE TABLE public.skill_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_draft_id uuid REFERENCES public.skill_drafts(id) ON DELETE CASCADE,
  skill_slug text,
  run_at timestamptz NOT NULL DEFAULT now(),
  pass_rate numeric NOT NULL DEFAULT 0,
  avg_score numeric NOT NULL DEFAULT 0,
  token_usage integer DEFAULT 0,
  model_version text DEFAULT 'gemini-2.5-flash',
  test_cases_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  iteration integer NOT NULL DEFAULT 1,
  skill_md_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_eval_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own eval runs" ON public.skill_eval_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.skill_drafts sd
      WHERE sd.id = skill_eval_runs.skill_draft_id
      AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role eval runs" ON public.skill_eval_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
