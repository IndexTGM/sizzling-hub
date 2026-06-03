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
  addToCart: (item: MenuItem, note?: string) => void;
  updateQty: (id: string, note: string, delta: number) => void;
  updateNote: (id: string, oldNote: string, newNote: string) => void;
  removeFromCart: (id: string, note: string) => void;
  clearCart: () => void;
  placeOrder: (orderType?: "dine_in" | "takeout" | "delivery" | "pickup") => Promise<{ success: boolean; error?: string }>;
}

const CartContext = createContext<CartContextType | null>(null);

let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

/** Unique identifier for a cart line: menuItemId + note */
function cartKey(itemId: string, note: string) {
  return `${itemId}||${note}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setCart([]); setLoading(false); return; }
    (async () => {
      try {
        const sb = getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) { setCart([]); setLoading(false); return; }

        const { data: rows } = await sb
          .from("cart_items")
          .select("menu_item_id, quantity, note")
          .eq("customer_id", session.user.id);

        if (rows) {
          const menuIds = [...new Set(rows.map((r: any) => r.menu_item_id))];
          const { data: menuRows } = await sb
            .from("menu_items")
            .select("id, name, price, image_url, stock, categories(name)")
            .in("id", menuIds);

          const menuMap = new Map<string, MenuItem>();
          if (menuRows) {
            for (const mr of menuRows) {
              menuMap.set(mr.id, {
                id: mr.id, name: mr.name, price: mr.price,
                imageName: mr.image_url || "", stock: mr.stock ?? 0,
                category: (mr as any).categories?.name || "Uncategorized",
              });
            }
          }

          const items: CartItem[] = [];
          for (const row of rows) {
            const menuItem = menuMap.get(row.menu_item_id);
            if (menuItem) {
              items.push({ ...menuItem, quantity: row.quantity, note: row.note ?? "" });
            }
          }
          setCart(items);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [user]);

  async function syncItem(menuItemId: string, quantity: number, note: string) {
    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) return;
      if (quantity > 0) {
        await sb.from("cart_items").upsert(
          { customer_id: session.user.id, menu_item_id: menuItemId, quantity, note },
          { onConflict: "customer_id, menu_item_id, note" }
        );
      } else {
        await sb.from("cart_items").delete()
          .eq("customer_id", session.user.id)
          .eq("menu_item_id", menuItemId)
          .eq("note", note);
      }
    } catch { /* ignore */ }
  }

  const addToCart = useCallback((item: MenuItem, note: string = "") => {
    setCart((prev) => {
      const key = cartKey(item.id, note);
      const existing = prev.find((c) => cartKey(c.id, c.note ?? "") === key);
      const newQty = existing ? existing.quantity + 1 : 1;
      syncItem(item.id, newQty, note);
      if (existing) {
        return prev.map((c) => cartKey(c.id, c.note ?? "") === key ? { ...c, quantity: newQty } : c);
      }
      return [...prev, { ...item, quantity: 1, note }];
    });
  }, []);

  const updateQty = useCallback((id: string, note: string, delta: number) => {
    setCart((prev) => {
      const key = cartKey(id, note);
      const existing = prev.find((c) => cartKey(c.id, c.note ?? "") === key);
      if (!existing) return prev;
      const stock = (existing as any).stock ?? 999;
      const newQty = Math.min(Math.max(0, existing.quantity + delta), stock);
      syncItem(id, newQty, note);
      if (newQty === 0) return prev.filter((c) => cartKey(c.id, c.note ?? "") !== key);
      return prev.map((c) => cartKey(c.id, c.note ?? "") === key ? { ...c, quantity: newQty } : c);
    });
  }, []);

  const updateNote = useCallback((id: string, oldNote: string, newNote: string) => {
    setCart((prev) => {
      const oldKey = cartKey(id, oldNote);
      const existing = prev.find((c) => cartKey(c.id, c.note ?? "") === oldKey);
      if (!existing) return prev;
      const newKey = cartKey(id, newNote);
      // Check if there's already an item with the new key (merge them)
      const mergeTarget = prev.find((c) => cartKey(c.id, c.note ?? "") === newKey);
      if (mergeTarget && mergeTarget !== existing) {
        // Merge: delete old, add quantities to new target
        syncItem(id, 0, oldNote);
        const mergedQty = mergeTarget.quantity + existing.quantity;
        syncItem(id, mergedQty, newNote);
        return prev
          .filter((c) => cartKey(c.id, c.note ?? "") !== oldKey)
          .map((c) => cartKey(c.id, c.note ?? "") === newKey ? { ...c, quantity: mergedQty } : c);
      }
      // Just update the note
      syncItem(id, 0, oldNote);
      syncItem(id, existing.quantity, newNote);
      return prev.map((c) => cartKey(c.id, c.note ?? "") === oldKey ? { ...c, note: newNote } : c);
    });
  }, []);

  const removeFromCart = useCallback((id: string, note: string) => {
    setCart((prev) => {
      syncItem(id, 0, note);
      return prev.filter((c) => cartKey(c.id, c.note ?? "") !== cartKey(id, note));
    });
  }, []);

  const placeOrder = useCallback(async (
    orderType: "dine_in" | "takeout" | "delivery" | "pickup" = "delivery"
  ): Promise<{ success: boolean; error?: string }> => {
    if (cart.length === 0) return { success: false, error: "Cart is empty." };
    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) return { success: false, error: "You must be logged in." };

      const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

      // Validate stock
      for (const item of cart) {
        const { data: current } = await sb.from("menu_items").select("stock, name").eq("id", item.id).single();
        if (!current) return { success: false, error: `Item "${item.name}" no longer exists.` };
        if (current.stock < item.quantity) {
          return { success: false, error: `Not enough stock for "${current.name}". Only ${current.stock} left, but you have ${item.quantity} in cart.` };
        }
      }

      const { data: order, error: orderErr } = await sb.from("orders").insert({
        customer_id: session.user.id, order_type: orderType, status: "pending",
        subtotal, delivery_fee: 0, discount: 0, total: subtotal,
      }).select("id").single();

      if (orderErr || !order) return { success: false, error: orderErr?.message || "Failed to create order." };

      const orderItems = cart.map((item) => ({
        order_id: order.id, menu_item_id: item.id,
        quantity: item.quantity, unit_price: item.price,
        subtotal: item.price * item.quantity,
        note: item.note ?? "",
      }));

      const { error: itemsErr } = await sb.from("order_items").insert(orderItems);
      if (itemsErr) return { success: false, error: itemsErr.message };

      await sb.from("cart_items").delete().eq("customer_id", session.user.id);
      setCart([]);

      for (const item of cart) {
        await sb.rpc("decrement_stock", { p_menu_item_id: item.id, p_quantity: item.quantity });
      }

      logAudit({
        source: "customer", action: "place_order", entity_type: "order", entity_id: order.id,
        details: {
          order_type: orderType,
          total: subtotal,
          items: cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            note: item.note ?? "",
            subtotal: item.price * item.quantity,
          })),
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
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) await sb.from("cart_items").delete().eq("customer_id", session.user.id);
      } catch { /* ignore */ }
    })();
  }, []);

  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, itemCount, total, loading, addToCart, updateQty, updateNote, removeFromCart, clearCart, placeOrder }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}