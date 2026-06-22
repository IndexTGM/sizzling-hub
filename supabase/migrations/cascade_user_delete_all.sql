-- ============================================================
-- Cascade: Delete all user data when auth.users row is deleted
-- Deletion order respects FK dependencies:
--   1. driver_locations (→ orders, → profiles)
--   2. order_items       (→ orders)
--   3. orders            (→ profiles, → addresses)
--   4. cart_items        (→ profiles)
--   5. addresses         (→ profiles)
--   6. profiles          (→ auth.users)
-- ============================================================

-- Replace the existing trigger function (from cascade_delete_profile.sql)
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Driver locations for this user's orders AND where user is the driver
  DELETE FROM public.driver_locations
  WHERE order_id IN (SELECT id FROM public.orders WHERE customer_id = old.id)
     OR driver_id = old.id;

  -- 2. Order items for this user's orders
  DELETE FROM public.order_items
  WHERE order_id IN (SELECT id FROM public.orders WHERE customer_id = old.id);

  -- 3. Orders (FK to profiles.customer_id, FK to addresses.address_id)
  --    Set address_id to NULL first, then delete orders
  UPDATE public.orders SET address_id = NULL WHERE customer_id = old.id;
  DELETE FROM public.orders WHERE customer_id = old.id;

  -- 4. Cart items
  DELETE FROM public.cart_items WHERE customer_id = old.id;

  -- 5. Addresses
  DELETE FROM public.addresses WHERE user_id = old.id;

  -- 6. Profile (triggered by auth.users delete)
  DELETE FROM public.profiles WHERE id = old.id;

  RETURN old;
END;
$$;

-- Re-create the trigger as BEFORE DELETE so child rows are cleaned up
-- before auth.users deletion, avoiding FK violations.
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
