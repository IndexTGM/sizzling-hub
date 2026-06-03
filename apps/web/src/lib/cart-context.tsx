"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type MenuItem, type CartItem } from "@/lib/menu-data";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit-log";

interface CartContextType {
  cart: CartItem[];
  itemCount: number;
  total: number;
  loading: boolean;
  addToCart: (item: MenuItem) => void;
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  placeOrder: () => Promise<{ success: boolean; error?: string }>;
}

const CartContext = createContext<CartContextType | null>(null);

let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load cart from Supabase whenever auth user changes
  useEffect(() => {
    if (!user) {
      setCart([]);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const sb = getSupabase();
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (!session?.user) {
          setCart([]);
          setLoading(false);
          return;
        }

        const { data: rows } = await sb
          .from("cart_items")
          .select("menu_item_id, quantity")
          .eq("customer_id", session.user.id);

        if (rows) {
          // Fetch menu item details from DB for these cart items
          const menuIds = rows.map((r: any) => r.menu_item_id);
          const { data: menuRows } = await sb
            .from("menu_items")
            .select("id, name, price, image_url, categories(name)")
            .in("id", menuIds);

          const menuMap = new Map<string, MenuItem>();
          if (menuRows) {
            for (const mr of menuRows) {
              menuMap.set(mr.id, {
                id: mr.id,
                name: mr.name,
                price: mr.price,
                imageName: mr.image_url || "",
                category: (mr as any).categories?.name || "Uncategorized",
              });
            }
          }

          const items: CartItem[] = [];
          for (const row of rows) {
            const menuItem = menuMap.get(row.menu_item_id);
            if (menuItem) {
              items.push({ ...menuItem, quantity: row.quantity });
            }
          }
          setCart(items);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Sync helper: update/insert a cart item in Supabase
  async function syncItem(menuItemId: string, quantity: number) {
    try {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session?.user) return;

      if (quantity > 0) {
        // Upsert: insert if not exists, update if exists
        await sb.from("cart_items").upsert(
          {
            customer_id: session.user.id,
            menu_item_id: menuItemId,
            quantity,
          },
          { onConflict: "customer_id, menu_item_id" }
        );
      } else {
        // Remove row
        await sb
          .from("cart_items")
          .delete()
          .eq("customer_id", session.user.id)
          .eq("menu_item_id", menuItemId);
      }
    } catch {
      // Silently fail — UI already updated
    }
  }

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      const newQty = existing ? existing.quantity + 1 : 1;
      syncItem(item.id, newQty);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: newQty } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (!existing) return prev;
      const newQty = Math.max(0, existing.quantity + delta);
      syncItem(id, newQty);
      if (newQty === 0) {
        return prev.filter((c) => c.id !== id);
      }
      return prev.map((c) => (c.id === id ? { ...c, quantity: newQty } : c));
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => {
      syncItem(id, 0);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const placeOrder = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (cart.length === 0) return { success: false, error: "Cart is empty." };

    try {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session?.user) return { success: false, error: "You must be logged in." };

      const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

      // 1. Create the order (no payment fields — manual confirmation by admin)
      const { data: order, error: orderErr } = await sb
        .from("orders")
        .insert({
          customer_id: session.user.id,
          order_type: "takeout",
          status: "pending",
          subtotal,
          delivery_fee: 0,
          discount: 0,
          total: subtotal,
        })
        .select("id")
        .single();

      if (orderErr || !order) {
        return { success: false, error: orderErr?.message || "Failed to create order." };
      }

      // 2. Insert order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsErr } = await sb.from("order_items").insert(orderItems);

      if (itemsErr) {
        return { success: false, error: itemsErr.message };
      }

      // 3. Clear cart from DB
      await sb.from("cart_items").delete().eq("customer_id", session.user.id);

      // 4. Clear local state
      setCart([]);

      // 5. Log this order placement (customer audit)
      logAudit({
        source: "customer",
        action: "place_order",
        entity_type: "order",
        entity_id: order.id,
        details: {
          order_type: "takeout",
          item_count: orderItems.length,
          total: subtotal,
        },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Something went wrong." };
    }
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    (async () => {
      try {
        const sb = getSupabase();
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (session?.user) {
          await sb
            .from("cart_items")
            .delete()
            .eq("customer_id", session.user.id);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        total,
        loading,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        placeOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}