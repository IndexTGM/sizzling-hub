// Ben's Tapsihan store location
export const STORE_LOCATION = { lat: 14.4566673, lng: 121.0446128 };
export const MAX_DELIVERY_RADIUS_KM = 3;

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

/** Check if an address is within delivery range */
export function isWithinDeliveryRange(
  addrLat: number,
  addrLng: number
): { valid: boolean; distanceKm: number } {
  const distance = haversineDistance(
    STORE_LOCATION.lat,
    STORE_LOCATION.lng,
    addrLat,
    addrLng
  );
  return { valid: distance <= MAX_DELIVERY_RADIUS_KM, distanceKm: distance };
}