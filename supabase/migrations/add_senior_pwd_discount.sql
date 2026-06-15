-- ============================================================
-- Add senior_pwd_discount flag to orders table
-- ============================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS senior_pwd_discount boolean NOT NULL DEFAULT false;