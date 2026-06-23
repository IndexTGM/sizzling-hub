-- Receipts table: standalone record of completed orders (no FKs to orders/menu_items)
-- Generated only when an order reaches "delivered" status

CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  order_type text NOT NULL,
  source text NOT NULL CHECK (source IN ('walk_in', 'online')),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  branch_id uuid,
  branch_name text,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text,
  payment_status text,
  senior_pwd_discount boolean DEFAULT false,
  notes text,
  placed_at timestamptz,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_branch_id ON public.receipts(branch_id);
CREATE INDEX IF NOT EXISTS idx_receipts_source ON public.receipts(source);
CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON public.receipts(order_id);

-- RLS: Branch admins can view receipts for their branch
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view receipts in their branch" ON public.receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'dev')
        AND (
          profiles.role = 'dev'
          OR receipts.branch_id = profiles.branch_id
        )
    )
  );

-- Devs can insert/delete receipts
CREATE POLICY "Admins can insert receipts" ON public.receipts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'dev')
    )
  );

CREATE POLICY "Admins can delete receipts" ON public.receipts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'dev')
    )
  );