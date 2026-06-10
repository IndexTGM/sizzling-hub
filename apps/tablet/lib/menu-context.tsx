import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageName: string;
  category: string;
  categories: string[];
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
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      // Fetch items, categories, and the junction table in parallel
      const [itemsRes, catsRes, junctionRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select("id, name, price, image_url, stock, rating, description")
          .eq("is_available", true)
          .order("name"),
        supabase.from("categories").select("id, name").order("sort_order"),
        supabase
          .from("menu_item_categories")
          .select("menu_item_id, category_id, categories!inner(name)"),
      ]);

      const { data: items, error: itemsErr } = itemsRes;
      const { data: cats, error: catsErr } = catsRes;
      const { data: junctions, error: jnErr } = junctionRes;

      if (itemsErr) console.warn("menu_items fetch error:", itemsErr.message);
      if (catsErr) console.warn("categories fetch error:", catsErr.message);
      if (jnErr) console.warn("menu_item_categories fetch error:", jnErr.message);

      // Build junction map: menu_item_id → category names (mirrors apps/web)
      const junctionMap = new Map<string, string[]>();
      if (junctions) {
        for (const j of junctions as any[]) {
          const catName = j.categories?.name || "Uncategorized";
          const existing = junctionMap.get(j.menu_item_id);
          if (existing) {
            if (!existing.includes(catName)) existing.push(catName);
          } else {
            junctionMap.set(j.menu_item_id, [catName]);
          }
        }
      }

      if (cats) setCategories(cats);

      if (items && items.length > 0) {
        const mapped = items.map((r: any) => {
          const catNames = junctionMap.get(r.id) || ["Uncategorized"];
          return {
            id: r.id,
            name: r.name,
            price: r.price,
            imageName: r.image_url || "",
            stock: r.stock ?? 0,
            description: r.description || "",
            category: catNames[0],       // primary category for display
            categories: catNames,        // all categories for filtering
            categoryId: "",               // not needed with embedded names
            rating: r.rating ?? 0,
          };
        });
        console.log("[MenuProvider] Unique categories:", [...new Set(mapped.map((m) => m.category))].sort());
        setMenuItems(mapped);
      }
    } catch (err: any) {
      console.warn("MenuProvider fetchAll error:", err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <MenuContext.Provider
      value={{ menuItems, categories, loading, refresh: fetchAll }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextType {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}