import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useBranch } from "@/lib/branch-context";
import { useAuth } from "@/lib/auth-context";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
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
  clearCart: () => void;
  placeOrder: (orderType: "dine_in" | "takeout") => Promise<string | null>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { branchId } = useBranch();
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = useCallback(
    (newItem: Omit<CartItem, "id"> & { id: string }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === newItem.id);
        if (existing) {
          return prev.map((i) =>
            i.id === newItem.id
              ? { ...i, quantity: Math.min(i.quantity + newItem.quantity, i.stock), note: newItem.note || i.note }
              : i
          );
        }
        return [...prev, { ...newItem, id: newItem.id }];
      });
    },
    []
  );

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, i.stock) } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const placeOrder = useCallback(
    async (orderType: "dine_in" | "takeout"): Promise<string | null> => {
      if (items.length === 0) return "Cart is empty";

      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      // Validate stock
      for (const item of items) {
        const { data: current } = await supabase
          .from("menu_items")
          .select("stock, name")
          .eq("id", item.id)
          .single();
        if (!current) return `"${item.name}" is no longer available.`;
        if (current.stock < item.quantity)
          return `Not enough stock for "${current.name}". Only ${current.stock} left.`;
      }

      // Use the authenticated user's ID (walk_in)
      if (!user?.id) return "Please log in to place an order.";

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          order_type: orderType,
          status: "pending",
          subtotal,
          delivery_fee: 0,
          discount: 0,
          total: subtotal,
          notes: null,
          branch_id: branchId,
        })
        .select("id")
        .single();

      if (orderErr || !order) return orderErr?.message || "Failed to create order.";

      const orderItems = items.map((item) => ({
        order_id: order.id,
        menu_item: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        note: item.note || "",
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) return itemsErr.message;

      // Decrement stock
      for (const item of items) {
        await supabase.rpc("decrement_stock", {
          p_menu_item_id: item.id,
          p_quantity: item.quantity,
        });
      }

      clearCart();
      return null; // success
    },
    [items, branchId, clearCart, user]
  );

  return (
    <CartContext.Provider
      value={{ items, itemCount, addToCart, removeFromCart, updateQuantity, total, clearCart, placeOrder }}
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