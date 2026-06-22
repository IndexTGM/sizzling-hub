-- ============================================================
-- Menu Items RLS: Public read, admin (same branch) + dev (all) write
-- ============================================================

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read menu items
DO $$ BEGIN
  CREATE POLICY "Anyone can read menu items" ON public.menu_items
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Devs can do anything on all menu items
DO $$ BEGIN
  CREATE POLICY "Devs full access menu_items" ON public.menu_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admins can manage menu items only in their own branch
DO $$ BEGIN
  CREATE POLICY "Admins manage own branch menu_items" ON public.menu_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND profiles.branch_id = menu_items.branch_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;