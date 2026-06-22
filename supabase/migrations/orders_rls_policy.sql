-- ============================================================
-- Orders RLS: Customer own + Admin branch + Dev all
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 1. Customers can read their own orders
DO $$ BEGIN
  CREATE POLICY "Customers read own orders" ON public.orders
    FOR SELECT USING (
      customer_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Devs can do anything on all orders
DO $$ BEGIN
  CREATE POLICY "Devs full access orders" ON public.orders FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admins can manage orders only in their own branch
DO $$ BEGIN
  CREATE POLICY "Admins manage own branch orders" ON public.orders FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND profiles.branch_id = orders.branch_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;