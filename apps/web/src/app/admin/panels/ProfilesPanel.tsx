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

  const isDev = currentUserRole === "dev";
  const isAdmin = currentUserRole === "admin";

  // Fetch branches for assignment dropdown (dev) and branch name display (admin)
  useEffect(() => {
    if (showBranchAssignment || isAdmin) {
      (async () => {
        const sb = createClient();
        const { data } = await sb.from("branches").select("id, name").order("name");
        if (data) setBranches(data);
      })();
    }
  }, [showBranchAssignment, isAdmin]);

  // Admin can see the branch column (read-only) in addition to dev seeing it as editable
  const showBranchColumn = showBranchAssignment || isAdmin;

  function getRoleOptions(profile: Profile): string[] {
    if (isDev) return ["customer", "admin", "dev"];
    if (!isAdmin) return [profile.role];
    // Admin viewing a dev — no options
    if (profile.role === "dev") return ["dev"];
    // Admin viewing a customer (any branch or no branch) — can promote to admin
    if (profile.role === "customer") return ["customer", "admin"];
    // Admin viewing another admin — only editable if same branch
    if (profile.role === "admin" && profile.branch_id === currentUserBranchId) {
      return ["customer", "admin"];
    }
    // Admin viewing another admin in different branch — locked
    return ["admin"];
  }

  function canChangeRole(profile: Profile): boolean {
    if (isDev) return true;
    if (!isAdmin) return false;
    // Dev role is never editable by admin
    if (profile.role === "dev") return false;
    // Customers are always editable by admins (can promote)
    if (profile.role === "customer") return true;
    // Other admins: only editable if same branch
    if (profile.role === "admin" && profile.branch_id === currentUserBranchId) return true;
    return false;
  }

  async function handleRoleChange(profileId: string, newRole: string) {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    // Safety: prevent admins from setting dev role
    if (isAdmin && newRole === "dev") return;
    // Safety: prevent admins from changing other branch admins
    if (isAdmin && profile.role === "admin" && profile.branch_id !== currentUserBranchId) return;
    // Prevent changing devs
    if (isAdmin && profile.role === "dev") return;

    setSavingRoleId(profileId);
    const sb = createClient();

    // When admin promotes a customer to admin, auto-assign to the admin's branch
    if (isAdmin && newRole === "admin" && profile.role === "customer") {
      await sb.from("profiles").update({
        role: newRole,
        branch_id: currentUserBranchId,
      }).eq("id", profileId);
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, role: newRole, branch_id: currentUserBranchId ?? null } : p
        )
      );
    // When admin demotes an admin to customer, remove branch assignment
    } else if (isAdmin && newRole === "customer" && profile.role === "admin") {
      await sb.from("profiles").update({
        role: newRole,
        branch_id: null,
      }).eq("id", profileId);
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, role: newRole, branch_id: null } : p
        )
      );
    } else {
      await sb.from("profiles").update({ role: newRole }).eq("id", profileId);
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p)));
    }
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

  // Role counts for filter badges
  const roleCounts: Record<string, number> = {};
  for (const r of ["customer", "admin", "dev"]) roleCounts[r] = profiles.filter((p) => p.role === r).length;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-400"><span className="font-bold text-gray-600">{profiles.length}</span> total users</p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 w-full sm:w-56"
        />
      </div>

      {/* ── Role Filters ── */}
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setRoleFilter("all")} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${roleFilter === "all" ? "bg-red-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
          All ({profiles.length})
        </button>
        {(["customer", "admin", "dev"] as const).map((r) => (
          <button key={r} onClick={() => setRoleFilter(r)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${roleFilter === r ? "bg-red-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            {r === "customer" ? "Customers" : r === "admin" ? "Admins" : "Devs"} ({roleCounts[r] || 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? "No profiles match your search." : "No profiles found."} />
      ) : (
        <>
          {/* Desktop table — scrollable container with sticky header */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-left text-[10px] uppercase text-gray-400 tracking-wider shadow-sm">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Email</th>
                    <th className="px-4 py-2.5 font-semibold">Role</th>
                     {showBranchColumn && <th className="px-4 py-2.5 font-semibold">Branch</th>}
                    <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-gray-800 text-xs">
                        {`${p.first_name || ""} ${p.last_name || ""}`.trim() || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{p.email}</td>
                      <td className="px-4 py-2.5">
                        {savingRoleId === p.id ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400">
                            Saving…
                          </span>
                        ) : (
                          <select
                            value={p.role}
                            onChange={(e) => handleRoleChange(p.id, e.target.value)}
                            disabled={!canChangeRole(p)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
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
                      {showBranchColumn && (
                        <td className="px-4 py-2.5">
                          {savingBranchId === p.id ? (
                            <span className="text-[10px] text-gray-400">Saving…</span>
                          ) : showBranchAssignment ? (
                            <select
                              value={p.branch_id || ""}
                              onChange={(e) =>
                                handleBranchChange(p.id, e.target.value || null)
                              }
                              className="text-[10px] font-semibold px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30"
                            >
                              <option value="">None</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] text-gray-500">
                              {p.branch_id
                                ? (branches.find((b) => b.id === p.branch_id)?.name || p.branch_id)
                                : "—"}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-gray-400 text-xs hidden sm:table-cell">
                        {p.phone || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-[10px] hidden md:table-cell">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards — scrollable container */}
          <div className="md:hidden overflow-auto max-h-[60vh] space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {`${p.first_name || ""} ${p.last_name || ""}`.trim() || "—"}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.email}</p>
                  </div>
                  {savingRoleId === p.id ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400">
                      Saving…
                    </span>
                  ) : (
                    <select
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                      disabled={!canChangeRole(p)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
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
                {showBranchColumn && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">Branch:</span>
                    {savingBranchId === p.id ? (
                      <span className="text-[10px] text-gray-400">Saving…</span>
                    ) : showBranchAssignment ? (
                      <select
                        value={p.branch_id || ""}
                        onChange={(e) => handleBranchChange(p.id, e.target.value || null)}
                        className="text-[10px] font-semibold px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      >
                        <option value="">None</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[10px] text-gray-500">
                        {p.branch_id
                          ? (branches.find((b) => b.id === p.branch_id)?.name || p.branch_id)
                          : "—"}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 text-[10px] text-gray-400 border-t border-gray-100 pt-1.5">
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