-- Storage bucket for skill creation uploads (documents, images, videos)
INSERT INTO storage.buckets (id, name, public) VALUES ('skill-uploads', 'skill-uploads', false);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload skill files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'skill-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can read their own uploads
CREATE POLICY "Users can read own skill files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'skill-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can delete own uploads
CREATE POLICY "Users can delete own skill files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'skill-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add pricing fields to skills table
ALTER TABLE public.skills 
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS price_amount numeric DEFAULT NULL;

-- Add test_results to skill_drafts
ALTER TABLE public.skill_drafts
  ADD COLUMN IF NOT EXISTS test_results jsonb DEFAULT NULL;