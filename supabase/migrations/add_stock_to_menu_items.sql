-- Add stock tracking to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;

-- Set reasonable defaults for existing items
UPDATE public.menu_items SET stock = 50 WHERE stock = 0;

-- RPC function to safely decrement stock (never goes below 0)
CREATE OR REPLACE FUNCTION public.decrement_stock(p_menu_item_id uuid, p_quantity integer)
RETURNS void AS $$
BEGIN
  UPDATE public.menu_items
  SET stock = GREATEST(stock - p_quantity, 0)
  WHERE id = p_menu_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to restore stock (when an order is cancelled)
CREATE OR REPLACE FUNCTION public.restore_stock(p_menu_item_id uuid, p_quantity integer)
RETURNS void AS $$
BEGIN
  UPDATE public.menu_items
  SET stock = stock + p_quantity
  WHERE id = p_menu_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
