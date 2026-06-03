-- ============================================================
-- Update order_status enum to new values
-- New: pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled
-- ============================================================

-- 1. Add new enum values (safe, won't break anything)
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'delivered';

-- 2. Migrate existing orders
-- old "otw" → "out_for_delivery"
UPDATE public.orders SET status = 'out_for_delivery' WHERE status = 'otw';
-- old "completed" → "delivered"
UPDATE public.orders SET status = 'delivered' WHERE status = 'completed';
-- old "on_the_way" → "out_for_delivery" (in case the previous migration was already run)
UPDATE public.orders SET status = 'out_for_delivery' WHERE status = 'on_the_way';

-- NOTE: Run this in Supabase Dashboard → SQL Editor