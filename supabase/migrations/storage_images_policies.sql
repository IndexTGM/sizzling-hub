-- ============================================================
-- Storage Images Bucket RLS: Public read, role-scoped write
-- ============================================================

-- 1. Anyone can read any image (public URL access)
DO $$ BEGIN
  CREATE POLICY "Public read images" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Devs can upload/delete images in any folder
DO $$ BEGIN
  CREATE POLICY "Devs full access images" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'images'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Devs delete images" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'images'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Devs update images" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'images'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'dev'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Admins can upload/delete images only in their branch folder and global/
DO $$ BEGIN
  CREATE POLICY "Admins upload images" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'images'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND (
            (storage.foldername(name))[1] = profiles.branch_id::text
            OR (storage.foldername(name))[1] = 'global'
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete images" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'images'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND (
            (storage.foldername(name))[1] = profiles.branch_id::text
            OR (storage.foldername(name))[1] = 'global'
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins update images" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'images'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
          AND (
            (storage.foldername(name))[1] = profiles.branch_id::text
            OR (storage.foldername(name))[1] = 'global'
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;