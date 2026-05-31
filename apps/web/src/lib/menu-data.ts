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
 */
export function getImageCandidates(baseName: string): string[] {
  // Strip any existing image extension so we always append cleanly
  const clean = baseName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
  const sb = createClient();
  return IMAGE_EXTENSIONS.map(
    (ext) => sb.storage.from("images").getPublicUrl(`${clean}${ext}`).data.publicUrl
  );
}
