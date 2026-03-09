
-- Plugin reviews table
CREATE TABLE public.plugin_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plugin_id, user_id)
);

-- Enable RLS
ALTER TABLE public.plugin_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Plugin reviews are viewable by everyone"
  ON public.plugin_reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create plugin reviews"
  ON public.plugin_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plugin reviews"
  ON public.plugin_reviews FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plugin reviews"
  ON public.plugin_reviews FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Add avg_rating and review_count columns to plugins table
ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS avg_rating NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.plugins ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

-- Trigger to update plugin ratings
CREATE OR REPLACE FUNCTION public.update_plugin_rating()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.plugins SET
    avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM public.plugin_reviews WHERE plugin_id = COALESCE(NEW.plugin_id, OLD.plugin_id)), 0),
    review_count = (SELECT COUNT(*) FROM public.plugin_reviews WHERE plugin_id = COALESCE(NEW.plugin_id, OLD.plugin_id))
  WHERE id = COALESCE(NEW.plugin_id, OLD.plugin_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_plugin_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.plugin_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_plugin_rating();

-- Updated_at trigger
CREATE TRIGGER update_plugin_reviews_updated_at
  BEFORE UPDATE ON public.plugin_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
