-- Create banners table
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  tag text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can read active banners)
CREATE POLICY "Public read banners"
  ON public.banners
  FOR SELECT
  USING (is_active = true);

-- Admin full access
CREATE POLICY "Admin full access banners"
  ON public.banners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Seed some default banners
INSERT INTO public.banners (title, subtitle, image, tag, sort_order) VALUES
  ('Chicken Fritters Silog', 'Crispy on the outside, juicy on the inside. A new twist on a classic favorite!', 'chickenfritterssilog', 'BEST SELLER', 1),
  ('Buffalo Wings with More Sauce Flavors', 'Spice up your meal with our new variety of sauce flavors. Perfect for sharing (or not!).', 'buffalowings', 'FLAVOR BOOST', 2),
  ('Iced Tea - Happy Hour', 'Cool down with our refreshing iced tea. Happy Hour special: Buy 1 Get 1 Free from 1-3 PM!', 'icedtea', 'HAPPY HOUR', 3)
ON CONFLICT DO NOTHING;