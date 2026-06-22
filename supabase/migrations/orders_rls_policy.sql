-- ============================================================
-- Orders RLS: Customer own + Admin branch + Dev all
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first (idempotent)
DROP POLICY IF EXISTS "Customers read own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Devs full access orders" ON public.orders;
DROP POLICY IF EXISTS "Admins manage own branch orders" ON public.orders;

-- Helper functions (reuse from expenses migration, but define if missing)
CREATE OR REPLACE FUNCTION profiles_role(p_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role::text = p_role
  );
$$;

CREATE OR REPLACE FUNCTION profiles_branch_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. Customers: read own orders
CREATE POLICY "Customers read own orders" ON public.orders
  FOR SELECT USING (customer_id = auth.uid());

-- 2. Customers: insert own orders
CREATE POLICY "Customers insert own orders" ON public.orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- 3. Devs: full access
CREATE POLICY "Devs select orders" ON public.orders FOR SELECT
  USING (profiles_role('dev'));
CREATE POLICY "Devs insert orders" ON public.orders FOR INSERT
  WITH CHECK (profiles_role('dev'));
CREATE POLICY "Devs update orders" ON public.orders FOR UPDATE
  USING (profiles_role('dev'));
CREATE POLICY "Devs delete orders" ON public.orders FOR DELETE
  USING (profiles_role('dev'));

-- 4. Admins: own branch only
CREATE POLICY "Admins select orders" ON public.orders FOR SELECT
  USING (profiles_role('admin') AND profiles_branch_id() = orders.branch_id);
CREATE POLICY "Admins insert orders" ON public.orders FOR INSERT
  WITH CHECK (profiles_role('admin') AND profiles_branch_id() = orders.branch_id);
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE
  USING (profiles_role('admin') AND profiles_branch_id() = orders.branch_id);
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE
  USING (profiles_role('admin') AND profiles_branch_id() = orders.branch_id);