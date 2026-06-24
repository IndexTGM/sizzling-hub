import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useBranch } from "@/lib/branch-context";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageName: string;
  branchId: string | null;
  description: string;
  stock: number;
  categories: string[];
}

interface Category {
  id: string;
  name: string;
}

interface MenuContextType {
  menuItems: MenuItem[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  refreshMenu: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | null>(null);

async function fetchMenuData(branchId: string | null): Promise<{ menuItems: MenuItem[]; categories: Category[]; error: string | null }> {
  try {
    let catsQuery = supabase.from("categories").select("id, name").order("sort_order");
    let itemsQuery = supabase.from("menu_items").select("id, name, price, description, stock, branch_id").order("name");

    if (branchId) {
      catsQuery = catsQuery.or(`branch_id.eq.${branchId},branch_id.is.null`);
      itemsQuery = itemsQuery.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    const [catsRes, itemsRes, junctionsRes] = await Promise.all([
      catsQuery,
      itemsQuery,
      supabase.from("menu_item_categories").select("menu_item_id, category_id, categories!inner(name)"),
    ]);

    console.log("[MenuContext] branchId:", branchId);
    console.log("[MenuContext] categories count:", catsRes.data?.length, "error:", catsRes.error?.message);
    console.log("[MenuContext] items count:", itemsRes.data?.length, "error:", itemsRes.error?.message);
    console.log("[MenuContext] junctions count:", junctionsRes.data?.length, "error:", junctionsRes.error?.message);

    const categories = (catsRes.data || []) as Category[];

    // Build junction map: menu_item_id → category names
    const junctionMap = new Map<string, string[]>();
    if (junctionsRes.data) {
      for (const j of junctionsRes.data as any[]) {
        const catName = j.categories?.name || "Uncategorized";
        const existing = junctionMap.get(j.menu_item_id);
        if (existing) {
          if (!existing.includes(catName)) existing.push(catName);
        } else {
          junctionMap.set(j.menu_item_id, [catName]);
        }
      }
    }

    const menuItems: MenuItem[] = (itemsRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      imageName: row.name,
      branchId: row.branch_id ?? null,
      description: row.description,
      stock: row.stock ?? 0,
      categories: junctionMap.get(row.id) || ["Uncategorized"],
    }));

    return { menuItems, categories, error: null };
  } catch (err: any) {
    return { menuItems: [], categories: [], error: err.message || "Failed to load menu" };
  }
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const { branchId, loading: branchLoading } = useBranch();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMenu = useCallback(async () => {
    const result = await fetchMenuData(branchId);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setMenuItems(result.menuItems);
      setCategories(result.categories);
    }
  }, [branchId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await fetchMenuData(branchId);
      setError(result.error);
      setMenuItems(result.menuItems);
      setCategories(result.categories);
      setLoading(false);
    })();
  }, [branchId]);

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