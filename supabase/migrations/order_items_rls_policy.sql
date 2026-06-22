-- ============================================================
-- Order Items RLS: Customer own + Admin branch + Dev all
-- ============================================================

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Customers read own order items" ON public.order_items;
DROP POLICY IF EXISTS "Devs full access order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admins manage own branch order_items" ON public.order_items;
DROP POLICY IF EXISTS "Kiosk insert order items" ON public.order_items;

-- 1. Customers: read own order items
CREATE POLICY "Customers read own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- 2. Customers: insert own order items
CREATE POLICY "Customers insert own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- 3. Devs: full access
CREATE POLICY "Devs select order_items" ON public.order_items FOR SELECT
  USING (profiles_role('dev'));
CREATE POLICY "Devs insert order_items" ON public.order_items FOR INSERT
  WITH CHECK (profiles_role('dev'));
CREATE POLICY "Devs update order_items" ON public.order_items FOR UPDATE
  USING (profiles_role('dev'));
CREATE POLICY "Devs delete order_items" ON public.order_items FOR DELETE
  USING (profiles_role('dev'));

-- 4. Admins: own branch only (via parent order's branch_id)
CREATE POLICY "Admins select order_items" ON public.order_items FOR SELECT
  USING (
    profiles_role('admin')
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.branch_id = profiles_branch_id()
    )
  );
CREATE POLICY "Admins insert order_items" ON public.order_items FOR INSERT
  WITH CHECK (
    profiles_role('admin')
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.branch_id = profiles_branch_id()
    )
  );
CREATE POLICY "Admins update order_items" ON public.order_items FOR UPDATE
  USING (
    profiles_role('admin')
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.branch_id = profiles_branch_id()
    )
  );
CREATE POLICY "Admins delete order_items" ON public.order_items FOR DELETE
  USING (
    profiles_role('admin')
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.branch_id = profiles_branch_id()
    )
  );

-- 5. Tablet kiosk: unauthenticated inserts for walk_in user
CREATE POLICY "Kiosk insert order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = 'd9f8c709-f2db-4021-9501-660ac77a6d22'
    )
  );