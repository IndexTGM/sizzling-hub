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
 * Default image transformation parameters to reduce payload size.
 * Supabase Storage supports `width`, `height`, `quality`, and `format`.
 * https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100, default 80
  format?: "webp" | "png" | "jpg"; // webp is ~30% smaller than jpg
}

const DEFAULT_TRANSFORM: ImageTransformOptions = {
  width: 600,
  quality: 75,
  format: "webp",
};

/**
 * Build query params string for Supabase image transformation.
 */
function buildTransformParams(opts: ImageTransformOptions): string {
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  if (opts.quality) params.set("quality", String(opts.quality));
  if (opts.format) params.set("format", opts.format);
  return params.toString();
}

/**
 * In-memory cache: baseName → resolved Supabase Storage URL.
 * Once an image loads, we store the winning URL so subsequent renders
 * skip the trial-and-error loop.
 */
const resolvedUrlCache = new Map<string, string>();

// --- sessionStorage persistence so cache survives page reloads ---
const STORAGE_CACHE_KEY = "sizzling_img_cache";

function loadCacheFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_CACHE_KEY);
    if (raw) {
      const entries: [string, string][] = JSON.parse(raw);
      for (const [k, v] of entries) {
        resolvedUrlCache.set(k, v);
      }
    }
  } catch {
    /* ignore parse errors */
  }
}

function saveCacheToStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_CACHE_KEY,
      JSON.stringify(Array.from(resolvedUrlCache.entries()))
    );
  } catch {
    /* ignore quota / serialize errors */
  }
}

// Hydrate cache from sessionStorage on first import (client-side only)
loadCacheFromStorage();

/**
 * Store a successful URL in the cache for fast subsequent lookups.
 */
export function cacheResolvedUrl(baseName: string, url: string): void {
  const clean = baseName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
  // Store the clean base URL (strip transform params) so cache keys are stable
  const urlBase = url.split("?")[0];
  resolvedUrlCache.set(clean, urlBase);
  saveCacheToStorage();
}

/**
 * Get a single public URL from Supabase Storage for an exact filename,
 * with image transformation params applied.
 */
export function getImagePath(
  imageName: string,
  transform?: ImageTransformOptions
): string {
  const sb = createClient();
  const baseUrl = sb.storage
    .from("images")
    .getPublicUrl(imageName).data.publicUrl;
  const params = buildTransformParams(transform ?? DEFAULT_TRANSFORM);
  return params ? `${baseUrl}?${params}` : baseUrl;
}

/**
 * Given a base name (with or without extension), strips any existing extension
 * and returns an array of full Supabase Storage URLs for each file extension to try.
 * The caller can attempt them in order until one loads.
 *
 * If the baseName has a cached resolved URL, returns only that single URL
 * (with transform params applied).
 */
export function getImageCandidates(
  baseName: string,
  transform?: ImageTransformOptions
): string[] {
  const clean = baseName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");

  // Return cached URL (with transforms) if we already know the extension
  if (resolvedUrlCache.has(clean)) {
    const baseUrl = resolvedUrlCache.get(clean)!;
    const params = buildTransformParams(transform ?? DEFAULT_TRANSFORM);
    return [params ? `${baseUrl}?${params}` : baseUrl];
  }

  const sb = createClient();
  const params = buildTransformParams(transform ?? DEFAULT_TRANSFORM);
  return IMAGE_EXTENSIONS.map((ext) => {
    const url = sb.storage
      .from("images")
      .getPublicUrl(`${clean}${ext}`).data.publicUrl;
    return params ? `${url}?${params}` : url;
  });
}

/**
 * Clear the cache (useful if images are re-uploaded with different extensions).
 */
export function clearImageCache(): void {
  resolvedUrlCache.clear();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
}
