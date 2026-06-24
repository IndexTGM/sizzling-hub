import { supabase } from "./supabase";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"] as const;

/**
 * Build candidate image URLs for a given base name.
 * Tries branch-specific path first, then falls back to global — matching web behavior.
 * Path structure: images/{branchId}/{baseName}.{ext} or images/global/{baseName}.{ext}
 */
export function getImageCandidates(baseName: string, branchId?: string | null): string[] {
  const clean = baseName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");

  // Branch-specific first, then global fallback
  const prefixes = branchId ? [branchId, "global"] : ["global"];

  const urls: string[] = [];
  for (const prefix of prefixes) {
    for (const ext of IMAGE_EXTENSIONS) {
      const url = supabase.storage
        .from("images")
        .getPublicUrl(`${prefix}/${clean}${ext}`).data.publicUrl;
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Get a single public URL from Supabase Storage for a base name.
 * Tries branch-specific first, defaults to .png extension.
 * @deprecated Prefer getImageCandidates which tries multiple extensions and falls back to global.
 */
export function getImageUrl(baseName: string, branchId?: string | null): string {
  const clean = baseName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
  const prefix = branchId ? `${branchId}` : "global";
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(baseName)) {
    const ext = baseName.split(".").pop();
    return supabase.storage.from("images").getPublicUrl(`${prefix}/${clean}.${ext}`).data.publicUrl;
  }
  return supabase.storage.from("images").getPublicUrl(`${prefix}/${clean}.png`).data.publicUrl;
}