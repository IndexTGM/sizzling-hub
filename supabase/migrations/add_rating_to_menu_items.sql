-- Add rating column to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS rating numeric(2, 1) NOT NULL DEFAULT 0;