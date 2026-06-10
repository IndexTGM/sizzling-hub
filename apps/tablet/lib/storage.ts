import { supabase } from "./supabase";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"] as const;

/**
 * Get a public URL from Supabase Storage for a base name.
 * Tries the baseName as-is first, then tries appending common extensions.
 */
export function getImageUrl(baseName: string): string {
  // If baseName already has a known extension, use it directly
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(baseName)) {
    return supabase.storage.from("images").getPublicUrl(baseName).data.publicUrl;
  }

  // Try .png as default (most common), with fallback URLs for others via <Image> onError
  return supabase.storage.from("images").getPublicUrl(`${baseName}.png`).data.publicUrl;
}

/**
 * Build candidate URLs for all extensions for a given base name.
 * Use these to try loading until one succeeds.
 */
export function getImageCandidates(baseName: string): string[] {
  const clean = baseName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
  return IMAGE_EXTENSIONS.map((ext) =>
    supabase.storage.from("images").getPublicUrl(`${clean}${ext}`).data.publicUrl
  );
}