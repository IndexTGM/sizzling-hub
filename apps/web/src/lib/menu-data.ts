import { createClient } from "@/lib/supabase/client";

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  imageName: string;
  description?: string;
  rating?: number;
  stock?: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

/**
 * In-memory cache: baseName → resolved Supabase Storage URL.
 * Once an image loads, we store the winning URL so subsequent renders
 * skip the trial-and-error loop.
 */
const resolvedUrlCache = new Map<string, string>();

/**
 * Store a successful URL in the cache for fast subsequent lookups.
 */
export function cacheResolvedUrl(baseName: string, url: string): void {
  resolvedUrlCache.set(baseName, url);
}

/**
 * Get a single public URL from Supabase Storage for an exact filename.
 */
export function getImagePath(imageName: string): string {
  const sb = createClient();
  return sb.storage.from("images").getPublicUrl(imageName).data.publicUrl;
}

/**
 * Given a base name (with or without extension), strips any existing extension
 * and returns an array of full Supabase Storage URLs for each file extension to try.
 * The caller can attempt them in order until one loads.
 *
 * If the baseName has a cached resolved URL, returns only that single URL.
 */
export function getImageCandidates(baseName: string): string[] {
  const clean = baseName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");

  // Return cached URL if we already know which extension works
  if (resolvedUrlCache.has(clean)) {
    return [resolvedUrlCache.get(clean)!];
  }

  const sb = createClient();
  return IMAGE_EXTENSIONS.map(
    (ext) => sb.storage.from("images").getPublicUrl(`${clean}${ext}`).data.publicUrl
  );
}

/**
 * Clear the cache (useful if images are re-uploaded with different extensions).
 */
export function clearImageCache(): void {
  resolvedUrlCache.clear();
}
