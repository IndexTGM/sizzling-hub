-- Add notes to cart_items and order_items
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

-- Drop the old unique constraint (customer_id + menu_item_id) so same item with different note can coexist
-- First check if the constraint exists, then drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_customer_id_menu_item_id_key'
  ) THEN
    ALTER TABLE public.cart_items DROP CONSTRAINT cart_items_customer_id_menu_item_id_key;
  END IF;
END $$;

-- Add new unique constraint on (customer_id, menu_item_id, note)
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_customer_id_menu_item_id_note_key UNIQUE (customer_id, menu_item_id, note);