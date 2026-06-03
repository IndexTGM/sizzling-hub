-- ============================================================
-- Cleanup: Remove unused enum values from order_status
-- Uses CASCADE to drop dependent policies, then recreates them.
-- ============================================================

-- 1. Create the new enum type with only the values we want
CREATE TYPE public.order_status_new AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

-- 2. Add a temp column of the new type
ALTER TABLE public.orders ADD COLUMN status_new public.order_status_new;

-- 3. Copy data from old column to new column, casting
UPDATE public.orders SET status_new = status::text::public.order_status_new;

-- 4. Drop the old column with CASCADE (drops dependent policies too)
ALTER TABLE public.orders DROP COLUMN status CASCADE;

-- 5. Rename the new column to "status"
ALTER TABLE public.orders RENAME COLUMN status_new TO status;

-- 6. Set NOT NULL and default
ALTER TABLE public.orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending';

-- 7. Drop the old enum type (CASCADE in case anything else references it)
DROP TYPE IF EXISTS public.order_status CASCADE;

-- 8. Rename the new type to the original name
ALTER TYPE public.order_status_new RENAME TO order_status;

-- 9. Re-enable Row Level Security (it was dropped by CASCADE)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 10. Recreate the RLS policies that were dropped

-- Customers see their own orders
CREATE POLICY "Customers select own orders"
  ON public.orders
  FOR SELECT
  USING (customer_id = auth.uid());

-- Customers insert their own orders
CREATE POLICY "Customers insert own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can cancel their pending orders
CREATE POLICY "Customers cancel their pending orders"
  ON public.orders
  FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'pending'::public.order_status)
  WITH CHECK (customer_id = auth.uid() AND status = 'cancelled'::public.order_status);

-- Admins full access
CREATE POLICY "Admins full access orders"
  ON public.orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- DONE.