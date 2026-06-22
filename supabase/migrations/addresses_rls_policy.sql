-- ============================================================
-- Addresses RLS: Owner-only (users manage their own addresses)
-- ============================================================

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 1. Users can manage only their own addresses
DO $$ BEGIN
  CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL
    USING (
      user_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;