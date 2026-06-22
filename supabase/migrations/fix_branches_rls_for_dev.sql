-- ============================================================
-- Fix: Allow everyone to read branches (public data)
-- Only devs can write
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Dev full access branches" ON public.branches;
DROP POLICY IF EXISTS "Devs full access branches" ON public.branches;

-- 1. Anyone authenticated can read branches
CREATE POLICY "Anyone can read branches" ON public.branches
  FOR SELECT USING (true);

-- 2. Devs can write branches
CREATE POLICY "Devs insert branches" ON public.branches FOR INSERT
  WITH CHECK (profiles_role('dev'));
CREATE POLICY "Devs update branches" ON public.branches FOR UPDATE
  USING (profiles_role('dev'));
CREATE POLICY "Devs delete branches" ON public.branches FOR DELETE
  USING (profiles_role('dev'));