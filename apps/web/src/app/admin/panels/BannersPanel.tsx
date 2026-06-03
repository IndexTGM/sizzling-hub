"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit-log";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { LoadingSkeleton, EmptyState } from "./shared";

export default function BannersPanel() {
  const [banners, setBanners] = useState<{ id: string; title: string; subtitle: string; image: string; tag: string | null; sort_order: number; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", image: "", tag: "", sort_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fetchBanners = useCallback(async () => { const sb = createClient(); const { data } = await sb.from("banners").select("*").order("sort_order"); if (data) setBanners(data); setLoading(false); }, []);
  useEffect(() => { fetchBanners(); }, [fetchBanners]);
  function startEdit(b: typeof banners[0]) { setEditing(b.id); setCreating(false); setForm({ title: b.title, subtitle: b.subtitle, image: b.image, tag: b.tag || "", sort_order: b.sort_order, is_active: b.is_active }); setError(""); }
  function startCreate() { setCreating(true); setEditing(null); setForm({ title: "", subtitle: "", image: "", tag: "", sort_order: banners.length + 1, is_active: true }); setError(""); }
  function cancelEdit() { setEditing(null); setCreating(false); setError(""); }
  async function handleSave() {
    if (!form.title.trim()) { setError("Title required."); return; } if (!form.image.trim()) { setError("Image filename required."); return; }
    setSaving(true); const sb = createClient();
    if (editing) { await sb.from("banners").update({ title: form.title.trim(), subtitle: form.subtitle.trim(), image: form.image.trim(), tag: form.tag.trim() || null, sort_order: form.sort_order, is_active: form.is_active }).eq("id", editing); logAudit({ action: "update_banner", entity_type: "banner", entity_id: editing }); }
    else { const { error: insertErr } = await sb.from("banners").insert({ title: form.title.trim(), subtitle: form.subtitle.trim(), image: form.image.trim(), tag: form.tag.trim() || null, sort_order: form.sort_order, is_active: form.is_active }); if (insertErr) { setError(insertErr.message); setSaving(false); return; } logAudit({ action: "create_banner", entity_type: "banner" }); }
    setSaving(false); cancelEdit(); await fetchBanners();
  }
  async function handleDelete(id: string) { const sb = createClient(); await sb.from("banners").delete().eq("id", id); logAudit({ action: "delete_banner", entity_type: "banner", entity_id: id }); await fetchBanners(); setDeleteId(null); }
  if (loading) return <LoadingSkeleton />;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-gray-900 tracking-tight">Banner Manager</h2><p className="text-sm text-gray-400 mt-0.5">{banners.length} banners</p></div>{!creating && !editing && <button onClick={startCreate} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95">+ Add Banner</button>}</div>
      {(creating || editing) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900">{editing ? "Edit" : "New Banner"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
            <input type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
            <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image filename" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
            <input type="text" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Tag" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
          </div>
          <div className="flex gap-4"><label className="flex items-center gap-2 text-sm text-gray-500">Sort: <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800" /></label><label className="flex items-center gap-2 text-sm text-gray-500"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-gray-300 text-red-600 focus:ring-red-500/30" /> Active</label></div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2"><button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40">{saving ? "Saving…" : "Save"}</button><button onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">Cancel</button></div>
        </div>
      )}
      {banners.length === 0 ? <EmptyState message="No banners." /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Title</th><th className="px-4 py-3 font-semibold">Subtitle</th><th className="px-4 py-3 font-semibold">Image</th><th className="px-4 py-3 font-semibold">Tag</th><th className="px-4 py-3 font-semibold">Order</th><th className="px-4 py-3 font-semibold">Active</th><th className="px-4 py-3 font-semibold">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{banners.map((b) => (
            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-semibold text-gray-800">{b.title}</td><td className="px-4 py-3 text-gray-500 max-w-xs truncate">{b.subtitle}</td><td className="px-4 py-3 text-gray-400 font-mono text-xs">{b.image}</td>
              <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600">{b.tag || "—"}</span></td><td className="px-4 py-3 text-gray-400">{b.sort_order}</td>
              <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full ${b.is_active ? "bg-emerald-500" : "bg-gray-300"}`} /></td>
              <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(b)} className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Edit</button><button onClick={() => setDeleteId(b.id)} className="px-3 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">Delete</button></div></td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
      <ConfirmModal
        open={deleteId !== null}
        title="Delete Banner"
        message="Are you sure you want to delete this banner? This action cannot be undone."
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}