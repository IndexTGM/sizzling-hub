import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

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

export interface BranchLocation {
  lat: number;
  lng: number;
  deliveryRadiusKm: number;
}

export const DEFAULT_STORE_LOCATION: BranchLocation = {
  lat: 14.4566673,
  lng: 121.0446128,
  deliveryRadiusKm: 3,
};

const BRANCH_STORAGE_KEY = "sizzling_hub_branch";

interface BranchContextType {
  branch: Branch | null;
  allBranches: Branch[];
  branchSlug: string;
  branchId: string | null;
  branchLocation: BranchLocation;
  setBranchSlug: (slug: string) => void;
  loading: boolean;
  error: string | null;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | null>(null);

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

async function getCachedBranchSlug(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(BRANCH_STORAGE_KEY);
    return stored || "main";
  } catch {
    return "main";
  }
}

async function fetchBranchLocation(slug: string): Promise<BranchLocation> {
  try {
    const { data } = await supabase
      .from("branches")
      .select("lat, lng, delivery_radius_km")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      return {
        lat: data.lat,
        lng: data.lng,
        deliveryRadiusKm: data.delivery_radius_km ?? 3,
      };
    }
  } catch { /* fall through */ }
  return DEFAULT_STORE_LOCATION;
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [branchSlug, setBranchSlugState] = useState<string>("main");
  const [branchLocation, setBranchLocation] = useState<BranchLocation>(DEFAULT_STORE_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached branch slug on mount
  useEffect(() => {
    (async () => {
      const slug = await getCachedBranchSlug();
      setBranchSlugState(slug);
    })();
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const { data } = await supabase
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
        const loc = await fetchBranchLocation(found.slug);
        setBranchLocation(loc);
      } else {
        setBranchLocation(DEFAULT_STORE_LOCATION);
      }
      setLoading(false);
    })();
  }, [branchSlug, allBranches.length]);

  const setBranchSlug = useCallback(async (slug: string) => {
    try {
      await AsyncStorage.setItem(BRANCH_STORAGE_KEY, slug);
    } catch { /* ignore */ }
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