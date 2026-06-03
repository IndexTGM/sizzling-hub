-- ============================================================
-- Audit Logs Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email text,
  source      text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'customer')),
  action      text NOT NULL,
  entity_type text,       -- 'order', 'menu_item', 'profile', 'banner', 'category', 'image'
  entity_id   text,
  details     jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON public.audit_logs (source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Anyone authenticated can insert (the frontend will log actions client-side)
CREATE POLICY "Anyone can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);