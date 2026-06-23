"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBranch } from "@/lib/branch-context";
import AddressModal from "./AddressModal";

function isValidPHPhone(phone: string): boolean {
  const raw = phone.trim().replace(/[\s\-\(\)]/g, "");
  return /^(09\d{9}|\+639\d{9}|639\d{9})$/.test(raw);
}

export default function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, updateProfile } = useAuth();
  const { branchLocation } = useBranch();
  const [editUsername, setEditUsername] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [success, setSuccess] = useState("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  // Sync local state with user when modal opens or user changes
  useEffect(() => {
    if (open && user) {
      setEditUsername(user.username || "");
      setEditFirstName(user.first_name || "");
      setEditLastName(user.last_name || "");
      setEditPhone(user.phone || "");
    }
  }, [open, user]);

  if (!open) return null;

  function roleBadge(role: string) {
    console.log(role)
    if (role === "dev") return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-50 text-violet-600">🛠️ Dev</span>;
    if (role === "admin") return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-600">🛡️ Admin</span>;
    return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600">👤 Customer</span>;
  }

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
                {user && roleBadge(user.role)}
              </div>
              <p className="text-xs text-[#6b7280] truncate">{user?.email}</p>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setPhoneError("");
              setSuccess("");

              // Validate PH phone number if provided
              if (editPhone.trim() && !isValidPHPhone(editPhone)) {
                setPhoneError("Please enter a valid PH mobile number (e.g. 09171234567 or +639171234567)");
                return;
              }

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

            <label className="block text-sm font-semibold text-[#0a0a0a]">Phone Number</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => { setEditPhone(e.target.value); setPhoneError(""); }}
              placeholder="09171234567 or +639171234567"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 transition-all duration-150 ${
                phoneError ? "border-red-300 focus:ring-red-500/30 focus:border-red-400" : "border-[#e5e7eb] focus:ring-[#dc2626]/30 focus:border-[#dc2626]"
              }`}
            />
            {phoneError && <p className="text-xs text-red-500 font-medium">{phoneError}</p>}
            {!phoneError && editPhone.trim() && isValidPHPhone(editPhone) && (
              <p className="text-[10px] text-emerald-500 font-medium">✓ Valid PH number</p>
            )}

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