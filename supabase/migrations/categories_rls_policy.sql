-- ============================================================
-- Categories RLS: Public read, admin (same branch) + dev (all) write
-- ============================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read categories
DO $$ BEGIN
  CREATE POLICY "Anyone can read categories" ON public.categories
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Devs can do anything on all categories
DO $$ BEGIN
  CREATE POLICY "Devs full access categories" ON public.categories FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admins can manage categories only in their own branch
DO $$ BEGIN
  CREATE POLICY "Admins manage own branch categories" ON public.categories FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND profiles.branch_id = categories.branch_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;