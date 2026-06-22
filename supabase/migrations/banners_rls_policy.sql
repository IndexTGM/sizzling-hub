-- ============================================================
-- Banners RLS: Public read, admin (same branch) + dev (all) write
-- ============================================================

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read active banners
DO $$ BEGIN
  CREATE POLICY "Anyone can read active banners" ON public.banners
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Devs can do anything on all banners
DO $$ BEGIN
  CREATE POLICY "Devs full access banners" ON public.banners FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admins can manage banners only in their own branch
DO $$ BEGIN
  CREATE POLICY "Admins manage own branch banners" ON public.banners FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND profiles.branch_id = banners.branch_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;