import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const itemCount = items.length;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const addToCart = useCallback(
    (newItem: Omit<CartItem, "id"> & { id: string }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === newItem.id);
        if (existing) {
          return prev.map((i) =>
            i.id === newItem.id
              ? { ...i, quantity: i.quantity + newItem.quantity, note: newItem.note || i.note }
              : i
          );
        }
        return [
          ...prev,
          {
            id: newItem.id,
            name: newItem.name,
            price: newItem.price,
            image: newItem.image,
            quantity: newItem.quantity,
            note: newItem.note,
            stock: newItem.stock,
          },
        ];
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
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  }, []);

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