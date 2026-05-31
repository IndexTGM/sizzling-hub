-- ============================================================
-- Storage Bucket & Policies for "images" bucket
-- ============================================================

-- 1. Create the images bucket if it doesn't exist
--    (Supabase buckets are typically created via dashboard,
--     but we document the policy setup here.)
--    Run this via Supabase SQL Editor or apply as a migration.

-- 2. Public read: anyone can view/download images (for public URLs)
CREATE POLICY "Public read images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

-- 3. Admin upload: only authenticated admin users can upload
CREATE POLICY "Admin upload images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 4. Admin update: only authenticated admin users can update
CREATE POLICY "Admin update images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 5. Admin delete: only authenticated admin users can delete
CREATE POLICY "Admin delete images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );