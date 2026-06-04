-- Reviews table: one review per menu-item per order per customer
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_unique UNIQUE (customer_id, order_id, menu_item_id)
);

-- Ensure columns exist (idempotent, for tables created before this migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'menu_item_id') THEN
    ALTER TABLE public.reviews ADD COLUMN menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'customer_id') THEN
    ALTER TABLE public.reviews ADD COLUMN customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'order_id') THEN
    ALTER TABLE public.reviews ADD COLUMN order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'rating') THEN
    ALTER TABLE public.reviews ADD COLUMN rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'comment') THEN
    ALTER TABLE public.reviews ADD COLUMN comment text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'created_at') THEN
    ALTER TABLE public.reviews ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Add unique constraint if missing (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_unique') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_unique UNIQUE (customer_id, order_id, menu_item_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS reviews_menu_item_id_idx ON public.reviews (menu_item_id);
CREATE INDEX IF NOT EXISTS reviews_order_id_idx ON public.reviews (order_id);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent) then recreate
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
  DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
  DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
  DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
END $$;

-- Anyone can read reviews (public info for menu item pages)
CREATE POLICY "Anyone can read reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

-- Authenticated users can insert reviews for their own completed orders
-- (The insert_review RPC also validates this server-side)
CREATE POLICY "Users can insert their own reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id
      AND customer_id = auth.uid()
      AND status IN ('delivered', 'completed')
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON public.reviews
  FOR DELETE
  USING (auth.uid() = customer_id);

-- Function to recalculate the average rating for a single menu item
CREATE OR REPLACE FUNCTION public.recalc_menu_item_rating(p_menu_item_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.menu_items
  SET rating = COALESCE(
    (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE menu_item_id = p_menu_item_id),
    0
  )
  WHERE id = p_menu_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert a review and automatically update the menu item's average rating
CREATE OR REPLACE FUNCTION public.insert_review(
  p_customer_id uuid,
  p_order_id uuid,
  p_menu_item_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_review_id uuid;
  v_order_status text;
BEGIN
  -- Verify the order belongs to this customer and is delivered/completed
  SELECT status INTO v_order_status
  FROM public.orders
  WHERE id = p_order_id AND customer_id = p_customer_id;

  IF v_order_status IS NULL THEN
    RAISE EXCEPTION 'Order not found or does not belong to this customer.';
  END IF;

  IF v_order_status NOT IN ('delivered', 'completed') THEN
    RAISE EXCEPTION 'Reviews can only be submitted for delivered/completed orders.';
  END IF;

  INSERT INTO public.reviews (customer_id, order_id, menu_item_id, rating, comment)
  VALUES (p_customer_id, p_order_id, p_menu_item_id, p_rating, p_comment)
  ON CONFLICT (customer_id, order_id, menu_item_id)
  DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = now()
  RETURNING id INTO v_review_id;

  PERFORM public.recalc_menu_item_rating(p_menu_item_id);

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

