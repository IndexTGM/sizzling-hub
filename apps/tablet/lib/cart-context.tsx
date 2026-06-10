import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export interface CartItem {
  id: string;            // menu_item_id
  name: string;
  price: number;
  image: string;         // image_url base name
  quantity: number;
  note: string;
  stock: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addToCart: (item: Omit<CartItem, "id"> & { id: string }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  total: number;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  const itemCount = items.length;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Fetch cart from DB when user is ready
  const fetchCart = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("cart_items")
      .select("menu_item_id, quantity, note, menu_items(name, price, image_url, stock)")
      .eq("customer_id", user.id);
    if (data && Array.isArray(data)) {
      const mapped: CartItem[] = data
        .filter((r: any) => r.menu_items) // skip deleted items
        .map((r: any) => ({
          id: r.menu_item_id,
          name: r.menu_items?.name || "Unknown",
          price: Number(r.menu_items?.price ?? 0),
          image: r.menu_items?.image_url || "",
          quantity: r.quantity,
          note: r.note || "",
          stock: r.menu_items?.stock ?? 0,
        }));
      setItems(mapped);
    }
    setReady(true);
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchCart();
    } else {
      setItems([]);
      setReady(true);
    }
  }, [user, fetchCart]);

  const clearCart = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from("cart_items").delete().eq("customer_id", user.id);
    setItems([]);
  }, [user]);

  const addToCart = useCallback(
    async (newItem: Omit<CartItem, "id"> & { id: string }) => {
      if (!user?.id) return;
      const note = newItem.note || "";

      // Check current DB quantity for this (customer, menu_item_id)
      const { data: existing } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("customer_id", user.id)
        .eq("menu_item_id", newItem.id)
        .maybeSingle();

      if (existing) {
        const newQty = existing.quantity + newItem.quantity;
        await supabase
          .from("cart_items")
          .update({ quantity: newQty, note })
          .eq("customer_id", user.id)
          .eq("menu_item_id", newItem.id);
      } else {
        await supabase
          .from("cart_items")
          .insert({
            customer_id: user.id,
            menu_item_id: newItem.id,
            quantity: newItem.quantity,
            note,
          });
      }

      // Refresh local state from DB
      await fetchCart();
    },
    [user, fetchCart]
  );

  const removeFromCart = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase
        .from("cart_items")
        .delete()
        .eq("customer_id", user.id)
        .eq("menu_item_id", id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [user]
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      if (!user?.id) return;
      if (quantity <= 0) {
        await supabase
          .from("cart_items")
          .delete()
          .eq("customer_id", user.id)
          .eq("menu_item_id", id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        return;
      }
      await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("customer_id", user.id)
        .eq("menu_item_id", id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i))
      );
    },
    [user]
  );

  if (!ready) {
    // Return empty cart while loading to avoid flash
    return (
      <CartContext.Provider
        value={{ items: [], itemCount: 0, addToCart: () => {}, removeFromCart: () => {}, updateQuantity: () => {}, total: 0, clearCart: async () => {} }}
      >
        {children}
      </CartContext.Provider>
    );
  }

  return (
    <CartContext.Provider
      value={{ items, itemCount, addToCart, removeFromCart, updateQuantity, total, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}