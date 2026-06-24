import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export interface Branch {
  id: string;
  name: string;
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

const BRANCH_STORAGE_KEY = "sizzling_hub_branch_id";

interface BranchContextType {
  branch: Branch | null;
  allBranches: Branch[];
  branchId: string | null;
  branchLocation: BranchLocation;
  setBranchId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | null>(null);

function mapBranchRow(row: any): Branch {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    lat: row.lat,
    lng: row.lng,
    deliveryRadiusKm: row.delivery_radius_km ?? 3,
    isActive: row.is_active,
  };
}

async function getCachedBranchId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(BRANCH_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function fetchBranchLocation(id: string): Promise<BranchLocation> {
  try {
    const { data } = await supabase
      .from("branches")
      .select("lat, lng, delivery_radius_km")
      .eq("id", id)
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
  const [branchId, setBranchIdState] = useState<string | null>(null);
  const [branchLocation, setBranchLocation] = useState<BranchLocation>(DEFAULT_STORE_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached branch id on mount
  useEffect(() => {
    (async () => {
      const cached = await getCachedBranchId();
      setBranchIdState(cached);
    })();
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name, address, phone, email, lat, lng, delivery_radius_km, is_active")
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

  // Resolve branch from ID
  useEffect(() => {
    (async () => {
      setLoading(true);
      const branches = allBranches.length > 0 ? allBranches : await fetchBranches();
      let found: Branch | null = null;
      if (branchId) {
        found = branches.find((b) => b.id === branchId) ?? null;
      }
      // If no stored branch or not found, use first branch
      if (!found) {
        found = branches[0] ?? null;
        if (found) {
          setBranchIdState(found.id);
          AsyncStorage.setItem(BRANCH_STORAGE_KEY, found.id).catch(() => {});
        }
      }
      setBranch(found);
      if (found) {
        const loc = await fetchBranchLocation(found.id);
        setBranchLocation(loc);
      } else {
        setBranchLocation(DEFAULT_STORE_LOCATION);
      }
      setLoading(false);
    })();
  }, [branchId, allBranches.length]);

  const handleSetBranchId = useCallback((id: string) => {
    AsyncStorage.setItem(BRANCH_STORAGE_KEY, id).catch(() => {});
    setBranchIdState(id);
  }, []);

  const refreshBranches = useCallback(async () => {
    setLoading(true);
    const branches = await fetchBranches();
    const found = branchId ? branches.find((b) => b.id === branchId) ?? null : branches[0] ?? null;
    if (found && found.id !== branchId) {
      setBranchIdState(found.id);
      AsyncStorage.setItem(BRANCH_STORAGE_KEY, found.id).catch(() => {});
    }
    setBranch(found);
    setLoading(false);
  }, [branchId]);

  return (
    <BranchContext.Provider
      value={{
        branch,
        allBranches,
        branchId,
        branchLocation,
        setBranchId: handleSetBranchId,
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