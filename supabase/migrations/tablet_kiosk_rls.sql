-- ============================================================
-- Tablet Kiosk RLS: Allow unauthenticated order creation
-- for the walk-in kiosk user.
-- ============================================================

-- The tablet app uses a hardcoded walk_in customer UUID and
-- is not authenticated, so regular RLS policies block it.
-- This policy allows inserts for that specific customer.

-- Keep the existing customer insert policy (DO NOT DROP it)
-- Just add these kiosk-specific policies alongside it.

-- Allow kiosk inserts without auth for the hardcoded walk_in UUID
DO $$ BEGIN
  CREATE POLICY "Kiosk insert orders" ON public.orders
    FOR INSERT WITH CHECK (
      customer_id = 'd9f8c709-f2db-4021-9501-660ac77a6d22'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow kiosk order items inserts linked to walk_in orders
DO $$ BEGIN
  CREATE POLICY "Kiosk insert order items" ON public.order_items
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
          AND orders.customer_id = 'd9f8c709-f2db-4021-9501-660ac77a6d22'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
