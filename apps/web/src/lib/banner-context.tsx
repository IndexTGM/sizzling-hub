"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useBranch } from "@/lib/branch-context";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  sort_order: number;
  is_active: boolean;
}

interface BannerContextType {
  banners: Banner[];
  loading: boolean;
  error: string | null;
}

const BannerContext = createContext<BannerContextType | null>(null);

let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

export function BannerProvider({ children }: { children: ReactNode }) {
  const { branchId } = useBranch();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        let query = sb
          .from("banners")
          .select("id, title, subtitle, image, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (branchId) {
          query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data } = await query;
        if (data) setBanners(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load banners");
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  return (
    <BannerContext.Provider value={{ banners, loading, error }}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBanners(): BannerContextType {
  const ctx = useContext(BannerContext);
  if (!ctx) throw new Error("useBanners must be used within BannerProvider");
  return ctx;
}