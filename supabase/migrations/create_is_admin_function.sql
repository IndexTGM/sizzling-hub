-- ============================================================
-- Profiles RLS Policies
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all cart items" ON public.cart_items;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin'
  );
$$;

-- Reuse existing helpers if available
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION profiles_role(p_role text)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role::text = p_role
    );
  $$;
EXCEPTION WHEN duplicate_function THEN NULL;
END $$;

DO $$ BEGIN
  CREATE OR REPLACE FUNCTION profiles_branch_id()
  RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT branch_id FROM public.profiles WHERE id = auth.uid();
  $$;
EXCEPTION WHEN duplicate_function THEN NULL;
END $$;

-- 1. Users can read their own profile
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Devs: full access
CREATE POLICY "Devs select profiles" ON public.profiles FOR SELECT
  USING (profiles_role('dev'));
CREATE POLICY "Devs insert profiles" ON public.profiles FOR INSERT
  WITH CHECK (profiles_role('dev'));
CREATE POLICY "Devs update profiles" ON public.profiles FOR UPDATE
  USING (profiles_role('dev'));
CREATE POLICY "Devs delete profiles" ON public.profiles FOR DELETE
  USING (profiles_role('dev'));

-- 4. Admins: read/update profiles in own branch, cannot delete
CREATE POLICY "Admins select profiles" ON public.profiles FOR SELECT
  USING (profiles_role('admin') AND (profiles_branch_id() = profiles.branch_id OR profiles.branch_id IS NULL));
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE
  USING (profiles_role('admin') AND profiles_branch_id() = profiles.branch_id);
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE
  USING (profiles_role('admin') AND profiles_branch_id() = profiles.branch_id);

-- Fix cart_items: Admins full access (for admin panel)
DROP POLICY IF EXISTS "Admins manage all cart items" ON public.cart_items;
CREATE POLICY "Admins manage all cart items" ON public.cart_items FOR ALL
  USING (profiles_role('admin') OR profiles_role('dev'));