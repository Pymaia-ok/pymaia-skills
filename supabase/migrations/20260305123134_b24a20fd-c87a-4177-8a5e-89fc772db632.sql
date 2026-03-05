CREATE TABLE public.skill_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation jsonb NOT NULL DEFAULT '[]',
  generated_skill jsonb DEFAULT NULL,
  quality_score numeric DEFAULT NULL,
  quality_feedback text DEFAULT NULL,
  status text NOT NULL DEFAULT 'interviewing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts" ON public.skill_drafts
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_skill_drafts_updated_at
  BEFORE UPDATE ON public.skill_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();