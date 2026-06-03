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
import type { MenuItem } from "@/lib/menu-data";

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
  refreshMenu: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | null>(null);

let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

async function fetchMenuData(): Promise<{ menuItems: MenuItem[]; categories: Category[]; error: string | null }> {
  try {
    const sb = getSupabase();

    const [catsRes, itemsRes] = await Promise.all([
      sb.from("categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
      sb.from("menu_items").select("id, name, price, image_url, stock, categories!inner(name)").eq("is_available", true).order("name"),
    ]);

    const categories = (catsRes.data || []) as Category[];
    const menuItems: MenuItem[] = (itemsRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      imageName: row.image_url || "",
      stock: row.stock ?? 0,
      category: row.categories?.name || "Uncategorized",
    }));

    return { menuItems, categories, error: null };
  } catch (err: any) {
    return { menuItems: [], categories: [], error: err.message || "Failed to load menu" };
  }
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMenu = useCallback(async () => {
    const result = await fetchMenuData();
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setMenuItems(result.menuItems);
      setCategories(result.categories);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await fetchMenuData();
      setError(result.error);
      setMenuItems(result.menuItems);
      setCategories(result.categories);
      setLoading(false);
    })();
  }, []);

  return (
    <MenuContext.Provider value={{ menuItems, categories, loading, error, refreshMenu }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextType {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}