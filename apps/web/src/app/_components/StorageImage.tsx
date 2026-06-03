"use client";

import { useState, useEffect, useRef } from "react";
import {
  getImageCandidates,
  getImagePath,
  cacheResolvedUrl,
  clearImageCache,
  type ImageTransformOptions,
} from "@/lib/menu-data";

interface StorageImageProps {
  imageBaseName: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  /** Preload this image aggressively (above-the-fold content). Sets fetchpriority="high". */
  priority?: boolean;
  /** Override default transform options (width=600, quality=75, format=webp) */
  transform?: ImageTransformOptions;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Tries multiple image extensions from Supabase Storage until one loads.
 * Falls back to a placeholder image if no candidate succeeds.
 *
 * Optimizations:
 * - Supabase image transforms for reduced payload
 * - In-memory + sessionStorage URL cache to skip trial-and-error on revisit
 * - decoding="async" to prevent render-blocking
 * - Priority loading for above-the-fold images
 */
export default function StorageImage({
  imageBaseName,
  alt,
  className,
  fallbackSrc = getImagePath("placeholder.png"),
  priority = false,
  transform,
  onLoad,
  onError,
}: StorageImageProps) {
  const [src, setSrc] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const candidatesRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const wasCachedRef = useRef(false); // track if we started from a cached URL

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    candidatesRef.current = getImageCandidates(imageBaseName, transform);
    indexRef.current = 0;
    // If only 1 candidate, it's a cached URL — flag it so we can retry on failure
    wasCachedRef.current = candidatesRef.current.length === 1;
    if (candidatesRef.current.length > 0) {
      setSrc(candidatesRef.current[0]);
    } else {
      setSrc(fallbackSrc);
    }
  }, [imageBaseName, fallbackSrc, transform]);

  function handleError() {
    indexRef.current++;
    if (indexRef.current < candidatesRef.current.length) {
      setSrc(candidatesRef.current[indexRef.current]);
    } else if (wasCachedRef.current) {
      // Cached URL failed (file was deleted/replaced) — clear cache & retry all
      clearImageCache();
      wasCachedRef.current = false;
      candidatesRef.current = getImageCandidates(imageBaseName, transform);
      indexRef.current = 0;
      if (candidatesRef.current.length > 0) {
        setSrc(candidatesRef.current[0]);
      } else {
        setErrored(true);
        setSrc(fallbackSrc);
        onError?.();
      }
    } else {
      setErrored(true);
      setSrc(fallbackSrc);
      onError?.();
    }
  }

  function handleLoad() {
    cacheResolvedUrl(imageBaseName, src);
    setLoaded(true);
    onLoad?.();
  }

  if (errored) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  // Shimmer placeholder while image URL hasn't resolved yet
  if (!src) {
    return (
      <div className={`relative overflow-hidden bg-[#f3f4f6] ${className ?? ""}`}>
        <div className="absolute inset-0 animate-shimmer" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${loaded ? "" : "bg-[#f3f4f6]"}`}>
      {/* Shimmer overlay — fades out once loaded */}
      {!loaded && !errored && (
        <div className="absolute inset-0 z-10 animate-shimmer" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className ?? ""} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" } as Record<string, string> : {})}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
