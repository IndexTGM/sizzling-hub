-- ============================================================
-- Add branch_id to cart_items for order creation context
-- ============================================================

ALTER TABLE public.cart_items
ADD COLUMN IF NOT EXISTS branch_id uuid
REFERENCES public.branches(id);