"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, updateProfile } = useAuth();
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editName, setEditName] = useState(user?.fullName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
              {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-[#0a0a0a] truncate">@{user?.username}</p>
              <p className="text-xs text-[#6b7280] truncate">{user?.email}</p>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setSuccess("");
              setLoading(true);
              const err = await updateProfile(editUsername, editName);
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

            <label className="block text-sm font-semibold text-[#0a0a0a]">Display Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
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
        </div>
      </div>
    </>
  );
}