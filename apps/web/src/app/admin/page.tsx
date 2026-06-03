"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem } from "@/lib/menu-data";
import { getImagePath } from "@/lib/menu-data";
import { logAudit } from "@/lib/audit-log";
import StorageImage from "@/app/_components/StorageImage";

const RED = "#dc2626";

/* ──────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────── */
interface Profile {
  id: string; full_name: string; email: string; role: string; phone: string | null; created_at: string;
}
type AdminTab = "dashboard" | "orders" | "menu" | "profiles" | "banners" | "images" | "audit" | "reports";

const NAV_ITEMS: { tab: AdminTab; label: string; icon: React.JSX.Element }[] = [
  { tab: "dashboard", label: "Dashboard", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5zM4 14a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" /> },
  { tab: "orders", label: "Orders", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 6h6m-6 4h4" /> },
  { tab: "menu", label: "Menu Items", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
  { tab: "profiles", label: "Profiles", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /> },
  { tab: "banners", label: "Banners", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
  { tab: "images", label: "Images", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
  { tab: "reports", label: "Reports", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
  { tab: "audit", label: "Audit Logs", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
];

/* ──────────────────────────────────────────────────
   Main Admin Shell
   ────────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.replace("/");
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: RED }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex">
      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ${sidebarOpen ? "w-60" : "w-16"}`}>
        <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-100 flex-shrink-0">
          <StorageImage imageBaseName="logo" alt="Sizzling Hub" className="w-7 h-7 rounded object-contain flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-black tracking-wide text-gray-900 truncate">ADMIN</span>}
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = tab === item.tab;
            return (
              <button key={item.tab} onClick={() => setTab(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${active ? "bg-red-50 text-red-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                title={!sidebarOpen ? item.label : undefined}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">{item.icon}</svg>
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-gray-100 p-2">
          <button onClick={() => setSidebarOpen((o) => !o)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors text-xs font-semibold">
            <svg className={`w-4 h-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            {sidebarOpen && "Collapse"}
          </button>
          <a href="/" className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors text-xs font-semibold">{sidebarOpen ? "← Back to Store" : "←"}</a>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "ml-60" : "ml-16"}`}>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {tab === "dashboard" && <DashboardPanel />}
          {tab === "profiles" && <ProfilesPanel />}
          {tab === "menu" && <MenuPanel />}
          {tab === "orders" && <OrdersPanel />}
          {tab === "images" && <ImagesPanel />}
          {tab === "banners" && <BannersPanel />}
          {tab === "audit" && <AuditLogsPanel />}
          {tab === "reports" && <ReportsPanel />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      <div className="mt-3 h-1 rounded-full bg-gray-100"><div className="h-full rounded-full transition-all duration-700" style={{ width: "60%", backgroundColor: color }} /></div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Dashboard Panel
   ────────────────────────────────────────────────── */
function DashboardPanel() {
  const [stats, setStats] = useState<{ totalOrders: number; totalRevenue: number; totalCustomers: number; totalMenuItems: number; pendingOrders: number; recentOrders: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const sb = createClient();
    const [{ count: orderCount }, { data: revenueRows }, { count: customerCount }, { count: menuCount }, { count: pendingCount }, { data: recent }] = await Promise.all([
      sb.from("orders").select("*", { count: "exact", head: true }),
      sb.from("orders").select("total").eq("status", "completed"),
      sb.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
      sb.from("menu_items").select("*", { count: "exact", head: true }),
      sb.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("orders").select("id, total, status, placed_at, customer:profiles(full_name)").order("placed_at", { ascending: false }).limit(5),
    ]);
    setStats({
      totalOrders: orderCount ?? 0,
      totalRevenue: revenueRows?.reduce((sum: number, r: any) => sum + Number(r.total), 0) ?? 0,
      totalCustomers: customerCount ?? 0,
      totalMenuItems: menuCount ?? 0,
      pendingOrders: pendingCount ?? 0,
      recentOrders: (recent ?? []).map((r: any) => ({ id: r.id, customer: (r.customer as any)?.full_name || "Unknown", total: Number(r.total), status: r.status, placed_at: r.placed_at })),
    });
    setLoading(false);
  }, []);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  if (loading) return <LoadingSkeleton />;
  if (!stats) return <EmptyState message="No data available." />;
  const rev = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(stats.totalRevenue);

  return (
    <div className="space-y-8">
      <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Dashboard</h2><p className="text-sm text-gray-400 mt-0.5">Store overview</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={rev} sub="Completed orders" color="#10b981" />
        <StatCard label="Orders" value={String(stats.totalOrders)} sub={`${stats.pendingOrders} pending`} color="#f59e0b" />
        <StatCard label="Customers" value={String(stats.totalCustomers)} color="#3b82f6" />
        <StatCard label="Menu Items" value={String(stats.totalMenuItems)} color="#ec4899" />
      </div>
      <div><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Orders</h3>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {stats.recentOrders.length === 0 ? <div className="p-6 text-center"><p className="text-sm text-gray-400">No orders yet.</p></div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Order</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Total</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold hidden sm:table-cell">Date</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-400">#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{o.customer}</td>
                    <td className="px-4 py-3 font-bold text-red-600">₱{o.total}</td>
                    <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${o.status === "completed" ? "bg-emerald-50 text-emerald-600" : o.status === "pending" ? "bg-amber-50 text-amber-600" : o.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{o.status}</span></td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{new Date(o.placed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Shared Order Types
   ────────────────────────────────────────────────── */
type OrderStatus = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" }, { value: "confirmed", label: "Confirmed" }, { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" }, { value: "delivered", label: "Delivered" }, { value: "cancelled", label: "Cancelled" },
];
const STATUS_BG: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-600", confirmed: "bg-blue-50 text-blue-600", preparing: "bg-purple-50 text-purple-600",
  out_for_delivery: "bg-orange-50 text-orange-600", delivered: "bg-cyan-50 text-cyan-600", cancelled: "bg-red-50 text-red-600",
};

/** Returns only the valid next statuses based on the current status. */
function getNextStatuses(current: OrderStatus): OrderStatus[] {
  switch (current) {
    case "pending":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["preparing", "cancelled"];
    case "preparing":
      return ["out_for_delivery", "cancelled"];
    case "out_for_delivery":
      return ["delivered", "cancelled"];
    case "delivered":
    case "cancelled":
      return [];
    default:
      return [];
  }
}
const OT_ICON: Record<OrderType, string> = { dine_in: "🍽️", takeout: "🛍️", delivery: "🛵" };
const OT_LABEL: Record<OrderType, string> = { dine_in: "Dine In", takeout: "Takeout", delivery: "Delivery" };

interface AdminOrder {
  id: string; customerName: string; customerEmail: string; orderType: OrderType; status: OrderStatus;
  subtotal: number; deliveryFee: number; discount: number; total: number; notes: string | null;
  items: { name: string; quantity: number; price: number }[]; placedAt: string; completedAt: string | null;
}

/* ──────────────────────────────────────────────────
   Profiles Panel
   ────────────────────────────────────────────────── */
function ProfilesPanel() {
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
      <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Profiles</h2><p className="text-sm text-gray-400 mt-0.5">{profiles.length} total users</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["all", "customer", "admin"] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${roleFilter === r ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}>{r === "all" ? "All" : r === "customer" ? "Customers" : "Admins"}</button>
          ))}
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email..." className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300" />
      </div>
      {filtered.length === 0 ? <EmptyState message="No profiles found." /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
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
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Menu Panel (with stock management)
   ────────────────────────────────────────────────── */
function MenuPanel() {
  const [items, setItems] = useState<(MenuItem & { categoryId?: string })[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", price: 0, categoryId: "", stock: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");

  const fetchItems = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("menu_items").select("id, name, price, image_url, stock, category_id, categories(name)").order("name");
    if (data) setItems(data.map((row: any) => ({ id: row.id, name: row.name, price: row.price, imageName: row.image_url || "", stock: row.stock ?? 0, category: row.categories?.name || "Uncategorized", categoryId: row.category_id })));
    const { data: cats } = await sb.from("categories").select("id, name").order("sort_order");
    if (cats) setCategories(cats);
    setLoading(false);
  }, []);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  function startEdit(item: MenuItem & { categoryId?: string }) { setEditing(item); setCreating(false); setForm({ name: item.name, price: item.price, categoryId: (item as any).categoryId || "", stock: item.stock ?? 0 }); setError(""); }
  function startCreate() { setCreating(true); setEditing(null); setForm({ name: "", price: 0, categoryId: categories[0]?.id || "", stock: 50 }); setError(""); }
  function cancelEdit() { setEditing(null); setCreating(false); setForm({ name: "", price: 0, categoryId: "", stock: 0 }); setError(""); }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.price < 0) { setError("Price must be positive."); return; }
    if (creating && !form.categoryId) { setError("Please select a category."); return; }
    setSaving(true); setError("");
    const sb = createClient();
    const imageUrl = form.name.trim().toLowerCase().replace(/\s+/g, "");
    if (editing) {
      await sb.from("menu_items").update({ name: form.name.trim(), price: form.price, image_url: imageUrl, stock: form.stock }).eq("id", editing.id);
      logAudit({ action: "update_menu_item", entity_type: "menu_item", entity_id: editing.id, details: { name: form.name.trim(), price: form.price, stock: form.stock } });
    } else if (creating) {
      const { error: insertErr } = await sb.from("menu_items").insert({ category_id: form.categoryId, name: form.name.trim(), price: form.price, image_url: imageUrl, stock: form.stock });
      if (insertErr) { setError(insertErr.message); setSaving(false); return; }
      logAudit({ action: "create_menu_item", entity_type: "menu_item", details: { name: form.name.trim(), price: form.price, stock: form.stock } });
    }
    setSaving(false); cancelEdit(); await fetchItems();
  }

  async function handleDelete(id: string) { if (!confirm("Delete this item?")) return; const sb = createClient(); const item = items.find((i) => i.id === id); await sb.from("menu_items").delete().eq("id", id); logAudit({ action: "delete_menu_item", entity_type: "menu_item", entity_id: id, details: { name: item?.name } }); await fetchItems(); }

  async function handleDeleteCategory(catId: string, catName: string) {
    if (!confirm(`Delete category "${catName}" and all its items?`)) return;
    const sb = createClient(); await sb.from("menu_items").delete().eq("category_id", catId); await sb.from("categories").delete().eq("id", catId);
    logAudit({ action: "delete_category", entity_type: "category", entity_id: catId, details: { name: catName } }); await fetchItems();
  }
  async function handleAddCategory() {
    if (!newCatName.trim()) { setCatError("Category name is required."); return; }
    setCatError(""); const sb = createClient();
    const { error: insertErr } = await sb.from("categories").insert({ name: newCatName.trim(), slug: newCatName.trim().toLowerCase().replace(/\s+/g, "-"), sort_order: categories.length + 1, is_active: true });
    if (insertErr) { setCatError(insertErr.message); return; }
    logAudit({ action: "create_category", entity_type: "category", details: { name: newCatName.trim() } }); setNewCatName(""); setAddingCat(false); await fetchItems();
  }

  const filteredItems = catFilter === "all" ? items : items.filter((item) => item.category === catFilter || (catFilter === "Uncategorized" && !item.category));
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
            {creating && (
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300">
                <option value="" className="bg-white">Select category</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id} className="bg-white">{cat.name}</option>))}
              </select>
            )}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2"><button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-red-700 transition-colors">{saving ? "Saving…" : "Save"}</button><button onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button></div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categories:</span>
            <div className="flex gap-1 flex-wrap items-center">
              <button onClick={() => setCatFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}>All</button>
              {categories.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-0.5">
                  <button onClick={() => setCatFilter(c.name)} className={`px-3 py-1.5 rounded-l-lg text-xs font-semibold transition-colors ${catFilter === c.name ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"}`}>{c.name}</button>
                  <button onClick={() => handleDeleteCategory(c.id, c.name)} className="px-1.5 py-1.5 rounded-r-lg text-xs font-bold transition-colors bg-gray-100 text-gray-300 hover:bg-red-50 hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          </div>
          {!addingCat && <button onClick={() => setAddingCat(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">+ Add Category</button>}
        </div>
      </div>
      {addingCat && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
          <input type="text" value={newCatName} onChange={(e) => { setNewCatName(e.target.value); setCatError(""); }} placeholder="Category name" autoFocus className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
          <button onClick={handleAddCategory} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold transition-colors hover:bg-red-700">Save</button>
          <button onClick={() => { setAddingCat(false); setNewCatName(""); setCatError(""); }} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors">Cancel</button>
          {catError && <p className="text-xs text-red-600">{catError}</p>}
        </div>
      )}
      {filteredItems.length === 0 ? <EmptyState message="No menu items." /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Image</th><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Price</th><th className="px-4 py-3 font-semibold">Stock</th><th className="px-4 py-3 font-semibold">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden"><StorageImage imageBaseName={item.imageName} alt={item.name} className="w-full h-full object-cover" /></div></td>
                <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                <td className="px-4 py-3 text-gray-500">{item.category}</td>
                <td className="px-4 py-3 font-bold text-red-600">₱{item.price}</td>
                <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${(item.stock ?? 0) <= 5 ? "bg-red-50 text-red-600" : (item.stock ?? 0) <= 20 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{item.stock ?? 0}</span></td>
                <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(item)} className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Edit</button><button onClick={() => handleDelete(item.id)} className="px-3 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Orders Panel
   ────────────────────────────────────────────────── */
function OrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<AdminOrder | null>(null);
  const hasOrdersLoaded = React.useRef(false);
  const fetchOrders = useCallback(async () => {
    if (!hasOrdersLoaded.current) setLoading(true);
    const sb = createClient();
    const { data: rows } = await sb.from("orders").select("id, order_type, status, subtotal, delivery_fee, discount, total, notes, placed_at, completed_at, customer:profiles(full_name, email)").order("placed_at", { ascending: false });
    if (!rows) { setOrders([]); setLoading(false); return; }
    const ids = rows.map((r: any) => r.id);
    const { data: items } = await sb.from("order_items").select("order_id, quantity, unit_price, note, menu_item:menu_items(name)").in("order_id", ids);
    const itemsByOrder = new Map<string, { name: string; quantity: number; price: number; note: string }[]>();
    if (items) for (const it of items) { const arr = itemsByOrder.get(it.order_id) || []; arr.push({ name: (it.menu_item as any)?.name || "Unknown", quantity: it.quantity, price: it.unit_price, note: it.note ?? "" }); itemsByOrder.set(it.order_id, arr); }
    setOrders(rows.map((r: any) => ({ id: r.id, customerName: (r.customer as any)?.full_name || (r.customer as any)?.email || "N/A", customerEmail: (r.customer as any)?.email || "", orderType: r.order_type as OrderType, status: r.status as OrderStatus, subtotal: r.subtotal, deliveryFee: r.delivery_fee, discount: r.discount, total: r.total, notes: r.notes, items: itemsByOrder.get(r.id) || [], placedAt: r.placed_at, completedAt: r.completed_at })));
    setLoading(false);
    hasOrdersLoaded.current = true;
  }, []);
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 1000);
    return () => clearInterval(interval);
  }, [fetchOrders]);
  async function handleDeleteOrder(orderId: string) { if (!confirm("Delete permanently?")) return; const sb = createClient(); await sb.from("orders").delete().eq("id", orderId); logAudit({ action: "delete_order", entity_type: "order", entity_id: orderId }); await fetchOrders(); }
  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    const oldOrder = orders.find((o) => o.id === orderId); setSavingId(orderId); const sb = createClient();
    const updates: Record<string, unknown> = { status: newStatus }; if (newStatus === "delivered") updates.completed_at = new Date().toISOString();

    // Prompt for cancellation reason
    if (newStatus === "cancelled" && oldOrder && oldOrder.status !== "cancelled") {
      const reason = window.prompt("Reason for cancellation (optional):");
      if (reason !== null) {
        updates.notes = (oldOrder.notes ? oldOrder.notes + "\n" : "") + `[Cancelled by admin]: ${reason || "No reason given"}`;
      }
    }

    await sb.from("orders").update(updates).eq("id", orderId);

    // Restore stock if cancelling an order
    if (newStatus === "cancelled" && oldOrder && oldOrder.status !== "cancelled") {
      const { data: items } = await sb.from("order_items").select("menu_item_id, quantity").eq("order_id", orderId);
      if (items) {
        for (const it of items) {
          await sb.rpc("restore_stock", { p_menu_item_id: it.menu_item_id, p_quantity: it.quantity });
        }
      }
    }

    logAudit({ action: "update_order_status", entity_type: "order", entity_id: orderId, details: { from: oldOrder?.status, to: newStatus } });
    await fetchOrders(); setSavingId(null);
    if (oldOrder?.status === "pending" && newStatus !== "pending") setReceiptOrder(orders.find((o) => o.id === orderId) || null);
  }
  function fmt(iso: string) { const d = new Date(iso); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const h = d.getHours(); const mi = d.getMinutes().toString().padStart(2, "0"); const a = h >= 12 ? "PM" : "AM"; return `${m[d.getMonth()]} ${d.getDate()}, ${h % 12 || 12}:${mi} ${a}`; }
  function toggleExpand(id: string) { setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const filtered = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Orders</h2><p className="text-sm text-gray-400 mt-0.5">{orders.length} total</p></div>
        <button onClick={() => fetchOrders()} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setStatusFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All</button>
        {STATUS_OPTIONS.map((s) => (<button key={s.value} onClick={() => setStatusFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === s.value ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{s.label}</button>))}
      </div>
      {filtered.length === 0 ? <EmptyState message="No orders." /> : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const s = STATUS_BG[o.status]; const isEx = expanded.has(o.id);
            return (
              <div key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleExpand(o.id)}>
                  <div className="flex-shrink-0 text-gray-300 text-sm">{isEx ? "▼" : "▶"}</div>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-gray-400">#{o.id.slice(0, 8).toUpperCase()}…</span><span className="text-xs text-gray-400">{OT_ICON[o.orderType]} {OT_LABEL[o.orderType]}</span></div><p className="text-sm font-semibold text-gray-800 truncate">{o.customerName}</p></div>
                  <div className="text-right flex-shrink-0"><p className="text-sm font-black text-red-600">₱{o.total}</p><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${s}`}>{o.status}</span></div>
                </div>
                {isEx && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                    <div className="space-y-2">{o.items.map((item, i) => {
                      const itemNote = (item as any).note ?? "";
                      return (
                      <div key={i}>
                        <div className="flex items-center gap-2 text-sm"><span className="text-xs font-bold text-gray-300 w-7">x{item.quantity}</span><span className="flex-1 font-semibold text-gray-700">{item.name}</span><span className="font-bold text-gray-600">₱{item.price * item.quantity}</span></div>
                        {itemNote && <p className="text-xs text-gray-400 italic ml-9 mt-0.5">"{itemNote}"</p>}
                      </div>
                    );
                    })}</div>
                    <div className="border-t border-gray-200 pt-2 space-y-0.5 text-xs text-gray-500"><div className="flex justify-between"><span>Subtotal</span><span className="font-semibold text-gray-700">₱{o.subtotal}</span></div>{o.deliveryFee > 0 && <div className="flex justify-between"><span>Delivery Fee</span><span className="font-semibold text-gray-700">₱{o.deliveryFee}</span></div>}{o.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="font-semibold">-₱{o.discount}</span></div>}<div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span className="text-red-600">₱{o.total}</span></div></div>
                    <div className="text-xs text-gray-400 space-y-0.5"><p>Placed: {new Date(o.placedAt).toLocaleString()}</p>{o.completedAt && <p>Completed: {new Date(o.completedAt).toLocaleString()}</p>}{o.notes && <p className="italic">Note: {o.notes}</p>}</div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      {o.status !== "delivered" && o.status !== "cancelled" ? (
                        <>
                          <span className="text-xs font-semibold text-gray-400">Status:</span>
                          <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)} disabled={savingId === o.id} className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30">
                            <option value={o.status} className="bg-white">{o.status.replace(/_/g, " ")} (current)</option>
                            {getNextStatuses(o.status).map((s) => (
                              <option key={s} value={s} className="bg-white">{s.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                          {savingId === o.id && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-gray-400">Status: {o.status.replace(/_/g, " ")} (final)</span>
                      )}
                      {o.status !== "pending" && <button onClick={(e) => { e.stopPropagation(); setReceiptOrder(o); }} className="ml-auto px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100">Print Receipt</button>}
                      {(o.status === "pending" || o.status === "delivered" || o.status === "cancelled") && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o.id); }} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {receiptOrder && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setReceiptOrder(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <style jsx global>{`@media print { body * { visibility: hidden; } .receipt-popup, .receipt-popup * { visibility: visible; } .receipt-popup { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; max-height: none !important; } .no-print { display: none !important; } @page { margin: 10mm; size: auto; } }`}</style>
              <div className="receipt-popup p-5">
                <div className="text-center mb-4"><h2 className="text-xl font-black text-red-600">BEN'S TAPSIHAN</h2><p className="text-xs text-gray-400 font-mono mt-0.5">Order Receipt</p></div>
                <div className="border-t border-b border-dashed border-gray-200 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Order #</span><span className="font-mono font-bold text-gray-900">{receiptOrder.id.slice(0, 8).toUpperCase()}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Customer</span><span className="font-semibold text-gray-800">{receiptOrder.customerName}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Type</span><span className="font-semibold text-gray-800">{OT_ICON[receiptOrder.orderType]} {OT_LABEL[receiptOrder.orderType]}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Placed</span><span className="font-semibold text-gray-800">{fmt(receiptOrder.placedAt)}</span></div>
                </div>
                <div className="py-3 space-y-2"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Items</p>{receiptOrder.items.map((item, i) => (<div key={i} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-300 w-7">x{item.quantity}</span><span className="font-semibold text-gray-700">{item.name}</span></div><span className="font-bold text-gray-600">₱{item.price * item.quantity}</span></div>))}</div>
                <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold text-gray-700">₱{receiptOrder.subtotal}</span></div>
                  {receiptOrder.deliveryFee > 0 && <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span className="font-semibold text-gray-700">₱{receiptOrder.deliveryFee}</span></div>}
                  {receiptOrder.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="font-semibold">-₱{receiptOrder.discount}</span></div>}
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 mt-1"><span className="text-base font-extrabold text-gray-900">Total</span><span className="text-lg font-extrabold text-red-600">₱{receiptOrder.total}</span></div>
                </div>
                <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-200"><p className="text-xs text-gray-400">Thank you!</p></div>
                <div className="flex gap-2 mt-4 no-print"><button onClick={() => window.print()} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">🖨 Print Receipt</button><button onClick={() => setReceiptOrder(null)} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">Close</button></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Images Panel
   ────────────────────────────────────────────────── */
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
    if (!file.type.startsWith("image/")) { alert("Only images allowed."); return; }
    setUploading(true); const sb = createClient(); const fn = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error } = await sb.storage.from("images").upload(fn, file);
    if (error) alert("Upload failed: " + error.message); else logAudit({ action: "upload_image", entity_type: "image", entity_id: fn, details: { originalName: file.name } });
    setUploading(false); await fetchImages(); e.target.value = "";
  }
  async function handleDelete(name: string) { if (!confirm(`Delete "${name}"?`)) return; setDeleting(name); const sb = createClient(); const { error } = await sb.storage.from("images").remove([name]); if (error) alert("Delete failed"); else logAudit({ action: "delete_image", entity_type: "image", entity_id: name }); setDeleting(null); await fetchImages(); }
  if (loading) return <LoadingSkeleton />;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-gray-900 tracking-tight">Image Manager</h2><p className="text-sm text-gray-400 mt-0.5">{images.length} files</p></div>
        <label className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 cursor-pointer">{uploading ? "Uploading…" : "+ Upload Image"}<input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" /></label>
      </div>
      {images.length === 0 ? <EmptyState message="No images." /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {images.map((img) => (
            <div key={img.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:border-gray-300 hover:shadow-sm transition-all">
              <div className="w-full h-32 bg-gray-100 relative overflow-hidden">
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).src = getImagePath("placeholder.png"); }} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(img.url); alert("URL copied!"); }} className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white" title="Copy URL"><svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                  <button onClick={() => handleDelete(img.name)} disabled={deleting === img.name} className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center hover:bg-red-100" title="Delete"><svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                {deleting === img.name && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white text-xs font-bold">Deleting…</span></div>}
              </div>
              <div className="p-2"><p className="text-xs font-medium text-gray-600 truncate">{img.name}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Banners Panel
   ────────────────────────────────────────────────── */
function BannersPanel() {
  const [banners, setBanners] = useState<{ id: string; title: string; subtitle: string; image: string; tag: string | null; sort_order: number; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", image: "", tag: "", sort_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
  async function handleDelete(id: string) { if (!confirm("Delete?")) return; const sb = createClient(); await sb.from("banners").delete().eq("id", id); logAudit({ action: "delete_banner", entity_type: "banner", entity_id: id }); await fetchBanners(); }
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
              <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => startEdit(b)} className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Edit</button><button onClick={() => handleDelete(b.id)} className="px-3 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">Delete</button></div></td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Audit Logs Panel
   ────────────────────────────────────────────────── */
interface AuditLogEntry { id: string; actor_email: string | null; source: string; action: string; entity_type: string | null; entity_id: string | null; details: Record<string, unknown> | null; created_at: string; }

function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | "admin" | "customer">("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const hasLogsLoaded = React.useRef(false);
  const fetchLogs = useCallback(async (silent = false) => {
    if (!hasLogsLoaded.current) setLoading(true);
    const sb = createClient();
    const { data } = await sb.from("audit_logs").select("id, actor_email, source, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false }).limit(200);
    if (data) setLogs(data as AuditLogEntry[]);
    setLoading(false);
    hasLogsLoaded.current = true;
  }, []);
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(true), 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);
  const sourceFiltered = sourceFilter === "all" ? logs : logs.filter((l) => l.source === sourceFilter);
  const actionTypes = [...new Set(sourceFiltered.map((l) => l.action))];
  const filtered = actionFilter === "all" ? sourceFiltered : sourceFiltered.filter((l) => l.action === actionFilter);
  const adminCount = logs.filter((l) => l.source === "admin").length;
  const customerCount = logs.filter((l) => l.source === "customer").length;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Audit Logs</h2><p className="text-sm text-gray-400 mt-0.5">Track admin and customer activity</p></div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setSourceFilter("all"); setActionFilter("all"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${sourceFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All ({logs.length})</button>
        <button onClick={() => { setSourceFilter("admin"); setActionFilter("all"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${sourceFilter === "admin" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>🛡️ Admin ({adminCount})</button>
        <button onClick={() => { setSourceFilter("customer"); setActionFilter("all"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${sourceFilter === "customer" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>👤 Customers ({customerCount})</button>
      </div>
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setActionFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${actionFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All actions</button>
        {actionTypes.map((a) => (<button key={a} onClick={() => setActionFilter(a)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${actionFilter === a ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{a.replace(/_/g, " ")}</button>))}
      </div>
      {filtered.length === 0 ? <EmptyState message="No audit logs." /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Time</th><th className="px-4 py-3 font-semibold">Source</th><th className="px-4 py-3 font-semibold">Actor</th><th className="px-4 py-3 font-semibold">Action</th><th className="px-4 py-3 font-semibold hidden sm:table-cell">Entity</th><th className="px-4 py-3 font-semibold hidden md:table-cell">Details</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${log.source === "admin" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{log.source === "admin" ? "Admin" : "Customer"}</span></td>
                <td className="px-4 py-3 font-semibold text-gray-600">{log.actor_email || "System"}</td>
                <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">{log.action.replace(/_/g, " ")}</span></td>
                <td className="px-4 py-3 hidden sm:table-cell">{log.entity_type && <span className="text-gray-400 text-xs">{log.entity_type}{log.entity_id && <span className="text-gray-300 font-mono ml-1">{log.entity_id.slice(0, 8)}</span>}</span>}</td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs font-mono max-w-[200px] truncate">{log.details ? JSON.stringify(log.details) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Reports Panel
   ────────────────────────────────────────────────── */
function ReportsPanel() {
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [report, setReport] = useState<{
    totalRevenue: number; totalOrders: number; avgOrderValue: number;
    byType: { type: string; count: number; revenue: number }[];
    topItems: { name: string; sold: number; revenue: number }[];
    dailyRevenue: { date: string; revenue: number; orders: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    let fromDate: string | null = null;
    const now = new Date();
    if (dateRange === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); fromDate = d.toISOString(); }
    else if (dateRange === "7d") { const d = new Date(now); d.setDate(d.getDate() - 7); fromDate = d.toISOString(); }
    else if (dateRange === "30d") { const d = new Date(now); d.setDate(d.getDate() - 30); fromDate = d.toISOString(); }

    let ordersQuery = sb.from("orders").select("id, order_type, total, placed_at").eq("status", "completed");
    if (fromDate) ordersQuery = ordersQuery.gte("placed_at", fromDate);
    const { data: orders } = await ordersQuery.order("placed_at", { ascending: false });

    let itemsQuery = sb.from("order_items").select("quantity, unit_price, menu_item:menu_items(name)");
    if (fromDate) itemsQuery = itemsQuery.gte("created_at", fromDate);
    const { data: allItems } = await itemsQuery;

    if (!orders) { setLoading(false); return; }

    const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // By order type
    const typeMap = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      const t = o.order_type || "unknown";
      const e = typeMap.get(t) || { count: 0, revenue: 0 };
      e.count++; e.revenue += Number(o.total);
      typeMap.set(t, e);
    }
    const byType = Array.from(typeMap.entries()).map(([type, v]) => ({ type, count: v.count, revenue: v.revenue }));

    // Top items
    const itemMap = new Map<string, { sold: number; revenue: number }>();
    if (allItems) {
      for (const it of allItems) {
        const name = (it.menu_item as any)?.name || "Unknown";
        const e = itemMap.get(name) || { sold: 0, revenue: 0 };
        e.sold += it.quantity;
        e.revenue += it.quantity * Number(it.unit_price);
        itemMap.set(name, e);
      }
    }
    const topItems = Array.from(itemMap.entries()).map(([name, v]) => ({ name, sold: v.sold, revenue: v.revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Daily revenue
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const d = new Date(o.placed_at).toLocaleDateString("en-CA");
      const e = dayMap.get(d) || { revenue: 0, orders: 0 };
      e.revenue += Number(o.total); e.orders++;
      dayMap.set(d, e);
    }
    const dailyRevenue = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));

    setReport({ totalRevenue, totalOrders, avgOrderValue, byType, topItems, dailyRevenue });
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  if (loading) return <LoadingSkeleton />;
  if (!report) return <EmptyState message="No data." />;

  const fmt = (v: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(v);
  const maxDaily = Math.max(...report.dailyRevenue.map((d) => d.revenue), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Sales Reports</h2><p className="text-sm text-gray-400 mt-0.5">Business performance overview</p></div>
        <div className="flex gap-1">
          {(["today", "7d", "30d", "all"] as const).map((r) => (
            <button key={r} onClick={() => setDateRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${dateRange === r ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</p><p className="text-2xl font-black text-gray-900 mt-1">{fmt(report.totalRevenue)}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Orders</p><p className="text-2xl font-black text-gray-900 mt-1">{report.totalOrders}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Order Value</p><p className="text-2xl font-black text-gray-900 mt-1">{fmt(report.avgOrderValue)}</p></div>
      </div>

      {/* Revenue Trend Chart */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue Trend</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {report.dailyRevenue.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No data for this period.</p> : (
            <div className="flex items-end gap-1" style={{ height: "160px" }}>
              {report.dailyRevenue.map((d) => {
                const pct = (d.revenue / maxDaily) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.date}: ${fmt(d.revenue)} (${d.orders} orders)`}>
                    <span className="text-[10px] text-gray-400 font-semibold">{fmt(d.revenue)}</span>
                    <div className="w-full bg-red-500 rounded-t transition-all duration-300" style={{ height: `${pct}%`, minHeight: "4px" }} />
                    <span className="text-[10px] text-gray-300">{new Date(d.date).getDate()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Type + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Order Type */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">By Order Type</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Orders</th><th className="px-4 py-3 font-semibold">Revenue</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {report.byType.map((t) => (
                  <tr key={t.type} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800 capitalize">{t.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-600">{t.count}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{fmt(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Items */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Top Selling Items</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Item</th><th className="px-4 py-3 font-semibold">Sold</th><th className="px-4 py-3 font-semibold">Revenue</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {report.topItems.map((it, i) => (
                  <tr key={it.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800"><span className="text-gray-300 mr-2">#{i + 1}</span>{it.name}</td>
                    <td className="px-4 py-3 text-gray-600">{it.sold}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{fmt(it.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Shared: Loading & Empty
   ────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (<div className="bg-white rounded-xl border border-gray-200 p-8 space-y-3">{[1, 2, 3, 4].map((i) => (<div key={i} className="flex gap-4"><div className="h-5 w-1/4 rounded bg-gray-100 animate-pulse" /><div className="h-5 w-1/3 rounded bg-gray-100 animate-pulse" /><div className="h-5 w-1/6 rounded bg-gray-100 animate-pulse" /></div>))}</div>);
}
function EmptyState({ message }: { message: string }) {
  return (<div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><p className="text-gray-300 text-sm">{message}</p></div>);
}