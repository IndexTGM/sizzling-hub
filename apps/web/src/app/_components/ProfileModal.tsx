"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBranch } from "@/lib/branch-context";
import { createClient } from "@/lib/supabase/client";
import AddressModal from "./AddressModal";
import ConfirmModal from "./ConfirmModal";

export default function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, updateProfile } = useAuth();
  const { branchLocation } = useBranch();
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editFirstName, setEditFirstName] = useState(user?.first_name || "");
  const [editLastName, setEditLastName] = useState(user?.last_name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [reviews, setReviews] = useState<{ id: string; menuItemId: string; menuItemName: string; rating: number; comment: string | null; createdAt: string }[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<{ reviewId: string; menuItemId: string } | null>(null);

  useEffect(() => {
    if (reviewsModalOpen && user) {
      setReviewsLoading(true);
      const sb = createClient();
      sb.from("reviews")
        .select("id, rating, comment, created_at, menu_item_id, menu_item:menu_items(name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          setReviews((data || []).map((r: any) => ({
            id: r.id,
            menuItemId: r.menu_item_id || "",
            menuItemName: r.menu_item?.name || "Unknown item",
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
          })));
          setReviewsLoading(false);
        });
    }
  }, [reviewsModalOpen, user]);

  async function handleDeleteReview(reviewId: string, menuItemId: string) {
    if (!user) return;
    setDeletingId(reviewId);
    const sb = createClient();
    const { error } = await sb.from("reviews").delete().eq("id", reviewId);
    if (error) {
      console.error("Failed to delete review:", error.message);
      setDeletingId(null);
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setDeletingId(null);
    // Recalculate the menu item rating
    if (menuItemId) {
      try { await sb.rpc("recalc_menu_item_rating", { p_menu_item_id: menuItemId }); } catch { /* ignore */ }
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-[#e5e7eb] w-full max-w-sm p-6 animate-fade-in-scale">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-lg text-[#0a0a0a]">Profile</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5 p-4 bg-[#f9fafb] rounded-xl">
            <div className="w-12 h-12 rounded-full bg-[#dc2626] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {user?.first_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-[#0a0a0a] truncate">@{user?.username}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${user?.role === "admin" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {user?.role === "admin" ? "🛡️ Admin" : "👤 Customer"}
                </span>
              </div>
              <p className="text-xs text-[#6b7280] truncate">{user?.email}</p>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setSuccess("");
              setLoading(true);
              const err = await updateProfile(editUsername, editFirstName, editLastName, editPhone || undefined);
              setLoading(false);
              if (err) {
                setError(err);
              } else {
                setSuccess("Profile updated successfully!");
                setTimeout(onClose, 1200);
              }
            }}
            className="space-y-3"
          >
            <label className="block text-sm font-semibold text-[#0a0a0a]">Username</label>
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="yourname"
              className="w-full px-4 py-2.5 rounded-lg border border-[#e5e7eb] text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all duration-150"
            />

            <label className="block text-sm font-semibold text-[#0a0a0a]">First Name</label>
            <input
              type="text"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              placeholder="Charles"
              className="w-full px-4 py-2.5 rounded-lg border border-[#e5e7eb] text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all duration-150"
            />

            <label className="block text-sm font-semibold text-[#0a0a0a]">Last Name</label>
            <input
              type="text"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              placeholder="Marquez"
              className="w-full px-4 py-2.5 rounded-lg border border-[#e5e7eb] text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all duration-150"
            />

            <label className="block text-sm font-semibold text-[#0a0a0a]">Phone Number <span className="text-[#9ca3af] font-normal">(optional)</span></label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="+639171234567"
              className="w-full px-4 py-2.5 rounded-lg border border-[#e5e7eb] text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all duration-150"
            />

            {error && <p className="text-xs text-[#dc2626] font-medium">{error}</p>}
            {success && <p className="text-xs text-[#16a34a] font-medium">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-bold text-white text-sm tracking-wide transition-all duration-200"
              style={{ backgroundColor: loading ? "#fca5a5" : "#dc2626" }}
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </form>

          {/* Reviews button */}
          <div className="mt-4 pt-4 border-t border-[#f3f4f6]">
            <button
              type="button"
              onClick={() => setReviewsModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              My Reviews
            </button>
          </div>

          {/* Manage Addresses button */}
          <div className="mt-4 pt-4 border-t border-[#f3f4f6]">
            <button
              type="button"
              onClick={() => setAddressModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Delivery Addresses
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      {reviewsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setReviewsModalOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
              <h3 className="text-lg font-extrabold text-[#0a0a0a]">My Reviews</h3>
              <button onClick={() => setReviewsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {reviewsLoading ? (
                <p className="text-sm text-[#9ca3af] text-center py-4">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-[#9ca3af] text-center py-4">No reviews yet.</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="flex items-start justify-between py-3 px-4 rounded-xl bg-[#f9fafb]">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1f2937]">{r.menuItemName}</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className="text-xs" style={{ color: s <= r.rating ? "#f59e0b" : "#d1d5db" }}>★</span>
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-[#4b5563] mt-1 leading-relaxed">{r.comment}</p>}
                      <p className="text-xs text-[#9ca3af] mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => setDeleteConfirmOpen({ reviewId: r.id, menuItemId: r.menuItemId })}
                      disabled={deletingId === r.id}
                      className="ml-3 px-2 py-1 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 flex-shrink-0 transition-colors"
                    >
                      {deletingId === r.id ? "..." : "Delete"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      <ConfirmModal
        open={deleteConfirmOpen !== null}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => {
          if (deleteConfirmOpen) {
            handleDeleteReview(deleteConfirmOpen.reviewId, deleteConfirmOpen.menuItemId);
            setDeleteConfirmOpen(null);
          }
        }}
        onCancel={() => setDeleteConfirmOpen(null)}
      />

      {/* Nested Address Modal */}
      <AddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        userId={user?.id || ""}
        branchLat={branchLocation.lat}
        branchLng={branchLocation.lng}
        branchRadiusKm={branchLocation.deliveryRadiusKm}
      />
    </>
  );
}