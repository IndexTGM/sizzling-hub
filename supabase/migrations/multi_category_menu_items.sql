-- Migration: Support multiple categories per menu item (many-to-many)
-- Step 1: Create junction table
CREATE TABLE public.menu_item_categories (
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_item_id, category_id)
);

-- Step 2: Migrate existing single-category data into the junction table
INSERT INTO public.menu_item_categories (menu_item_id, category_id)
SELECT id, category_id
FROM public.menu_items
WHERE category_id IS NOT NULL
ON CONFLICT (menu_item_id, category_id) DO NOTHING;

-- Step 3: Drop the old FK constraint and column from menu_items
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;
ALTER TABLE public.menu_items DROP COLUMN IF EXISTS category_id;

-- Step 4: Indexes for junction table lookups
CREATE INDEX IF NOT EXISTS menu_item_categories_menu_item_id_idx ON public.menu_item_categories(menu_item_id);
CREATE INDEX IF NOT EXISTS menu_item_categories_category_id_idx ON public.menu_item_categories(category_id);

-- Step 5: Enable RLS on junction table (mirror policy from menu_items for admins)
ALTER TABLE public.menu_item_categories ENABLE ROW LEVEL SECURITY;

-- Admins can manage all junction rows
CREATE POLICY "Admins can manage menu_item_categories" ON public.menu_item_categories
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Everyone can read junction rows (public menu browsing)
CREATE POLICY "Anyone can read menu_item_categories" ON public.menu_item_categories
    FOR SELECT
    USING (true);