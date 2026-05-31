"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getImagePath, type MenuItem } from "@/lib/menu-data";

interface Profile { id: string; full_name: string; email: string; role: string; phone: string | null; created_at: string; }
interface Order { id: string; customer_name: string; status: string; total: number; placed_at: string; items_count: number; }
type AdminTab = "profiles" | "menu" | "orders" | "images" | "banners";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("profiles");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.replace("/");
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-10 h-10 border-4 border-[#e5e7eb] rounded-full animate-spin" style={{ borderTopColor: "#dc2626" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Sizzling Hub" className="w-9 h-9 rounded-lg object-contain" />
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "#dc2626" }}>ADMIN PANEL</h1>
          </div>
          <a href="/" className="text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors">← Back to Store</a>
        </div>
      </header>

      <div className="bg-white border-b border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {(["profiles", "menu", "orders", "banners"] as AdminTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t ? "border-[#dc2626] text-[#dc2626]" : "border-transparent text-[#6b7280] hover:text-[#0a0a0a]"}`}>
              {t === "profiles" ? "Profiles" : t === "menu" ? "Menu Items" : t === "orders" ? "Orders" : t === "images" ? "Images" : "Banners"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        {tab === "profiles" && <ProfilesPanel />}
        {tab === "menu" && <MenuPanel />}
        {tab === "orders" && <OrdersPanel />}
        {tab === "images" && <ImagesPanel />}
        {tab === "banners" && <BannersPanel />}
      </div>
    </div>
  );
}

function ProfilesPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const fetchProfiles = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("profiles").select("id, full_name, email, role, phone, created_at").order("created_at", { ascending: false });
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }, []);
  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  async function handleRoleChange(profileId: string, newRole: string) {
    setSavingRoleId(profileId);
    const sb = createClient();
    await sb.from("profiles").update({ role: newRole }).eq("id", profileId);
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p)));
    setSavingRoleId(null);
  }

  const filteredProfiles = roleFilter === "all" ? profiles : profiles.filter((p) => p.role === roleFilter);
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {profiles.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Role:</span>
          <div className="flex gap-1">
            {(["all", "customer", "admin"] as const).map((r) => (
              <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${roleFilter === r ? "bg-[#dc2626] text-white" : "bg-[#f3f4f6] text-[#6b7280] hover:text-[#dc2626]"}`}>
                {r === "all" ? "All" : r === "customer" ? "Customer" : "Admin"}
              </button>
            ))}
          </div>
        </div>
      )}
      {!profiles.length ? <EmptyState message="No profiles found." /> : filteredProfiles.length === 0 ? <EmptyState message={`No ${roleFilter} profiles found.`} /> : (
        <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f9fafb] text-left text-xs uppercase text-[#6b7280] tracking-wider">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Joined</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f9fafb]">
                    <td className="px-4 py-3 font-medium text-[#0a0a0a]">{p.full_name || "—"}</td>
                    <td className="px-4 py-3 text-[#6b7280]">{p.email}</td>
                    <td className="px-4 py-3">
                      {savingRoleId === p.id ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f3f4f6] text-[#9ca3af]">Saving…</span> : (
                        <select value={p.role} onChange={(e) => handleRoleChange(p.id, e.target.value)} className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 ${p.role === "admin" ? "bg-[#fef2f2] text-[#dc2626]" : "bg-[#f0fdf4] text-[#16a34a]"}`}>
                          <option value="customer">Customer</option><option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280]">{p.phone || "—"}</td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuPanel() {
  const [items, setItems] = useState<(MenuItem & { categoryId?: string })[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", price: 0, categoryId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");

  const fetchItems = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("menu_items").select("id, name, price, image_url, category_id, categories(name)").order("name");
    if (data) setItems(data.map((row: any) => ({ id: row.id, name: row.name, price: row.price, imageName: row.image_url || "", category: row.categories?.name || "Uncategorized", categoryId: row.category_id })));
    const { data: cats } = await sb.from("categories").select("id, name").order("sort_order");
    if (cats) setCategories(cats);
    setLoading(false);
  }, []);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  function startEdit(item: MenuItem & { categoryId?: string }) { setEditing(item); setCreating(false); setForm({ name: item.name, price: item.price, categoryId: (item as any).categoryId || "" }); setError(""); }
  function startCreate() { setCreating(true); setEditing(null); setForm({ name: "", price: 0, categoryId: categories[0]?.id || "" }); setError(""); }
  function cancelEdit() { setEditing(null); setCreating(false); setForm({ name: "", price: 0, categoryId: "" }); setError(""); }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.price < 0) { setError("Price must be positive."); return; }
    if (creating && !form.categoryId) { setError("Please select a category."); return; }
    setSaving(true); setError("");
    const sb = createClient();
    if (editing) {
      const imageUrl = form.name.trim().toLowerCase().replace(/\s+/g, "") + ".png";
      await sb.from("menu_items").update({ name: form.name.trim(), price: form.price, image_url: imageUrl }).eq("id", editing.id);
    } else if (creating) {
      const imageUrl = form.name.trim().toLowerCase().replace(/\s+/g, "") + ".png";
      const { error: insertErr } = await sb.from("menu_items").insert({ category_id: form.categoryId, name: form.name.trim(), price: form.price, image_url: imageUrl });
      if (insertErr) { setError(insertErr.message); setSaving(false); return; }
    }
    setSaving(false); cancelEdit(); await fetchItems();
  }

  async function handleDelete(id: string) { if (!confirm("Delete this item?")) return; const sb = createClient(); await sb.from("menu_items").delete().eq("id", id); await fetchItems(); }
  async function handleDeleteCategory(catId: string, catName: string) {
    if (!confirm(`Delete category "${catName}" and all its items? This cannot be undone.`)) return;
    const sb = createClient();
    // First delete all items in this category
    await sb.from("menu_items").delete().eq("category_id", catId);
    // Then delete the category
    await sb.from("categories").delete().eq("id", catId);
    await fetchItems();
  }
  async function handleAddCategory() {
    if (!newCatName.trim()) { setCatError("Category name is required."); return; }
    setCatError(""); const sb = createClient();
    const maxSort = categories.length + 1;
    const { error: insertErr } = await sb.from("categories").insert({ name: newCatName.trim(), slug: newCatName.trim().toLowerCase().replace(/\s+/g, "-"), sort_order: maxSort, is_active: true });
    if (insertErr) { setCatError(insertErr.message); return; }
    setNewCatName(""); setAddingCat(false); await fetchItems();
  }

  const filteredItems = catFilter === "all" ? items : items.filter((item) => item.category === catFilter || (catFilter === "Uncategorized" && !item.category));
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0a0a0a]">Menu Items</h2>
        {!editing && !creating && <button onClick={startCreate} className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:scale-105" style={{ backgroundColor: "#dc2626" }}>+ Add New Item</button>}
      </div>
      {(editing || creating) && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 space-y-3">
          <h3 className="font-bold text-sm text-[#0a0a0a]">{editing ? `Edit: ${editing.name}` : "Add New Menu Item"}</h3>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm" />
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Price" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm" />
          {creating && <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white"><option value="">Select category</option>{categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select>}
          {error && <p className="text-xs text-[#dc2626]">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: saving ? "#fca5a5" : "#dc2626" }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium text-[#6b7280]">Cancel</button>
          </div>
        </div>
      )}
      {/* Category Filters with Delete Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2"><span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Categories:</span>
            <div className="flex gap-1 flex-wrap items-center">
              <button onClick={() => setCatFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === "all" ? "bg-[#dc2626] text-white" : "bg-[#f3f4f6] text-[#6b7280] hover:text-[#dc2626]"}`}>All</button>
              {categories.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-0.5">
                  <button
                    onClick={() => setCatFilter(c.name)}
                    className={`px-3 py-1.5 rounded-l-lg text-xs font-semibold transition-colors ${catFilter === c.name ? "bg-[#dc2626] text-white" : "bg-[#f3f4f6] text-[#6b7280] hover:text-[#dc2626]"}`}
                  >
                    {c.name}
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                    className={`px-1.5 py-1.5 rounded-r-lg text-xs font-bold transition-colors ${catFilter === c.name ? "bg-[#dc2626] text-white hover:bg-[#b91c1c]" : "bg-[#f3f4f6] text-[#9ca3af] hover:bg-[#fee2e2] hover:text-[#dc2626]"}`}
                    title={`Delete ${c.name} category`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          {!addingCat && <button onClick={() => setAddingCat(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#f0fdf4] text-[#16a34a] hover:bg-[#d1fae5] transition-colors">+ Add Category</button>}
        </div>
        {categories.length === 0 && items.length > 0 && (
          <p className="text-xs text-[#9ca3af] italic">No custom categories yet. Items shown as "Uncategorized".</p>
        )}
      </div>
      {addingCat && (
        <div className="bg-[#f9fafb] rounded-xl border border-[#e5e7eb] p-3 flex items-center gap-3">
          <input type="text" value={newCatName} onChange={(e) => { setNewCatName(e.target.value); setCatError(""); }} placeholder="Category name (e.g. Desserts)" autoFocus className="flex-1 px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30" />
          <button onClick={handleAddCategory} className="px-4 py-2 rounded-lg text-white text-xs font-bold transition-all duration-200" style={{ backgroundColor: "#dc2626" }}>Save</button>
          <button onClick={() => { setAddingCat(false); setNewCatName(""); setCatError(""); }} className="px-3 py-2 rounded-lg border border-[#e5e7eb] text-xs font-medium text-[#6b7280] hover:bg-[#e5e7eb] transition-colors">Cancel</button>
          {catError && <p className="text-xs text-[#dc2626]">{catError}</p>}
        </div>
      )}
      {filteredItems.length === 0 ? <EmptyState message={`No menu items found${catFilter !== "all" ? ` in ${catFilter}` : ""}.`} /> : (
        <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f9fafb] text-left text-xs uppercase text-[#6b7280] tracking-wider">
                <tr><th className="px-4 py-3">Image</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f9fafb]">
                    <td className="px-4 py-3"><div className="w-10 h-10 rounded-lg bg-[#f3f4f6] overflow-hidden"><img src={getImagePath(item.imageName)} alt={item.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder.png"; }} /></div></td>
                    <td className="px-4 py-3 font-medium text-[#0a0a0a]">{item.name}</td>
                    <td className="px-4 py-3 text-[#6b7280]">{item.category}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#dc2626" }}>₱{item.price}</td>
                    <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(item)} className="px-3 py-1 rounded-md text-xs font-semibold bg-[#f3f4f6] text-[#0a0a0a] hover:bg-[#e5e7eb] transition-colors">Edit</button><button onClick={() => handleDelete(item.id)} className="px-3 py-1 rounded-md text-xs font-semibold bg-[#fef2f2] text-[#dc2626] hover:bg-[#fecaca] transition-colors">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const sb = createClient();
    const { data } = await sb.from("orders").select("id, status, total, placed_at, customer:profiles(full_name)").order("placed_at", { ascending: false });
    if (data) setOrders(data.map((row: any) => ({ id: row.id, customer_name: (row.customer as any)?.full_name || "Unknown", status: row.status, total: row.total, placed_at: row.placed_at, items_count: 0 })));
    setLoading(false);
  })(); }, []);
  if (loading) return <LoadingSkeleton />;
  if (!orders.length) return <EmptyState message="No orders yet." />;

  const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800", preparing: "bg-purple-100 text-purple-800", ready: "bg-green-100 text-green-800", delivered: "bg-gray-100 text-gray-800", cancelled: "bg-red-100 text-red-800" };

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f9fafb] text-left text-xs uppercase text-[#6b7280] tracking-wider">
            <tr><th className="px-4 py-3">Order #</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Placed</th></tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-[#f9fafb]">
                <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{o.id.slice(0, 8)}…</td>
                <td className="px-4 py-3 font-medium text-[#0a0a0a]">{o.customer_name}</td>
                <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[o.status] || "bg-gray-100 text-gray-800"}`}>{o.status}</span></td>
                <td className="px-4 py-3 font-semibold" style={{ color: "#dc2626" }}>₱{o.total}</td>
                <td className="px-4 py-3 text-[#6b7280] text-xs">{new Date(o.placed_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImagesPanel() {
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true); const sb = createClient();
    const { data } = await sb.storage.from("images").list();
    if (data) setImages(data.map((f) => ({ name: f.name, url: sb.storage.from("images").getPublicUrl(f.name).data.publicUrl })));
    setLoading(false);
  }, []);
  useEffect(() => { fetchImages(); }, [fetchImages]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Only image files are allowed."); return; }
    setUploading(true); const sb = createClient();
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error } = await sb.storage.from("images").upload(fileName, file);
    if (error) alert("Upload failed: " + error.message);
    setUploading(false); await fetchImages(); e.target.value = "";
  }

  async function handleDelete(name: string) { if (!confirm(`Delete "${name}"? This cannot be undone.`)) return; setDeleting(name); const sb = createClient(); const { error } = await sb.storage.from("images").remove([name]); if (error) alert("Delete failed: " + error.message); setDeleting(null); await fetchImages(); }
  async function handleCopyUrl(url: string) { await navigator.clipboard.writeText(url); alert("URL copied to clipboard!"); }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0a0a0a]">Image Manager {images.length > 0 && `(${images.length})`}</h2>
        <label className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:scale-105 cursor-pointer" style={{ backgroundColor: "#dc2626" }}>{uploading ? "Uploading…" : "+ Upload Image"}<input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" /></label>
      </div>
      {images.length === 0 ? <EmptyState message="No images in storage. Upload some!" /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {images.map((img) => (
            <div key={img.name} className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden group hover:shadow-md transition-all duration-200">
              <div className="w-full h-32 bg-[#f3f4f6] relative overflow-hidden">
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder.png"; }} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => handleCopyUrl(img.url)} className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white transition-colors" title="Copy URL"><svg className="w-4 h-4 text-[#0a0a0a]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                  <button onClick={() => handleDelete(img.name)} disabled={deleting === img.name} className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center hover:bg-[#fee2e2] transition-colors" title="Delete"><svg className="w-4 h-4 text-[#dc2626]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                {deleting === img.name && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-xs font-bold">Deleting…</span></div>}
              </div>
              <div className="p-2"><p className="text-xs font-medium text-[#374151] truncate" title={img.name}>{img.name}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BannersPanel() {
  const [banners, setBanners] = useState<{ id: string; title: string; subtitle: string; image: string; tag: string | null; sort_order: number; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", image: "", tag: "", sort_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBanners = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("banners").select("id, title, subtitle, image, tag, sort_order, is_active").order("sort_order");
    if (data) setBanners(data);
    setLoading(false);
  }, []);
  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  function startEdit(b: typeof banners[0]) {
    setEditing(b.id); setCreating(false); setForm({ title: b.title, subtitle: b.subtitle, image: b.image, tag: b.tag || "", sort_order: b.sort_order, is_active: b.is_active }); setError("");
  }
  function startCreate() { setCreating(true); setEditing(null); setForm({ title: "", subtitle: "", image: "", tag: "", sort_order: banners.length + 1, is_active: true }); setError(""); }
  function cancelEdit() { setEditing(null); setCreating(false); setError(""); }

  async function handleSave() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.image.trim()) { setError("Image filename is required (e.g. tapsilog)."); return; }
    setSaving(true); setError("");
    const sb = createClient();
    if (editing) {
      const { error: updateErr } = await sb.from("banners").update({ title: form.title.trim(), subtitle: form.subtitle.trim(), image: form.image.trim(), tag: form.tag.trim() || null, sort_order: form.sort_order, is_active: form.is_active }).eq("id", editing);
      if (updateErr) { setError(updateErr.message); setSaving(false); return; }
    } else if (creating) {
      const { error: insertErr } = await sb.from("banners").insert({ title: form.title.trim(), subtitle: form.subtitle.trim(), image: form.image.trim(), tag: form.tag.trim() || null, sort_order: form.sort_order, is_active: form.is_active });
      if (insertErr) { setError(insertErr.message); setSaving(false); return; }
    }
    setSaving(false); cancelEdit(); await fetchBanners();
  }

  async function handleDelete(id: string) { if (!confirm("Delete this banner?")) return; const sb = createClient(); await sb.from("banners").delete().eq("id", id); await fetchBanners(); }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0a0a0a]">Banner Manager</h2>
        {!creating && !editing && <button onClick={startCreate} className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:scale-105" style={{ backgroundColor: "#dc2626" }}>+ Add Banner</button>}
      </div>
      {(creating || editing) && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 space-y-3">
          <h3 className="font-bold text-sm text-[#0a0a0a]">{editing ? "Edit Banner" : "Add New Banner"}</h3>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm" />
          <input type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm" />
          <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image filename (e.g. sisilog)" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm" />
          <input type="text" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Tag (e.g. BEST SELLER)" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm" />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-[#6b7280]">
              <span>Sort Order:</span>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1.5 rounded-lg border border-[#e5e7eb] text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm text-[#6b7280]">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-[#d1d5db] text-[#dc2626] focus:ring-[#dc2626]/30" />
              Active
            </label>
          </div>
          {error && <p className="text-xs text-[#dc2626]">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: saving ? "#fca5a5" : "#dc2626" }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium text-[#6b7280]">Cancel</button>
          </div>
        </div>
      )}
      {banners.length === 0 ? <EmptyState message="No banners yet." /> : (
        <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f9fafb] text-left text-xs uppercase text-[#6b7280] tracking-wider">
                <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Subtitle</th><th className="px-4 py-3">Image</th><th className="px-4 py-3">Tag</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {banners.map((b) => (
                  <tr key={b.id} className="hover:bg-[#f9fafb]">
                    <td className="px-4 py-3 font-medium text-[#0a0a0a]">{b.title}</td>
                    <td className="px-4 py-3 text-[#6b7280] max-w-xs truncate">{b.subtitle}</td>
                    <td className="px-4 py-3 text-[#6b7280] font-mono text-xs">{b.image}</td>
                    <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-[#fef2f2] text-[#dc2626]">{b.tag || "—"}</span></td>
                    <td className="px-4 py-3 text-[#6b7280]">{b.sort_order}</td>
                    <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full ${b.is_active ? "bg-[#10b981]" : "bg-[#9ca3af]"}`} /></td>
                    <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(b)} className="px-3 py-1 rounded-md text-xs font-semibold bg-[#f3f4f6] text-[#0a0a0a] hover:bg-[#e5e7eb] transition-colors">Edit</button><button onClick={() => handleDelete(b.id)} className="px-3 py-1 rounded-md text-xs font-semibold bg-[#fef2f2] text-[#dc2626] hover:bg-[#fecaca] transition-colors">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() { return (<div className="bg-white rounded-xl border border-[#e5e7eb] p-8">{[1,2,3,4].map((i) => (<div key={i} className="flex gap-4 mb-4 last:mb-0"><div className="h-5 w-1/4 rounded bg-[#f3f4f6] animate-pulse" /><div className="h-5 w-1/3 rounded bg-[#f3f4f6] animate-pulse" /><div className="h-5 w-1/6 rounded bg-[#f3f4f6] animate-pulse" /></div>))}</div>); }
function EmptyState({ message }: { message: string }) { return (<div className="bg-white rounded-xl border border-[#e5e7eb] p-12 text-center"><p className="text-[#9ca3af] text-sm">{message}</p></div>); }