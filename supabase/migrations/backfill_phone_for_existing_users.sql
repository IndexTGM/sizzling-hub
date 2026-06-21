-- ============================================================
-- Backfill: Create missing profile rows for users who confirmed
-- email but the old trigger failed (missing phone column).
-- ============================================================

INSERT INTO public.profiles (id, email, username, first_name, last_name, phone, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  'customer'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email_confirmed_at IS NOT NULL
  AND p.id IS NULL;