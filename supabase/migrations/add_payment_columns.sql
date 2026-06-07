-- ============================================================
-- Add PayMongo payment tracking to orders
-- ============================================================

-- Convert payment_method from enum to plain text (if it was created as enum)
DO $$ BEGIN
  ALTER TABLE public.orders ALTER COLUMN payment_method TYPE text;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_source_id text,
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
  CHECK (payment_status IS NULL OR payment_status IN ('unpaid', 'paid', 'refunded'));
