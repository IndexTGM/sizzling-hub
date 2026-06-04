import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageName: string;
  category: string;
  categoryId: string;
  description: string;
  rating: number;
  stock: number;
}

interface MenuContextType {
  menuItems: MenuItem[];
  categories: { id: string; name: string }[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data: items } = await supabase
      .from("menu_items")
      .select("id, name, price, image_url, stock, rating, description, category_id, categories(name)")
      .order("name");
    const { data: cats } = await supabase.from("categories").select("id, name").order("sort_order");

    if (items) {
      setMenuItems(items.map((r: any) => ({
        id: r.id,
        name: r.name,
        price: r.price,
        imageName: r.image_url || "",
        stock: r.stock ?? 0,
        description: r.description || "",
        category: r.categories?.name || "Uncategorized",
        categoryId: r.category_id,
        rating: r.rating ?? 0,
      })));
    }
    if (cats) setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <MenuContext.Provider value={{ menuItems, categories, loading, refresh: fetchAll }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextType {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}