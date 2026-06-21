-- ============================================================
-- Fix: Re-create profile triggers to include phone column
-- ============================================================

-- 1. Drop the old INSERT trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Replace handle_new_user (fires on INSERT)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF new.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, username, first_name, last_name, phone, role)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      'customer'
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach the INSERT trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Drop the old UPDATE trigger
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- 5. Replace handle_user_confirmed (fires on UPDATE / email confirmation)
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS trigger AS $$
BEGIN
  IF new.email_confirmed_at IS NOT NULL AND old.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (id, email, username, first_name, last_name, phone, role)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      'customer'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-attach the UPDATE trigger
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmed();
