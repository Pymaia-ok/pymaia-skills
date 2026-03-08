
CREATE OR REPLACE FUNCTION public.increment_install_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.skills
  SET install_count = install_count + 1
  WHERE id = NEW.skill_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_installation_created
  AFTER INSERT ON public.installations
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_install_count();
