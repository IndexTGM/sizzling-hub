// Sizzling Hub — Multi-Branch Store Configuration
import { createClient } from "@/lib/supabase/client";

export interface BranchLocation {
  lat: number;
  lng: number;
  deliveryRadiusKm: number;
}

// Default fallback (Main branch)
export const DEFAULT_STORE_LOCATION: BranchLocation = {
  lat: 14.4566673,
  lng: 121.0446128,
  deliveryRadiusKm: 3,
};

// Legacy export for backward compatibility
export const STORE_LOCATION = { lat: DEFAULT_STORE_LOCATION.lat, lng: DEFAULT_STORE_LOCATION.lng };
export const MAX_DELIVERY_RADIUS_KM = DEFAULT_STORE_LOCATION.deliveryRadiusKm;

/**
 * Haversine formula to calculate straight-line distance between two lat/lng points.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Check if an address is within delivery range of a given branch */
export function isWithinDeliveryRange(
  branchLat: number,
  branchLng: number,
  branchRadiusKm: number,
  addrLat: number,
  addrLng: number
): { valid: boolean; distanceKm: number } {
  const distance = haversineDistance(branchLat, branchLng, addrLat, addrLng);
  return { valid: distance <= branchRadiusKm, distanceKm: distance };
}

// Cache branch location lookups by branch ID
const branchLocationCache = new Map<string, BranchLocation>();

/**
 * Fetch branch location data from the database by branch ID.
 * Falls back to DEFAULT_STORE_LOCATION if branch not found.
 */
export async function getBranchLocation(
  branchId: string
): Promise<BranchLocation> {
  const cached = branchLocationCache.get(branchId);
  if (cached) return cached;

  try {
    const sb = createClient();
    const { data } = await sb
      .from("branches")
      .select("lat, lng, delivery_radius_km")
      .eq("id", branchId)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      const result: BranchLocation = {
        lat: data.lat,
        lng: data.lng,
        deliveryRadiusKm: data.delivery_radius_km ?? 3,
      };
      branchLocationCache.set(branchId, result);
      return result;
    }
  } catch {
    // fall through to default
  }

  return DEFAULT_STORE_LOCATION;
}

/**
 * Clear the branch location cache (e.g., when branch data changes).
 */
export function clearBranchLocationCache(): void {
  branchLocationCache.clear();
}