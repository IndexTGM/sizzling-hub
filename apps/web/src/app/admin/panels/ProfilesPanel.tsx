"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingSkeleton, EmptyState } from "./shared";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone: string | null;
  created_at: string;
  branch_id: string | null;
}

interface BranchOption {
  id: string;
  name: string;
}

export default function ProfilesPanel({
  branchId,
  showBranchAssignment,
  currentUserRole,
  currentUserBranchId,
}: {
  branchId?: string | null;
  showBranchAssignment?: boolean;
  currentUserRole?: string;
  currentUserBranchId?: string | null;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchProfiles = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb
      .from("profiles")
      .select("id, first_name, last_name, email, role, phone, created_at, branch_id")
      .order("created_at", { ascending: false });
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Fetch branches for assignment dropdown (dev only)
  useEffect(() => {
    if (showBranchAssignment) {
      (async () => {
        const sb = createClient();
        const { data } = await sb.from("branches").select("id, name").order("name");
        if (data) setBranches(data);
      })();
    }
  }, [showBranchAssignment]);

  const isDev = currentUserRole === "dev";
  const isAdmin = currentUserRole === "admin";

  function getRoleOptions(profile: Profile): string[] {
    if (isDev) return ["customer", "admin", "dev"];
    // Admin: can only manage users in their own branch, only customer ↔ admin
    if (isAdmin && profile.branch_id === currentUserBranchId) {
      return ["customer", "admin"];
    }
    // Admin viewing users in other branches — no role options
    if (isAdmin && profile.branch_id !== currentUserBranchId) {
      return [profile.role]; // only current role (locked)
    }
    return ["customer", "admin", "dev"]; // fallback (shouldn't happen)
  }

  function canChangeRole(profile: Profile): boolean {
    if (isDev) return true;
    if (isAdmin && profile.branch_id === currentUserBranchId) return true;
    return false;
  }

  async function handleRoleChange(profileId: string, newRole: string) {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    // Safety: prevent admins from setting dev role
    if (isAdmin && newRole === "dev") return;
    // Safety: prevent changing roles outside own branch
    if (isAdmin && profile.branch_id !== currentUserBranchId) return;

    setSavingRoleId(profileId);
    const sb = createClient();
    await sb.from("profiles").update({ role: newRole }).eq("id", profileId);
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p)));
    setSavingRoleId(null);
  }

  async function handleBranchChange(profileId: string, newBranchId: string | null) {
    setSavingBranchId(profileId);
    const sb = createClient();
    const prev = profiles.find((p) => p.id === profileId);
    await sb
      .from("profiles")
      .update({ branch_id: newBranchId || null })
      .eq("id", profileId);
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, branch_id: newBranchId || null } : p))
    );
    setSavingBranchId(null);
  }

  let filtered = roleFilter === "all" ? profiles : profiles.filter((p) => p.role === roleFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 mt-0.5">{profiles.length} total users</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["all", "customer", "admin", "dev"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                roleFilter === r
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
              }`}
            >
              {r === "all"
                ? "All"
                : r === "customer"
                  ? "Customers"
                  : r === "admin"
                    ? "Admins"
                    : "Devs"}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No profiles found." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    {showBranchAssignment && <th className="px-4 py-3 font-semibold">Branch</th>}
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {`${p.first_name || ""} ${p.last_name || ""}`.trim() || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.email}</td>
                      <td className="px-4 py-3">
                        {savingRoleId === p.id ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
                            Saving…
                          </span>
                        ) : (
                          <select
                            value={p.role}
                            onChange={(e) => handleRoleChange(p.id, e.target.value)}
                            disabled={!canChangeRole(p)}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
                              !canChangeRole(p)
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : p.role === "dev"
                                  ? "bg-violet-50 text-violet-600 cursor-pointer"
                                  : p.role === "admin"
                                    ? "bg-red-50 text-red-600 cursor-pointer"
                                    : "bg-emerald-50 text-emerald-600 cursor-pointer"
                            }`}
                          >
                            {getRoleOptions(p).map((r) => (
                              <option key={r} value={r} className="bg-white">
                                {r === "customer" ? "Customer" : r === "admin" ? "Admin" : "Dev"}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      {showBranchAssignment && (
                        <td className="px-4 py-3">
                          {savingBranchId === p.id ? (
                            <span className="text-xs text-gray-400">Saving…</span>
                          ) : (
                            <select
                              value={p.branch_id || ""}
                              onChange={(e) =>
                                handleBranchChange(p.id, e.target.value || null)
                              }
                              className="text-xs font-semibold px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30"
                            >
                              <option value="">None</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                        {p.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {`${p.first_name || ""} ${p.last_name || ""}`.trim() || "—"}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{p.email}</p>
                  </div>
                  {savingRoleId === p.id ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
                      Saving…
                    </span>
                  ) : (
                    <select
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                      disabled={!canChangeRole(p)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
                        !canChangeRole(p)
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : p.role === "dev"
                            ? "bg-violet-50 text-violet-600 cursor-pointer"
                            : p.role === "admin"
                              ? "bg-red-50 text-red-600 cursor-pointer"
                              : "bg-emerald-50 text-emerald-600 cursor-pointer"
                      }`}
                    >
                      {getRoleOptions(p).map((r) => (
                        <option key={r} value={r} className="bg-white">
                          {r === "customer" ? "Customer" : r === "admin" ? "Admin" : "Dev"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {showBranchAssignment && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <span className="text-xs text-gray-400">Branch:</span>
                    {savingBranchId === p.id ? (
                      <span className="text-xs text-gray-400">Saving…</span>
                    ) : (
                      <select
                        value={p.branch_id || ""}
                        onChange={(e) => handleBranchChange(p.id, e.target.value || null)}
                        className="text-xs font-semibold px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      >
                        <option value="">None</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
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