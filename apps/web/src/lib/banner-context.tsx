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

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  tag: string | null;
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
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from("banners")
          .select("id, title, subtitle, image, tag, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (data) setBanners(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load banners");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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