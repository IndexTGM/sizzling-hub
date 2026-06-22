-- ============================================================
-- Expenses table for Profit & Loss reporting
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid REFERENCES public.branches(id),
  amount      numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL DEFAULT '',
  category    text NOT NULL DEFAULT 'Other',
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 1. Devs can do anything on all expenses
DO $$ BEGIN
  CREATE POLICY "Devs full access expenses" ON public.expenses FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Admins can manage expenses only in their own branch
DO $$ BEGIN
  CREATE POLICY "Admins manage own branch expenses" ON public.expenses FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND profiles.branch_id = expenses.branch_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND profiles.branch_id = expenses.branch_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
