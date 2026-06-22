import { supabase } from "./supabase";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"] as const;

/**
 * Get a public URL from Supabase Storage for a base name.
 * Supports branch-scoped paths: {branchId}/name.ext or global/name.ext
 */
export function getImageUrl(baseName: string, branchId?: string | null): string {
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(baseName)) {
    return supabase.storage.from("images").getPublicUrl(baseName).data.publicUrl;
  }
  const prefix = branchId || "global";
  return supabase.storage.from("images").getPublicUrl(`${prefix}/${baseName}.png`).data.publicUrl;
}

/**
 * Build candidate URLs for all extensions for a given base name.
 * Tries branch-specific paths first, then global fallback.
 */
export function getImageCandidates(baseName: string, branchId?: string | null): string[] {
  const clean = baseName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
  const prefixes = branchId ? [branchId, "global"] : ["global"];

  const urls: string[] = [];
  for (const prefix of prefixes) {
    for (const ext of IMAGE_EXTENSIONS) {
      urls.push(supabase.storage.from("images").getPublicUrl(`${prefix}/${clean}${ext}`).data.publicUrl);
    }
  }
  return urls;
}