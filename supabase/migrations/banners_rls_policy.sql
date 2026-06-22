-- ============================================================
-- Banners RLS: Public read, admin (same branch) + dev (all) write
-- ============================================================

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read active banners" ON public.banners;
DROP POLICY IF EXISTS "Devs full access banners" ON public.banners;
DROP POLICY IF EXISTS "Admins manage own branch banners" ON public.banners;

-- 1. Anyone can read active banners
CREATE POLICY "Anyone can read active banners" ON public.banners
  FOR SELECT USING (is_active = true);

-- 2. Devs: full access
CREATE POLICY "Devs select banners" ON public.banners FOR SELECT
  USING (profiles_role('dev'));
CREATE POLICY "Devs insert banners" ON public.banners FOR INSERT
  WITH CHECK (profiles_role('dev'));
CREATE POLICY "Devs update banners" ON public.banners FOR UPDATE
  USING (profiles_role('dev'));
CREATE POLICY "Devs delete banners" ON public.banners FOR DELETE
  USING (profiles_role('dev'));

-- 3. Admins: own branch only
CREATE POLICY "Admins select banners" ON public.banners FOR SELECT
  USING (profiles_role('admin') AND profiles_branch_id() = banners.branch_id);
CREATE POLICY "Admins insert banners" ON public.banners FOR INSERT
  WITH CHECK (profiles_role('admin') AND profiles_branch_id() = banners.branch_id);
CREATE POLICY "Admins update banners" ON public.banners FOR UPDATE
  USING (profiles_role('admin') AND profiles_branch_id() = banners.branch_id);
CREATE POLICY "Admins delete banners" ON public.banners FOR DELETE
  USING (profiles_role('admin') AND profiles_branch_id() = banners.branch_id);