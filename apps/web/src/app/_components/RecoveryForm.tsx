"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import InputField from "./InputField";

export default function RecoveryForm() {
  const { updatePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters long."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const err = await updatePassword(newPassword);
    setLoading(false);
    if (err) setError(err);
    else setSuccess("Password updated successfully! You can now log in.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-fade-in">
          <img src="/images/logo.png" alt="Sizzling Hub" className="w-20 h-20 mx-auto mb-4 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder.png"; }} />
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "#dc2626" }}>SIZZLING HUB</h1>
          <p className="text-[#6b7280] mt-2 text-sm font-medium tracking-wide">Set your new password</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e7eb] p-8 animate-slide-up">
          {error && <div className="mb-4 p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-sm font-medium animate-fade-in">{error}</div>}
          {success && <div className="mb-4 p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-sm font-medium animate-fade-in">{success}</div>}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField label="New Password" type="password" value={newPassword} onChange={setNewPassword} placeholder="Min. 8 characters" />
              <InputField label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" />
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                style={{ backgroundColor: loading ? "#fca5a5" : "#dc2626" }}>{loading ? "Updating…" : "Update Password"}</button>
            </form>
          )}
          {success && (
            <button onClick={logout} className="w-full py-3 rounded-xl font-bold text-[#dc2626] text-sm tracking-wide transition-all duration-200 border-2 border-[#dc2626] hover:bg-[#fef2f2] mt-2">Go to Login</button>
          )}
        </div>
      </div>
    </div>
  );
}