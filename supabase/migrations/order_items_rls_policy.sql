-- ============================================================
-- Order Items RLS: Inherits access from parent order
-- ============================================================

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 1. Customers can read items for their own orders
DO $$ BEGIN
  CREATE POLICY "Customers read own order items" ON public.order_items
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
          AND orders.customer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Devs can do anything on all order items
DO $$ BEGIN
  CREATE POLICY "Devs full access order_items" ON public.order_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admins can manage order items in their own branch
DO $$ BEGIN
  CREATE POLICY "Admins manage own branch order_items" ON public.order_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.orders
        JOIN public.profiles ON profiles.id = auth.uid()
        WHERE orders.id = order_items.order_id
          AND profiles.role = 'admin'
          AND profiles.branch_id = orders.branch_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;