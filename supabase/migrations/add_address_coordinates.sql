-- Add lat/lng columns to addresses table for delivery radius validation
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS lng double precision;

-- NOTE: Run this in Supabase Dashboard → SQL Editor