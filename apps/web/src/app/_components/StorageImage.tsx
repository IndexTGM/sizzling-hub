"use client";

import { useState, useEffect, useRef } from "react";
import { getImageCandidates, getImagePath, cacheResolvedUrl } from "@/lib/menu-data";

interface StorageImageProps {
  imageBaseName: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Tries multiple image extensions from Supabase Storage until one loads.
 * Falls back to a placeholder image if no candidate succeeds.
 */
export default function StorageImage({
  imageBaseName,
  alt,
  className,
  fallbackSrc = getImagePath("placeholder.png"),
  onLoad,
  onError,
}: StorageImageProps) {
  const [src, setSrc] = useState("");
  const [errored, setErrored] = useState(false);
  const candidatesRef = useRef<string[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    // Reset state when imageBaseName changes
    setErrored(false);
    candidatesRef.current = getImageCandidates(imageBaseName);
    indexRef.current = 0;
    if (candidatesRef.current.length > 0) {
      setSrc(candidatesRef.current[0]);
    } else {
      setSrc(fallbackSrc);
    }
  }, [imageBaseName, fallbackSrc]);

  function handleError() {
    indexRef.current++;
    if (indexRef.current < candidatesRef.current.length) {
      setSrc(candidatesRef.current[indexRef.current]);
    } else {
      setErrored(true);
      setSrc(fallbackSrc);
      onError?.();
    }
  }

  function handleLoad() {
    // Cache the winning URL so subsequent renders skip the trial-and-error loop
    cacheResolvedUrl(imageBaseName, src);
    onLoad?.();
  }

  if (errored) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}