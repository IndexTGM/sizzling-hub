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
  /** Current branch ID */
  branchId: string | null;
  /** Branch location for delivery/distance checks */
  branchLocation: BranchLocation;
  /** Change the active branch */
  setBranchId: (id: string) => void;
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
  // Initialize branchId synchronously from localStorage to avoid null→value flicker
  const getInitialBranchId = (): string | null => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("branch");
    if (urlId) {
      localStorage.setItem("sizzling_hub_branch_id", urlId);
      return urlId;
    }
    return localStorage.getItem("sizzling_hub_branch_id");
  };

  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [branchId, setBranchIdState] = useState<string | null>(getInitialBranchId);
  const [branchLocation, setBranchLocation] = useState<BranchLocation>(DEFAULT_STORE_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      const sb = getSupabase();
      const { data } = await sb
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
          localStorage.setItem("sizzling_hub_branch_id", found.id);
        }
      }
      setBranch(found);
      if (found) {
        const loc = await getBranchLocation(found.id);
        setBranchLocation(loc);
      }
      setLoading(false);
    })();
  }, [branchId, allBranches.length]);

  const handleSetBranchId = useCallback((id: string) => {
    localStorage.setItem("sizzling_hub_branch_id", id);
    setBranchIdState(id);
  }, []);

  const refreshBranches = useCallback(async () => {
    setLoading(true);
    const branches = await fetchBranches();
    const found = branchId ? branches.find((b) => b.id === branchId) ?? branches[0] ?? null : branches[0] ?? null;
    if (found && found.id !== branchId) {
      setBranchIdState(found.id);
      localStorage.setItem("sizzling_hub_branch_id", found.id);
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