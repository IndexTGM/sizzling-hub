"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit-log";
import { LoadingSkeleton, EmptyState } from "./shared";

interface Profile {
  id: string; full_name: string; email: string; role: string; phone: string | null; created_at: string;
}

export default function ProfilesPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const fetchProfiles = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("profiles").select("id, full_name, email, role, phone, created_at").order("created_at", { ascending: false });
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }, []);
  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  async function handleRoleChange(profileId: string, newRole: string) {
    setSavingRoleId(profileId);
    const sb = createClient(); const prev = profiles.find((p) => p.id === profileId);
    await sb.from("profiles").update({ role: newRole }).eq("id", profileId);
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p)));
    setSavingRoleId(null);
    logAudit({ action: "update_role", entity_type: "profile", entity_id: profileId, details: { from: prev?.role, to: newRole } });
  }
  let filtered = roleFilter === "all" ? profiles : profiles.filter((p) => p.role === roleFilter);
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter((p) => p.full_name?.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)); }
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 mt-0.5">{profiles.length} total users</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["all", "customer", "admin"] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${roleFilter === r ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}>{r === "all" ? "All" : r === "customer" ? "Customers" : "Admins"}</button>
          ))}
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email..." className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300" />
      </div>
      {filtered.length === 0 ? <EmptyState message="No profiles found." /> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Role</th><th className="px-4 py-3 font-semibold hidden sm:table-cell">Phone</th><th className="px-4 py-3 font-semibold hidden md:table-cell">Joined</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.full_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email}</td>
                  <td className="px-4 py-3">{savingRoleId === p.id ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">Saving…</span> : (
                    <select value={p.role} onChange={(e) => handleRoleChange(p.id, e.target.value)} className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30 ${p.role === "admin" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                      <option value="customer" className="bg-white">Customer</option><option value="admin" className="bg-white">Admin</option>
                    </select>
                  )}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{p.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{p.full_name || "—"}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{p.email}</p>
                  </div>
                  {savingRoleId === p.id ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">Saving…</span>
                  ) : (
                    <select value={p.role} onChange={(e) => handleRoleChange(p.id, e.target.value)} className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30 ${p.role === "admin" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                      <option value="customer" className="bg-white">Customer</option>
                      <option value="admin" className="bg-white">Admin</option>
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-2">
                  {p.phone && <span>📞 {p.phone}</span>}
                  <span>Joined {new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}