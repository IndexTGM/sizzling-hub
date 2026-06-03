-- Add 'pickup' to order_type enum
ALTER TYPE public.order_type ADD VALUE IF NOT EXISTS 'pickup';

-- NOTE: Run this in Supabase Dashboard → SQL Editor