"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { MenuItem } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit-log";
import StorageImage from "@/app/_components/StorageImage";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { LoadingSkeleton, EmptyState } from "./shared";

export default function MenuPanel() {
  const [items, setItems] = useState<(MenuItem & { categoryId?: string })[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", price: 0, categoryId: "", stock: 0, description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [search, setSearch] = useState("");
  const [reviewsItem, setReviewsItem] = useState<MenuItem | null>(null);
  const [reviews, setReviews] = useState<{ id: string; customerName: string; rating: number; comment: string | null; createdAt: string }[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "item" | "review" | "category"; id: string; name?: string; catName?: string } | null>(null);

  const fetchItems = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("menu_items").select("id, name, price, image_url, stock, description, category_id, categories(name)").order("name");
    if (data) setItems(data.map((r: any) => ({ id: r.id, name: r.name, price: r.price, imageName: r.image_url || "", stock: r.stock ?? 0, description: r.description || "", category: r.categories?.name || "Uncategorized", categoryId: r.category_id })));
    const { data: cats } = await sb.from("categories").select("id, name").order("sort_order");
    if (cats) setCategories(cats);
    setLoading(false);
  }, []);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function toggleReviewsPanel(item: MenuItem) {
    if (reviewsItem?.id === item.id) { setReviewsItem(null); return; }
    setReviewsItem(item); setReviewsLoading(true);
    const sb = createClient();
    const { data } = await sb.from("reviews").select("id, rating, comment, created_at, profiles:customer_id(full_name)").eq("menu_item_id", item.id).order("created_at", { ascending: false }).limit(50);
    setReviews((data || []).map((r: any) => ({ id: r.id, customerName: r.profiles?.full_name || "Anonymous", rating: r.rating, comment: r.comment, createdAt: r.created_at })));
    setReviewsLoading(false);
  }

  async function handleDeleteReview(reviewId: string) {
    const sb = createClient(); await sb.from("reviews").delete().eq("id", reviewId);
    logAudit({ action: "delete_review", entity_type: "review", entity_id: reviewId });
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    if (reviewsItem) { try { await sb.rpc("recalc_menu_item_rating", { p_menu_item_id: reviewsItem.id }); } catch {} }
    setConfirmDelete(null);
  }

  function startEdit(item: any) { setEditing(item); setCreating(false); setForm({ name: item.name, price: item.price, categoryId: item.categoryId || "", stock: item.stock ?? 0, description: item.description || "" }); setError(""); }
  function startCreate() { setCreating(true); setEditing(null); setForm({ name: "", price: 0, categoryId: categories[0]?.id || "", stock: 50, description: "" }); setError(""); }
  function cancelEdit() { setEditing(null); setCreating(false); setForm({ name: "", price: 0, categoryId: "", stock: 0, description: "" }); setError(""); }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.price < 0) { setError("Price must be positive."); return; }
    if (creating && !form.categoryId) { setError("Please select a category."); return; }
    setSaving(true); setError(""); const sb = createClient(); const img = form.name.trim();
    if (editing) {
      await sb.from("menu_items").update({ name: form.name.trim(), price: form.price, image_url: img, stock: form.stock, description: form.description.trim() }).eq("id", editing.id);
      logAudit({ action: "update_menu_item", entity_type: "menu_item", entity_id: editing.id, details: { name: form.name.trim() } });
    } else if (creating) {
      const { error: insertErr } = await sb.from("menu_items").insert({ category_id: form.categoryId, name: form.name.trim(), price: form.price, image_url: img, stock: form.stock, description: form.description.trim() });
      if (insertErr) { setError(insertErr.message); setSaving(false); return; }
      logAudit({ action: "create_menu_item", entity_type: "menu_item", details: { name: form.name.trim() } });
    }
    setSaving(false); cancelEdit(); await fetchItems();
  }

  async function handleDelete(id: string) { const sb = createClient(); await sb.from("menu_items").delete().eq("id", id); logAudit({ action: "delete_menu_item", entity_type: "menu_item", entity_id: id }); await fetchItems(); setConfirmDelete(null); }
  async function handleDeleteCategory(catId: string, catName: string) { const sb = createClient(); await sb.from("menu_items").delete().eq("category_id", catId); await sb.from("categories").delete().eq("id", catId); logAudit({ action: "delete_category", entity_type: "category", entity_id: catId, details: { name: catName } }); await fetchItems(); setConfirmDelete(null); }
  async function handleAddCategory() { if (!newCatName.trim()) { setCatError("Category name is required."); return; } setCatError(""); const sb = createClient(); const { error: insertErr } = await sb.from("categories").insert({ name: newCatName.trim(), slug: newCatName.trim().toLowerCase().replace(/\s+/g, "-"), sort_order: categories.length + 1, is_active: true }); if (insertErr) { setCatError(insertErr.message); return; } logAudit({ action: "create_category", entity_type: "category", details: { name: newCatName.trim() } }); setNewCatName(""); setAddingCat(false); await fetchItems(); }

  let filteredItems = catFilter === "all" ? items : items.filter((i) => i.category === catFilter || (catFilter === "Uncategorized" && !i.category));
  if (search.trim()) { const q = search.toLowerCase(); filteredItems = filteredItems.filter((i) => i.name.toLowerCase().includes(q)); }
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Menu Items</h2><p className="text-sm text-gray-400 mt-0.5">{items.length} items</p></div>
        {!editing && !creating && <button onClick={startCreate} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold transition-all duration-200 hover:bg-red-700 active:scale-95">+ Add Item</button>}
      </div>
      {(editing || creating) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900">{editing ? `Edit: ${editing.name}` : "New Menu Item"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300" />
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Price (₱)" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300" />
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} placeholder="Stock qty" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300" />
            {creating && (<select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"><option value="" className="bg-white">Select category</option>{categories.map((c) => (<option key={c.id} value={c.id} className="bg-white">{c.name}</option>))}</select>)}
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 resize-none" rows={2} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2"><button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-red-700 transition-colors">{saving ? "Saving…" : "Save"}</button><button onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button></div>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categories:</span>
            <div className="flex gap-1 flex-wrap items-center"><button onClick={() => setCatFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}>All</button>
              {categories.map((c) => (<span key={c.id} className="inline-flex items-center gap-0.5"><button onClick={() => setCatFilter(c.name)} className={`px-3 py-1.5 rounded-l-lg text-xs font-semibold transition-colors ${catFilter === c.name ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}>{c.name}</button><button onClick={() => setConfirmDelete({ type: "category", id: c.id, catName: c.name })} className="px-1.5 py-1.5 rounded-r-lg text-xs font-bold transition-colors bg-gray-100 text-gray-300 hover:bg-red-50 hover:text-red-600">×</button></span>))}
            </div>
          </div>
          {!addingCat && <button onClick={() => setAddingCat(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">+ Add Category</button>}
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 w-full sm:w-64" />
      </div>
      {addingCat && (<div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3"><input type="text" value={newCatName} onChange={(e) => { setNewCatName(e.target.value); setCatError(""); }} placeholder="Category name" autoFocus className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" /><button onClick={handleAddCategory} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">Save</button><button onClick={() => { setAddingCat(false); setNewCatName(""); }} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">Cancel</button>{catError && <p className="text-xs text-red-600">{catError}</p>}</div>)}
      {filteredItems.length === 0 ? <EmptyState message="No menu items." /> : (<div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Image</th><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Price</th><th className="px-4 py-3 font-semibold">Stock</th><th className="px-4 py-3 font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredItems.map((item) => (<tr key={item.id} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3"><div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden"><StorageImage imageBaseName={item.imageName} alt={item.name} className="w-full h-full object-cover" /></div></td><td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td><td className="px-4 py-3 text-gray-500">{item.category}</td><td className="px-4 py-3 font-bold text-red-600">₱{item.price}</td><td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${(item.stock ?? 0) <= 5 ? "bg-red-50 text-red-600" : (item.stock ?? 0) <= 20 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{item.stock ?? 0}</span></td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(item)} className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Edit</button><button onClick={() => toggleReviewsPanel(item)} className="px-3 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100">Reviews</button><button onClick={() => setConfirmDelete({ type: "item", id: item.id, name: item.name })} className="px-3 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">Delete</button></div></td></tr>))}</tbody></table></div></div>)}
      {reviewsItem && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => { setReviewsItem(null); }}><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" /><div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between px-6 py-4 border-b border-gray-200"><div><h3 className="text-lg font-extrabold text-gray-900">Reviews for {reviewsItem.name}</h3>{!reviewsLoading && reviews.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""} · {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} avg</p>}</div><button onClick={() => setReviewsItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div><div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">{reviewsLoading ? <p className="text-sm text-gray-400 text-center py-4">Loading...</p> : reviews.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No reviews yet.</p> : reviews.map((r) => (<div key={r.id} className="flex items-start justify-between py-3 px-4 rounded-xl bg-gray-50"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-800">{r.customerName}</span><div className="flex gap-0.5">{[1,2,3,4,5].map((s) => (<span key={s} className="text-xs" style={{ color: s <= r.rating ? "#f59e0b" : "#d1d5db" }}>★</span>))}</div></div>{r.comment && <p className="text-sm text-gray-500 mt-1">{r.comment}</p>}<p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p></div><button onClick={() => setConfirmDelete({ type: "review", id: r.id })} className="ml-3 px-2 py-1 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">Delete</button></div>))}</div></div></div>)}
      <ConfirmModal open={confirmDelete !== null} title={confirmDelete?.type === "review" ? "Delete Review" : confirmDelete?.type === "category" ? "Delete Category" : "Delete Item"} message={confirmDelete?.type === "review" ? "Are you sure you want to delete this review?" : confirmDelete?.type === "category" ? `Delete "${confirmDelete?.catName}" and all its items?` : `Delete "${confirmDelete?.name || ""}"?`} confirmLabel="Delete" confirmDanger onConfirm={() => { if (!confirmDelete) return; if (confirmDelete.type === "review") handleDeleteReview(confirmDelete.id); else if (confirmDelete.type === "category") handleDeleteCategory(confirmDelete.id, confirmDelete.catName || ""); else handleDelete(confirmDelete.id); }} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}