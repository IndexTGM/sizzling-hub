-- ============================================================
-- Cascade: Delete profile when auth.users row is deleted
-- ============================================================

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();