"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { STORE_LOCATION } from "@/lib/store-config";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { LoadingSkeleton, EmptyState } from "./shared";

const MapPicker = dynamic(() => import("@/app/_components/MapPicker"), { ssr: false });

interface BranchRow {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  lat: number;
  lng: number;
  delivery_radius_km: number;
  is_active: boolean;
}

export default function BranchesPanel() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BranchRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", address: "", phone: "", email: "",
    lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng, delivery_radius_km: 3,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("branches").select("*").order("name");
    if (data) setBranches(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  function startEdit(b: BranchRow) {
    setEditing(b);
    setCreating(false);
    setForm({
      name: b.name, slug: b.slug,
      address: b.address ?? "", phone: b.phone ?? "", email: b.email ?? "",
      lat: b.lat, lng: b.lng,
      delivery_radius_km: b.delivery_radius_km,
      is_active: b.is_active,
    });
    setError("");
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm({
      name: "", slug: "", address: "", phone: "", email: "",
      lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng, delivery_radius_km: 3,
      is_active: true,
    });
    setError("");
  }

  function cancelEdit() {
    setEditing(null);
    setCreating(false);
    setError("");
  }

  function handleMapAddressChange(parts: { street: string; city: string; province: string; zip: string; lat: number; lng: number }) {
    const addressParts = [parts.street, parts.city, parts.province].filter(Boolean);
    setForm((prev) => ({
      ...prev,
      address: addressParts.join(", "),
      lat: parts.lat,
      lng: parts.lng,
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Branch name is required."); return; }
    if (!form.slug.trim()) { setError("Slug is required."); return; }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens.");
      return;
    }
    const lat = form.lat;
    const lng = form.lng;
    const radius = form.delivery_radius_km;
    if (isNaN(lat) || isNaN(lng)) { setError("Please select a location on the map."); return; }
    if (isNaN(radius) || radius <= 0) { setError("Delivery radius must be a positive number."); return; }

    setSaving(true);
    const sb = createClient();
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      lat, lng,
      delivery_radius_km: radius,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error: updateErr } = await sb.from("branches").update(payload).eq("id", editing.id);
      if (updateErr) { setError(updateErr.message); setSaving(false); return; }
    } else {
      const { error: insertErr } = await sb.from("branches").insert(payload);
      if (insertErr) { setError(insertErr.message); setSaving(false); return; }
    }

    setSaving(false);
    cancelEdit();
    await fetchBranches();
  }

  async function handleDelete(id: string) {
    const sb = createClient();
    await sb.from("branches").delete().eq("id", id);
    await fetchBranches();
    setDeleteId(null);
  }

  async function toggleActive(b: BranchRow) {
    const sb = createClient();
    await sb.from("branches").update({ is_active: !b.is_active, updated_at: new Date().toISOString() }).eq("id", b.id);
    await fetchBranches();
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mt-0.5">{branches.length} branches</p>
        </div>
        {!creating && !editing && (
          <button
            onClick={startCreate}
            className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95"
          >
            + Add Branch
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900">{editing ? "Edit Branch" : "New Branch"}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Branch Name"
              className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })}
              placeholder="Slug (e.g. main, branch-2)"
              className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 font-mono"
              disabled={!!editing}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
            <input
              type="text"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Location</label>
            <MapPicker
              initialLat={form.lat}
              initialLng={form.lng}
              onAddressChange={handleMapAddressChange}
            />
            {form.address && (
              <p className="text-xs text-gray-500 font-mono mt-2">
                📍 {form.lat.toFixed(6)}, {form.lng.toFixed(6)} — {form.address}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Delivery Radius (km)</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={form.delivery_radius_km}
              onChange={(e) => setForm({ ...form, delivery_radius_km: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 w-32"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500/30"
            />
            Active
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Branch List */}
      {branches.length === 0 ? (
        <EmptyState message="No branches yet." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Slug</th>
                    <th className="px-4 py-3 font-semibold">Address</th>
                    <th className="px-4 py-3 font-semibold">Coordinates</th>
                    <th className="px-4 py-3 font-semibold">Radius</th>
                    <th className="px-4 py-3 font-semibold">Active</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {branches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{b.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.slug}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{b.address ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{b.lat.toFixed(6)}, {b.lng.toFixed(6)}</td>
                      <td className="px-4 py-3 text-gray-400">{b.delivery_radius_km} km</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(b)}>
                          <span className={`inline-block w-2 h-2 rounded-full ${b.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => startEdit(b)} className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">
                            Edit
                          </button>
                          <button onClick={() => setDeleteId(b.id)} className="px-3 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {branches.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{b.slug}</p>
                    {b.address && <p className="text-xs text-gray-400 mt-1">{b.address}</p>}
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${b.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{b.lat.toFixed(6)}, {b.lng.toFixed(6)}</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded">{b.delivery_radius_km} km</span>
                </div>
                <div className="flex gap-2 pt-1 border-t border-gray-100 flex-wrap">
                  <button onClick={() => startEdit(b)} className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">
                    ✏️ Edit
                  </button>
                  <button onClick={() => { toggleActive(b); }} className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">
                    {b.is_active ? "⏸ Deactivate" : "▶ Activate"}
                  </button>
                  <button onClick={() => setDeleteId(b.id)} className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={deleteId !== null}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? This action cannot be undone. All data associated with this branch (menu items, orders, etc.) should be reassigned first."
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}