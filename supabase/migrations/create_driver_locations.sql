-- ============================================================
-- Driver Locations Table (GPS Tracking for Delivery)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id       uuid NOT NULL REFERENCES public.profiles(id),
  latitude        double precision NOT NULL,
  longitude       double precision NOT NULL,
  heading         double precision,
  speed           double precision,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Customers can view locations for their orders
CREATE POLICY "Customers view driver location for own orders"
  ON public.driver_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = driver_locations.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Admins full access
CREATE POLICY "Admins full access driver locations"
  ON public.driver_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Index for fast lookups by order_id
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id ON public.driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at ON public.driver_locations(recorded_at DESC);

-- Enable realtime for Supabase subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;