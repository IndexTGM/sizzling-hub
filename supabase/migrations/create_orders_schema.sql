-- ============================================================
-- Orders & Order Items Tables
-- ============================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.order_type AS ENUM ('dine_in', 'takeout', 'delivery');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'otw', 'ready', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid NOT NULL REFERENCES public.profiles(id),
  order_type      public.order_type NOT NULL DEFAULT 'dine_in',
  status          public.order_status NOT NULL DEFAULT 'pending',
  subtotal        numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  delivery_fee    numeric NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  discount        numeric NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total           numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes           text,
  placed_at       timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

-- 3. Order Items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id    uuid NOT NULL REFERENCES public.menu_items(id),
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price      numeric NOT NULL CHECK (unit_price >= 0),
  subtotal        numeric NOT NULL CHECK (subtotal >= 0),
  special_request text
);

-- 4. Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 5. Policies — customers see/insert their own orders
CREATE POLICY "Customers select own orders"
  ON public.orders
  FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers insert own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers select own order items"
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers insert own order items"
  ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- 6. Policies — admins full access
CREATE POLICY "Admins full access orders"
  ON public.orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins full access order items"
  ON public.order_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );