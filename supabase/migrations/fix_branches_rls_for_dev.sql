-- ============================================================
-- Fix: Allow dev role full access to branches (same as admin)
-- ============================================================

DROP POLICY IF EXISTS "Dev full access branches" ON public.branches;

CREATE POLICY "Devs full access branches" ON public.branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'dev'
    )
  );