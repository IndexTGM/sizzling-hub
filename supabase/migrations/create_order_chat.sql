-- Order Chat System: Messages between customers and branch admins
-- Only online orders (delivery, pickup) have chat enabled.

CREATE TABLE IF NOT EXISTS public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  message text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by order
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_created_at ON public.order_messages(order_id, created_at);

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Customers can read messages for orders they own
CREATE POLICY "Customers can read their own order messages" ON public.order_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_messages.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Customers can insert messages for their own orders
CREATE POLICY "Customers can send messages on their own orders" ON public.order_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_messages.order_id
        AND orders.customer_id = auth.uid()
    )
    AND sender_role = 'customer'
    AND sender_id = auth.uid()
  );

-- Admins can read messages for orders in their branch
CREATE POLICY "Admins can read order messages in their branch" ON public.order_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE orders.id = order_messages.order_id
        AND orders.branch_id = profiles.branch_id
        AND profiles.role IN ('admin', 'dev')
    )
  );

-- Admins can insert messages for orders in their branch
CREATE POLICY "Admins can send messages on orders in their branch" ON public.order_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE orders.id = order_messages.order_id
        AND orders.branch_id = profiles.branch_id
        AND profiles.role IN ('admin', 'dev')
    )
    AND sender_role = 'admin'
    AND sender_id = auth.uid()
  );

-- Storage bucket for chat images (use existing 'images' bucket with 'chat/' prefix)
-- Allow authenticated users to upload to images/chat/
CREATE POLICY "Users can upload chat images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'chat'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view chat images" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'chat'
  );