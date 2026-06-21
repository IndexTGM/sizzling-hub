-- ============================================================
-- Fix: Login username→email lookup fails due to RLS
-- (anon user can't query profiles before authenticating)
-- ============================================================

-- Create a SECURITY DEFINER function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.profiles
  WHERE username = lower(p_username)
  LIMIT 1;
  RETURN v_email;
END;
$$;