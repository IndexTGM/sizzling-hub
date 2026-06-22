"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import StorageImage from "@/app/_components/StorageImage";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { LoadingSkeleton, EmptyState } from "./shared";

interface MenuItemRow {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string | null;
  categoryIds: string[];
  categoryNames: string[];
  branchId: string | null;
}

export default function MenuPanel({ branchId }: { branchId?: string | null }) {
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; branchId: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItemRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", price: 0, categoryIds: [] as string[], stock: 0, description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ type: "item" | "category"; id: string; name?: string; catName?: string } | null>(null);

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    const sb = createClient();
    let menuQ = sb.from("menu_items").select("id, name, price, stock, description, branch_id").order("name");
    let catQ = sb.from("categories").select("id, name, branch_id").order("sort_order");
    if (branchId) { menuQ = menuQ.eq("branch_id", branchId); catQ = catQ.eq("branch_id", branchId); }
    const { data: menuData } = await menuQ;
    const { data: junctions } = await sb.from("menu_item_categories").select("menu_item_id, category_id, categories(name)");
    const { data: cats } = await catQ;
    if (cats) setCategories(cats.map((c: any) => ({ id: c.id, name: c.name, branchId: c.branch_id ?? null })));
    const junctionMap = new Map<string, { ids: string[]; names: string[] }>();
    if (junctions) for (const j of junctions as any[]) { const entry = junctionMap.get(j.menu_item_id); const catName = j.categories?.name || "Uncategorized"; if (entry) { if (!entry.ids.includes(j.category_id)) entry.ids.push(j.category_id); if (!entry.names.includes(catName)) entry.names.push(catName); } else junctionMap.set(j.menu_item_id, { ids: [j.category_id], names: [catName] }); }
    if (menuData) setItems(menuData.map((r: any) => { const junc = junctionMap.get(r.id); return { id: r.id, name: r.name, price: r.price, stock: r.stock ?? 0, description: r.description, categoryIds: junc?.ids || [], categoryNames: junc?.names || ["Uncategorized"], branchId: r.branch_id ?? null }; }));
    setLoading(false);
  }, [branchId]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  function toggleCategory(catId: string) { setForm((prev) => ({ ...prev, categoryIds: prev.categoryIds.includes(catId) ? prev.categoryIds.filter((id) => id !== catId) : [...prev.categoryIds, catId] })); }
  function startEdit(item: MenuItemRow) { setEditing(item); setCreating(false); setForm({ name: item.name, price: item.price, categoryIds: [...item.categoryIds], stock: item.stock, description: item.description || "" }); setError(""); }
  function startCreate() { setCreating(true); setEditing(null); setForm({ name: "", price: 0, categoryIds: [], stock: 50, description: "" }); setError(""); }
  function cancelEdit() { setEditing(null); setCreating(false); setForm({ name: "", price: 0, categoryIds: [], stock: 0, description: "" }); setError(""); }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.price < 0) { setError("Price must be positive."); return; }
    if (form.categoryIds.length === 0) { setError("Please select at least one category."); return; }
    setSaving(true); setError(""); const sb = createClient(); let itemId: string;
    if (editing) {
      itemId = editing.id;
      await sb.from("menu_items").update({ name: form.name.trim(), price: form.price, stock: form.stock, description: form.description.trim() }).eq("id", itemId);
      await sb.from("menu_item_categories").delete().eq("menu_item_id", itemId);
      if (form.categoryIds.length > 0) await sb.from("menu_item_categories").insert(form.categoryIds.map((cid) => ({ menu_item_id: itemId, category_id: cid })));
    } else {
      const { data: newItem, error: insertErr } = await sb.from("menu_items").insert({ name: form.name.trim(), price: form.price, stock: form.stock, description: form.description.trim(), ...(branchId ? { branch_id: branchId } : {}) }).select("id").single();
      if (insertErr || !newItem) { setError(insertErr?.message || "Insert failed"); setSaving(false); return; }
      itemId = newItem.id;
      if (form.categoryIds.length > 0) await sb.from("menu_item_categories").insert(form.categoryIds.map((cid) => ({ menu_item_id: itemId, category_id: cid })));
    }
    setSaving(false); cancelEdit(); await fetchItems();
  }

  async function handleDelete(id: string) {
    const sb = createClient();
    const { error: catErr } = await sb.from("menu_item_categories").delete().eq("menu_item_id", id);
    if (catErr) { setError(`Cannot delete categories: ${catErr.message}`); await fetchItems(); setConfirmDelete(null); return; }
    const { error: cartErr } = await sb.from("cart_items").delete().eq("menu_item_id", id);
    if (cartErr) { setError(`Cannot delete cart items: ${cartErr.message}`); await fetchItems(); setConfirmDelete(null); return; }
    const { error: deleteErr } = await sb.from("menu_items").delete().eq("id", id);
    if (deleteErr) { if (deleteErr.message.includes("order_items")) { const { error: softErr } = await sb.from("menu_items").update({ stock: -1 }).eq("id", id); if (softErr) { setError(`Cannot delete: ${softErr.message}`); await fetchItems(); setConfirmDelete(null); return; } setError("Item has order history. Marked as unavailable instead."); await fetchItems(); setConfirmDelete(null); return; } setError(`Cannot delete: ${deleteErr.message}`); await fetchItems(); setConfirmDelete(null); return; }
    await fetchItems(); setConfirmDelete(null);
  }

  async function handleDeleteCategory(catId: string, catName: string) { const sb = createClient(); await sb.from("menu_item_categories").delete().eq("category_id", catId); const { error: deleteErr } = await sb.from("categories").delete().eq("id", catId); if (deleteErr) { setError(`Cannot delete: ${deleteErr.message}`); await fetchItems(); setConfirmDelete(null); return; } await fetchItems(); setConfirmDelete(null); }
  async function handleAddCategory() { if (!newCatName.trim()) { setCatError("Category name is required."); return; } setCatError(""); const sb = createClient(); const { error: insertErr } = await sb.from("categories").insert({ name: newCatName.trim(), sort_order: categories.length + 1, ...(branchId ? { branch_id: branchId } : {}) }); if (insertErr) { setCatError(insertErr.message); return; } setNewCatName(""); setAddingCat(false); await fetchItems(); }

  let filteredItems = catFilter === "all" ? items : items.filter((i) => i.categoryNames.includes(catFilter));
  if (search.trim()) { const q = search.toLowerCase(); filteredItems = filteredItems.filter((i) => i.name.toLowerCase().includes(q)); }
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><p className="text-sm text-gray-400 mt-0.5">{items.length} items</p>{!editing && !creating && <button onClick={startCreate} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold transition-all duration-200 hover:bg-red-700 active:scale-95">+ Add Item</button>}</div>
      {error && !editing && !creating && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}<button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-red-600 font-bold">×</button></div>}
      {(editing || creating) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900">{editing ? `Edit: ${editing.name}` : "New Menu Item"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300" />
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Price (₱)" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300" />
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} placeholder="Stock qty" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300" />
            <div className="relative">
              <button type="button" onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)} className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-left focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 flex items-center justify-between"><span className={form.categoryIds.length === 0 ? "text-gray-400" : "text-gray-800"}>{form.categoryIds.length === 0 ? "Select categories" : `${form.categoryIds.length} selected`}</span><svg className={`w-4 h-4 text-gray-400 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
              {categoryDropdownOpen && <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">{categories.length === 0 ? <div className="px-3 py-2 text-xs text-gray-400">No categories</div> : (() => { const activeBranchId = editing?.branchId ?? branchId; const filteredCats = activeBranchId ? categories.filter(c => !c.branchId || c.branchId === activeBranchId) : categories; return filteredCats.map((c) => (<label key={c.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${form.categoryIds.includes(c.id) ? "bg-red-50 text-red-700" : "text-gray-700 hover:bg-gray-50"}`}><input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />{c.name}</label>)); })()}</div>}
            </div>
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 resize-none" rows={2} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2"><button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-red-700 transition-colors">{saving ? "Saving…" : "Save"}</button><button onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button></div>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categories:</span><div className="flex gap-1 flex-wrap items-center"><button onClick={() => setCatFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}>All</button>{categories.map((c) => (<span key={c.id} className="inline-flex items-center gap-0.5"><button onClick={() => setCatFilter(c.name)} className={`px-3 py-1.5 rounded-l-lg text-xs font-semibold transition-colors ${catFilter === c.name ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}>{c.name}</button><button onClick={() => setConfirmDelete({ type: "category", id: c.id, catName: c.name })} className="px-1.5 py-1.5 rounded-r-lg text-xs font-bold transition-colors bg-gray-100 text-gray-300 hover:bg-red-50 hover:text-red-600">×</button></span>))}</div></div>{!addingCat && <button onClick={() => setAddingCat(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">+ Add Category</button>}</div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 w-full sm:w-64" />
      </div>
      {addingCat && <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3"><input type="text" value={newCatName} onChange={(e) => { setNewCatName(e.target.value); setCatError(""); }} placeholder="Category name" autoFocus className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" /><button onClick={handleAddCategory} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">Save</button><button onClick={() => { setAddingCat(false); setNewCatName(""); }} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">Cancel</button>{catError && <p className="text-xs text-red-600">{catError}</p>}</div>}
      {filteredItems.length === 0 ? <EmptyState message="No menu items." /> : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Image</th><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Categories</th><th className="px-4 py-3 font-semibold">Price</th><th className="px-4 py-3 font-semibold">Stock</th><th className="px-4 py-3 font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredItems.map((item) => (<tr key={item.id} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3"><div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden"><StorageImage imageBaseName={item.name} alt={item.name} className="w-full h-full object-cover" branchId={branchId} /></div></td><td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td><td className="px-4 py-3 text-gray-500"><div className="flex flex-wrap gap-1">{item.categoryNames.map((cn) => (<span key={cn} className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{cn}</span>))}</div></td><td className="px-4 py-3 font-bold text-red-600">₱{item.price}</td><td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${(item.stock ?? 0) <= 5 ? "bg-red-50 text-red-600" : (item.stock ?? 0) <= 20 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{item.stock ?? 0}</span></td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(item)} className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Edit</button><button onClick={() => setConfirmDelete({ type: "item", id: item.id, name: item.name })} className="px-3 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">Delete</button></div></td></tr>))}</tbody></table></div>
          </div>
          <div className="md:hidden space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    <StorageImage imageBaseName={item.name} alt={item.name} className="w-full h-full object-cover" branchId={branchId} />
                  </div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-sm text-gray-900 truncate">{item.name}</p><div className="flex flex-wrap gap-1 mt-1">{item.categoryNames.map((cn) => (<span key={cn} className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{cn}</span>))}</div></div>
                </div>
                <div className="flex items-center justify-between"><span className="text-lg font-black text-red-600">₱{item.price}</span><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${(item.stock ?? 0) <= 5 ? "bg-red-50 text-red-600" : (item.stock ?? 0) <= 20 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{item.stock ?? 0} in stock</span></div>
                <div className="flex gap-2 pt-1 border-t border-gray-100"><button onClick={() => startEdit(item)} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">✏️ Edit</button><button onClick={() => setConfirmDelete({ type: "item", id: item.id, name: item.name })} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">🗑 Delete</button></div>
              </div>
            ))}
          </div>
        </>
      )}
      <ConfirmModal open={confirmDelete !== null} title={confirmDelete?.type === "category" ? "Delete Category" : "Delete Item"} message={confirmDelete?.type === "category" ? `Delete "${confirmDelete?.catName}" and all items in it?` : `Delete "${confirmDelete?.name || ""}"?`} confirmLabel="Delete" confirmDanger onConfirm={() => { if (!confirmDelete) return; if (confirmDelete.type === "category") handleDeleteCategory(confirmDelete.id, confirmDelete.catName || ""); else handleDelete(confirmDelete.id); }} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}