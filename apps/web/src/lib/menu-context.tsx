"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getImagePath, type MenuItem } from "@/lib/menu-data";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MenuContextType {
  menuItems: MenuItem[];
  categories: Category[];
  loading: boolean;
  error: string | null;
}

const MenuContext = createContext<MenuContextType | null>(null);

let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();

        // Fetch categories
        const { data: cats } = await sb
          .from("categories")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("sort_order");

        if (cats) setCategories(cats);

        // Fetch menu items with category name via join
        const { data: items } = await sb
          .from("menu_items")
          .select("id, name, price, image_url, categories!inner(name)")
          .eq("is_available", true)
          .order("name");

        if (items) {
          const mapped: MenuItem[] = items.map((row: any) => ({
            id: row.id,
            name: row.name,
            price: row.price,
            imageName: row.image_url || "",
            category: row.categories?.name || "Uncategorized",
          }));
          setMenuItems(mapped);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load menu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <MenuContext.Provider value={{ menuItems, categories, loading, error }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextType {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}