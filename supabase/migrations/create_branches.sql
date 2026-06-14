-- ============================================================
-- Branches Table & Multi-Branch Support
-- ============================================================

-- 1. Branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  address         text,
  phone           text,
  email           text,
  lat             double precision NOT NULL,
  lng             double precision NOT NULL,
  delivery_radius_km double precision NOT NULL DEFAULT 3,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Add branch_id to existing tables (if not already present)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);

-- 3. Add FK constraint on addresses.branch_id (may have been added as bare column)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'addresses' AND column_name = 'branch_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'addresses' AND ccu.column_name = 'branch_id' AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.addresses ADD CONSTRAINT addresses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);
  END IF;
END $$;

-- 4. Seed a default branch (main/original location)
INSERT INTO public.branches (id, name, slug, lat, lng, address)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Sizzling Hub – Main',
  'main',
  14.4566673,
  121.0446128,
  'Muntinlupa, Metro Manila'
) ON CONFLICT (slug) DO NOTHING;

-- 5. Update existing data to belong to the default branch
UPDATE public.categories SET branch_id = '00000000-0000-0000-0000-000000000010' WHERE branch_id IS NULL;
UPDATE public.menu_items SET branch_id = '00000000-0000-0000-0000-000000000010' WHERE branch_id IS NULL;
UPDATE public.banners SET branch_id = '00000000-0000-0000-0000-000000000010' WHERE branch_id IS NULL;
UPDATE public.orders SET branch_id = '00000000-0000-0000-0000-000000000010' WHERE branch_id IS NULL;
UPDATE public.addresses SET branch_id = '00000000-0000-0000-0000-000000000010' WHERE branch_id IS NULL;
UPDATE public.discounts SET branch_id = '00000000-0000-0000-0000-000000000010' WHERE branch_id IS NULL;

-- 6. Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Everyone can read active branches
DO $$ BEGIN
  CREATE POLICY "Anyone can read branches" ON public.branches FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins full access to branches
DO $$ BEGIN
  CREATE POLICY "Admins full access branches" ON public.branches FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Drop branch_staff table if it exists (no longer needed — admin-only)
DROP TABLE IF EXISTS public.branch_staff CASCADE;

-- ============================================================
-- Helper function: resolve branch_id from slug
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_branch_id(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.branches
  WHERE slug = p_slug AND is_active = true
  LIMIT 1;
$$;