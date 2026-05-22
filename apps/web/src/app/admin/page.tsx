"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getImagePath, type MenuItem } from "@/lib/menu-data";

/* ───────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────── */
interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  created_at: string;
}

interface Order {
  id: string;
  customer_name: string;
  status: string;
  total: number;
  placed_at: string;
  items_count: number;
}

type AdminTab = "profiles" | "menu" | "orders";

/* ───────────────────────────────────────────────
   Admin Dashboard
   ─────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("profiles");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
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
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Sizzling Hub" className="w-9 h-9 rounded-lg object-contain" />
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "#dc2626" }}>
              ADMIN PANEL
            </h1>
          </div>
          <a
            href="/"
            className="text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors"
          >
            ← Back to Store
          </a>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="bg-white border-b border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {(["profiles", "menu", "orders"] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? "border-[#dc2626] text-[#dc2626]"
                  : "border-transparent text-[#6b7280] hover:text-[#0a0a0a]"
              }`}
            >
              {t === "profiles" ? "Profiles" : t === "menu" ? "Menu Items" : "Orders"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        {tab === "profiles" && <ProfilesPanel />}
        {tab === "menu" && <MenuPanel />}
        {tab === "orders" && <OrdersPanel />}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Profiles Panel
   ─────────────────────────────────────────────── */
function ProfilesPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb
        .from("profiles")
        .select("id, full_name, email, role, phone, created_at")
        .order("created_at", { ascending: false });
      if (data) setProfiles(data as Profile[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!profiles.length) return <EmptyState message="No profiles found." />;

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f9fafb] text-left text-xs uppercase text-[#6b7280] tracking-wider">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {profiles.map((p) => (
              <tr key={p.id} className="hover:bg-[#f9fafb]">
                <td className="px-4 py-3 font-medium text-[#0a0a0a]">
                  {p.full_name || "—"}
                </td>
                <td className="px-4 py-3 text-[#6b7280]">{p.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      p.role === "admin"
                        ? "bg-[#fef2f2] text-[#dc2626]"
                        : "bg-[#f0fdf4] text-[#16a34a]"
                    }`}
                  >
                    {p.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6b7280]">{p.phone || "—"}</td>
                <td className="px-4 py-3 text-[#6b7280] text-xs">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Menu Panel (CRUD)
   ─────────────────────────────────────────────── */
function MenuPanel() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", price: 0, imageName: "", categoryId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb
      .from("menu_items")
      .select("id, name, price, image_url, category_id, categories(name)")
      .order("name");
    if (data) {
      setItems(
        data.map((row: any) => ({
          id: row.id,
          name: row.name,
          price: row.price,
          imageName: row.image_url || "",
          category: row.categories?.name || "Uncategorized",
          categoryId: row.category_id,
        }))
      );
    }
    // Also fetch categories for create dropdown
    const { data: cats } = await sb
      .from("categories")
      .select("id, name")
      .order("sort_order");
    if (cats) setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function startEdit(item: MenuItem & { categoryId?: string }) {
    setEditing(item);
    setCreating(false);
    setForm({ name: item.name, price: item.price, imageName: item.imageName, categoryId: (item as any).categoryId || "" });
    setError("");
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm({ name: "", price: 0, imageName: "", categoryId: categories[0]?.id || "" });
    setError("");
  }

  function cancelEdit() {
    setEditing(null);
    setCreating(false);
    setForm({ name: "", price: 0, imageName: "", categoryId: "" });
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.price < 0) { setError("Price must be positive."); return; }
    if (creating && !form.categoryId) { setError("Please select a category."); return; }
    setSaving(true);
    setError("");
    const sb = createClient();
    if (editing) {
      await sb.from("menu_items").update({
        name: form.name.trim(),
        price: form.price,
        image_url: form.imageName.trim(),
      }).eq("id", editing.id);
    } else if (creating) {
      const { error: insertErr } = await sb.from("menu_items").insert({
        category_id: form.categoryId,
        name: form.name.trim(),
        price: form.price,
        image_url: form.imageName.trim(),
      });
      if (insertErr) {
        setError(insertErr.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    cancelEdit();
    await fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    const sb = createClient();
    await sb.from("menu_items").delete().eq("id", id);
    await fetchItems();
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Add New Button + Edit/Create Form */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0a0a0a]">Menu Items</h2>
        {!editing && !creating && (
          <button
            onClick={startCreate}
            className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: "#dc2626" }}
          >
            + Add New Item
          </button>
        )}
      </div>

      {/* Edit / Create Form */}
      {(editing || creating) && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 space-y-3">
          <h3 className="font-bold text-sm text-[#0a0a0a]">
            {editing ? `Edit: ${editing.name}` : "Add New Menu Item"}
          </h3>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm"
          />
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            placeholder="Price"
            className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm"
          />
          <input
            type="text"
            value={form.imageName}
            onChange={(e) => setForm({ ...form, imageName: e.target.value })}
            placeholder="Image filename (e.g. barsilog.jpg)"
            className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm"
          />
          {creating && (
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
          {error && <p className="text-xs text-[#dc2626]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white text-sm font-bold"
              style={{ backgroundColor: saving ? "#fca5a5" : "#dc2626" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-medium text-[#6b7280]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f9fafb] text-left text-xs uppercase text-[#6b7280] tracking-wider">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[#f9fafb]">
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-[#f3f4f6] overflow-hidden">
                      <img
                        src={getImagePath(item.imageName)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder.png"; }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#0a0a0a]">{item.name}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{item.category}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#dc2626" }}>₱{item.price}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-[#f3f4f6] text-[#0a0a0a] hover:bg-[#e5e7eb] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-[#fef2f2] text-[#dc2626] hover:bg-[#fecaca] transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#9ca3af] text-sm">
                    No menu items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Orders Panel (Read Only)
   ─────────────────────────────────────────────── */
function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb
        .from("orders")
        .select("id, status, total, placed_at, customer:profiles(full_name)")
        .order("placed_at", { ascending: false });
      if (data) {
        setOrders(
          data.map((row: any) => ({
            id: row.id,
            customer_name: (row.customer as any)?.full_name || "Unknown",
            status: row.status,
            total: row.total,
            placed_at: row.placed_at,
            items_count: 0,
          }))
        );
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!orders.length) return <EmptyState message="No orders yet." />;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-purple-100 text-purple-800",
    ready: "bg-green-100 text-green-800",
    delivered: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f9fafb] text-left text-xs uppercase text-[#6b7280] tracking-wider">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-[#f9fafb]">
                <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">
                  {o.id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 font-medium text-[#0a0a0a]">
                  {o.customer_name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      statusColors[o.status] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold" style={{ color: "#dc2626" }}>
                  ₱{o.total}
                </td>
                <td className="px-4 py-3 text-[#6b7280] text-xs">
                  {new Date(o.placed_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Shared Components
   ─────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4 mb-4 last:mb-0">
          <div className="h-5 w-1/4 rounded bg-[#f3f4f6] animate-pulse" />
          <div className="h-5 w-1/3 rounded bg-[#f3f4f6] animate-pulse" />
          <div className="h-5 w-1/6 rounded bg-[#f3f4f6] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-12 text-center">
      <p className="text-[#9ca3af] text-sm">{message}</p>
    </div>
  );
}