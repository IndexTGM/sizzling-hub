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
import type { BranchLocation } from "@/lib/store-config";
import { getBranchLocation, DEFAULT_STORE_LOCATION } from "@/lib/store-config";

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  lat: number;
  lng: number;
  deliveryRadiusKm: number;
  isActive: boolean;
}

interface BranchContextType {
  /** The currently selected branch */
  branch: Branch | null;
  /** All active branches for the picker */
  allBranches: Branch[];
  /** Current branch slug */
  branchSlug: string;
  /** Current branch ID */
  branchId: string | null;
  /** Branch location for delivery/distance checks */
  branchLocation: BranchLocation;
  /** Change the active branch */
  setBranchSlug: (slug: string) => void;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Refresh all branch data */
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | null>(null);

let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

function mapBranchRow(row: any): Branch {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    lat: row.lat,
    lng: row.lng,
    deliveryRadiusKm: row.delivery_radius_km ?? 3,
    isActive: row.is_active,
  };
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [branchSlug, setBranchSlugState] = useState<string>("main");
  const [branchLocation, setBranchLocation] = useState<BranchLocation>(DEFAULT_STORE_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On first mount, read branch slug from URL search params or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSlug = params.get("branch");
    if (urlSlug) {
      localStorage.setItem("sizzling_hub_branch", urlSlug);
      setBranchSlugState(urlSlug);
    } else {
      const stored = localStorage.getItem("sizzling_hub_branch");
      if (stored) {
        setBranchSlugState(stored);
      }
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const sb = getSupabase();
      const { data } = await sb
        .from("branches")
        .select("id, name, slug, address, phone, email, lat, lng, delivery_radius_km, is_active")
        .eq("is_active", true)
        .order("name");

      if (data) {
        const branches = data.map(mapBranchRow);
        setAllBranches(branches);
        return branches;
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load branches");
    }
    return [];
  }, []);

  // Resolve branch from slug
  useEffect(() => {
    (async () => {
      setLoading(true);
      const branches = allBranches.length > 0 ? allBranches : await fetchBranches();
      const found = branches.find((b) => b.slug === branchSlug) ?? branches.find((b) => b.slug === "main") ?? branches[0] ?? null;
      setBranch(found);
      if (found) {
        const loc = await getBranchLocation(found.slug);
        setBranchLocation(loc);
      }
      setLoading(false);
    })();
  }, [branchSlug, allBranches.length]);

  const setBranchSlug = useCallback((slug: string) => {
    localStorage.setItem("sizzling_hub_branch", slug);
    setBranchSlugState(slug);
  }, []);

  const refreshBranches = useCallback(async () => {
    setLoading(true);
    const branches = await fetchBranches();
    const found = branches.find((b) => b.slug === branchSlug) ?? branches.find((b) => b.slug === "main") ?? branches[0] ?? null;
    setBranch(found);
    setLoading(false);
  }, [branchSlug]);

  const branchId = branch?.id ?? null;

  return (
    <BranchContext.Provider
      value={{
        branch,
        allBranches,
        branchSlug,
        branchId,
        branchLocation,
        setBranchSlug,
        loading,
        error,
        refreshBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextType {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}