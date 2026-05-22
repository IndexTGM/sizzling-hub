-- Seed categories
INSERT INTO public.categories (id, name, slug, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Silog', 'silog', 1),
  ('00000000-0000-0000-0000-000000000002', 'Drinks', 'drinks', 2),
  ('00000000-0000-0000-0000-000000000003', 'Add-ons', 'add-ons', 3)
ON CONFLICT (slug) DO NOTHING;

-- Seed menu items
INSERT INTO public.menu_items (id, category_id, name, price, image_url, is_available) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Barsilog', 119, 'barsilog.jpg', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Tapsilog', 109, 'tapsilog.jpg', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Porksilog', 99, 'porksilog.jpg', true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Chiksilog', 139, 'chiksilog.jpg', true),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Sisilog', 129, 'sisilog.jpg', true),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'BuffaWingsilog', 119, 'buffawingsilog.jpg', true),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'Soft Drink', 39, 'soft_drink.jpg', true),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'Bottled Water', 25, 'bottled_water.jpg', true),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000003', 'Extra Rice', 29, 'extra_rice.jpg', true),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000003', 'Extra Egg', 19, 'extra_egg.jpg', true)
ON CONFLICT (id) DO NOTHING;