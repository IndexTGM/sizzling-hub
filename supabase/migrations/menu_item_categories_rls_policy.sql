-- ============================================================
-- Menu Item Categories RLS: Public read, admin (same branch) + dev (all) write
-- ============================================================

ALTER TABLE public.menu_item_categories ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read junction table (public menu browsing)
DO $$ BEGIN
  CREATE POLICY "Anyone can read menu_item_categories" ON public.menu_item_categories
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Devs can do anything on all junctions
DO $$ BEGIN
  CREATE POLICY "Devs full access menu_item_categories" ON public.menu_item_categories FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admins can manage junctions for items in their own branch
DO $$ BEGIN
  CREATE POLICY "Admins manage own branch menu_item_categories" ON public.menu_item_categories FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.menu_items
        JOIN public.profiles ON profiles.id = auth.uid()
        WHERE menu_items.id = menu_item_categories.menu_item_id
          AND profiles.role = 'admin'
          AND profiles.branch_id = menu_items.branch_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;