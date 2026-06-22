-- ============================================================
-- Cart Items RLS: Owner-only (customers manage their own cart)
-- ============================================================

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 1. Customers can manage their own cart items
DO $$ BEGIN
  CREATE POLICY "Customers manage own cart items" ON public.cart_items FOR ALL
    USING (
      customer_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;