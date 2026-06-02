-- ============================================================
-- Fix: Only create profiles table rows after email is confirmed
-- ============================================================

-- 1. Replace the existing handle_new_user function to skip unconfirmed users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create profile when email is confirmed
  IF new.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, username, full_name, role)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      'customer'
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a trigger for when the user later confirms their email
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS trigger AS $$
BEGIN
  IF new.email_confirmed_at IS NOT NULL AND old.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (id, email, username, full_name, role)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      'customer'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the new trigger
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmed();