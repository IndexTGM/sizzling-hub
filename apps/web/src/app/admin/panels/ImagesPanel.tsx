"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getImagePath, clearImageCache } from "@/lib/menu-data";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { LoadingSkeleton, EmptyState } from "./shared";

interface BranchOption {
  id: string;
  name: string;
}

export default function ImagesPanel({
  branchId,
  isDev,
}: {
  branchId?: string | null;
  isDev?: boolean;
}) {
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>(isDev ? "global" : branchId || "global");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);

  // Fetch branches for dev folder picker
  useEffect(() => {
    if (isDev) {
      (async () => {
        const sb = createClient();
        const { data } = await sb.from("branches").select("id, name").order("name");
        if (data) setBranches(data);
      })();
    }
  }, [isDev]);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    const prefix = selectedFolder;
    const { data } = await sb.storage.from("images").list(prefix);
    if (data) {
      setImages(
        data.map((f) => ({
          name: f.name,
          url: sb.storage.from("images").getPublicUrl(`${prefix}/${f.name}`).data.publicUrl,
        }))
      );
    } else {
      setImages([]);
    }
    setLoading(false);
  }, [selectedFolder]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Only images allowed.");
      return;
    }
    setUploading(true);
    const sb = createClient();
    const filePath = `${selectedFolder}/${file.name}`;
    const { error } = await sb.storage.from("images").upload(filePath, file);
    if (error) alert("Upload failed: " + error.message);
    setUploading(false);
    await fetchImages();
    e.target.value = "";
  }

  async function handleDelete(fullPath: string) {
    setDeleting(fullPath);
    const sb = createClient();
    const { error } = await sb.storage.from("images").remove([fullPath]);
    if (error) alert("Delete failed");
    setDeleting(null);
    setDeleteName(null);
    await fetchImages();
  }

  const deleteFullPath = deleteName ? `${selectedFolder}/${deleteName}` : null;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400 mt-0.5">{images.length} files</p>
          {/* Folder selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Folder:</span>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30"
            >
              {isDev && <option value="global">🌐 global/</option>}
              {isDev
                ? branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      🏢 {b.name}
                    </option>
                  ))
                : branchId && (
                    <option value={branchId}>🏢 Your Branch</option>
                  )}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              clearImageCache();
              alert("Image cache cleared.");
            }}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
          >
            🗑 Clear Cache
          </button>
          <label className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 cursor-pointer">
            {uploading ? "Uploading…" : "+ Upload Image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>
      {images.length === 0 ? (
        <EmptyState message="No images in this folder." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {images.map((img) => (
            <div
              key={img.name}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="w-full h-32 bg-gray-100 relative overflow-hidden">
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getImagePath("placeholder.png");
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => setDeleteName(img.name)}
                    disabled={deleting === `${selectedFolder}/${img.name}`}
                    className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center hover:bg-red-100"
                    title="Delete"
                  >
                    <svg
                      className="w-4 h-4 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                {deleting === `${selectedFolder}/${img.name}` && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">Deleting…</span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-600 truncate">{img.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={deleteName !== null}
        title="Delete Image"
        message={`Are you sure you want to delete "${selectedFolder}/${deleteName || ""}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => deleteFullPath && handleDelete(deleteFullPath)}
        onCancel={() => setDeleteName(null)}
      />
    </div>
  );
}