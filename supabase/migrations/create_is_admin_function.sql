-- ============================================================
-- Create is_admin() helper function used by many RLS policies
-- This function was referenced by policies but never created.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role::text = 'admin'
  );
$$;

-- ============================================================
-- Add admin UPDATE/DELETE policy for profiles table
-- Previously admins could only SELECT profiles; this allows
-- role changes and other admin management operations.
-- ============================================================
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO public
  USING (is_admin())
  WITH CHECK (true);

-- Also allow admins to delete profiles if needed
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  TO public
  USING (is_admin());

-- ============================================================
-- Add admin ALL policy for cart_items table
-- Previously only customer-owned policies existed, so admins
-- could not delete cart_items when removing a menu item.
-- ============================================================
DROP POLICY IF EXISTS "Admins manage all cart items" ON public.cart_items;
CREATE POLICY "Admins manage all cart items"
  ON public.cart_items
  FOR ALL
  TO public
  USING (is_admin());
