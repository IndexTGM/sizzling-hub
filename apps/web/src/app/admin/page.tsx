"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import StorageImage from "@/app/_components/StorageImage";

import dynamic from "next/dynamic";
import DashboardPanel from "./panels/DashboardPanel";
import ProfilesPanel from "./panels/ProfilesPanel";
import MenuPanel from "./panels/MenuPanel";
import OrdersPanel from "./panels/OrdersPanel";
import ImagesPanel from "./panels/ImagesPanel";
import BannersPanel from "./panels/BannersPanel";
import ReportsPanel from "./panels/ReportsPanel";
import ReceiptsPanel from "./panels/ReceiptsPanel";

const MapPicker = dynamic(() => import("@/app/_components/MapPicker"), { ssr: false });

const RED = "#dc2626";

interface BranchOption {
  id: string;
  name: string;
}

type AdminTab = "dashboard" | "orders" | "menu" | "profiles" | "banners" | "images" | "reports" | "receipts";

const NAV_ITEMS: { tab: AdminTab; label: string; icon: React.JSX.Element }[] = [
  { tab: "dashboard", label: "Dashboard", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5zM4 14a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" /> },
  { tab: "orders", label: "Orders", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 6h6m-6 4h4" /> },
  { tab: "menu", label: "Menu Items", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
  { tab: "profiles", label: "Profiles", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /> },
  { tab: "banners", label: "Banners", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
  { tab: "images", label: "Images", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
  { tab: "reports", label: "Reports", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
  { tab: "receipts", label: "Receipts", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
];

const TAB_LABELS: Record<AdminTab, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  menu: "Menu Items",
  profiles: "Profiles",
  banners: "Banners",
  images: "Images",
  reports: "Reports",
  receipts: "Receipts",
};

function DevBranchGate({
  onSelect,
  branches,
  setBranches,
}: {
  onSelect: (id: string | null) => void;
  branches: BranchOption[];
  setBranches: React.Dispatch<React.SetStateAction<BranchOption[]>>;
}) {
  const [gateLoading, setGateLoading] = useState(true);
  const [gateAdding, setGateAdding] = useState(false);
  const [gateForm, setGateForm] = useState({ name: "", address: "", phone: "", email: "", lat: 14.4566673, lng: 121.0446128, delivery_radius_km: 3, is_active: true });
  const [gateFormError, setGateFormError] = useState("");
  const [gateSaving, setGateSaving] = useState(false);
  const [gateEditingId, setGateEditingId] = useState<string | null>(null);
  const [gateDeleteId, setGateDeleteId] = useState<string | null>(null);

  function handleGateMapAddressChange(parts: { street: string; city: string; province: string; zip: string; lat: number; lng: number }) {
    const addressParts = [parts.street, parts.city, parts.province].filter(Boolean);
    setGateForm((prev) => ({
      ...prev,
      address: addressParts.join(", "),
      lat: parts.lat,
      lng: parts.lng,
    }));
  }

  function resetGateForm() {
    setGateForm({ name: "", address: "", phone: "", email: "", lat: 14.4566673, lng: 121.0446128, delivery_radius_km: 3, is_active: true });
    setGateFormError("");
    setGateEditingId(null);
  }

  async function refreshGateBranches() {
    const sb = createClient();
    const { data } = await sb.from("branches").select("id, name, lat, lng, delivery_radius_km, address, phone, email, is_active").order("name");
    if (data) setBranches(data);
    setGateLoading(false);
  }

  // Initial fetch
  useEffect(() => { refreshGateBranches(); }, []);

  async function handleGateSave() {
    if (!gateForm.name.trim()) { setGateFormError("Branch name is required."); return; }

    // Check for duplicate name
    const nameLower = gateForm.name.trim().toLowerCase();
    const dup = branches.find(
      (b) => b.name.toLowerCase() === nameLower && b.id !== gateEditingId
    );
    if (dup) {
      setGateFormError("A branch with this name already exists.");
      return;
    }

    setGateSaving(true);
    const sb = createClient();
    const payload = { name: gateForm.name.trim(), address: gateForm.address.trim() || null, phone: gateForm.phone.trim() || null, email: gateForm.email.trim() || null, lat: gateForm.lat, lng: gateForm.lng, delivery_radius_km: gateForm.delivery_radius_km, is_active: gateForm.is_active, updated_at: new Date().toISOString() };
    if (gateEditingId) {
      const { error } = await sb.from("branches").update(payload).eq("id", gateEditingId);
      if (error) { setGateFormError(error.message); setGateSaving(false); return; }
    } else {
      const { error } = await sb.from("branches").insert(payload);
      if (error) { setGateFormError(error.message); setGateSaving(false); return; }
    }
    setGateSaving(false);
    resetGateForm();
    await refreshGateBranches();
  }

  async function handleGateDelete(id: string) {
    const sb = createClient();
    // Null out branch_id in profiles referencing this branch before deleting
    await sb.from("profiles").update({ branch_id: null }).eq("branch_id", id);
    await sb.from("branches").delete().eq("id", id);
    await refreshGateBranches();
    setGateDeleteId(null);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Store
          </a>
          <StorageImage imageBaseName="logo" alt="Sizzling Hub" className="w-16 h-16 rounded-xl object-contain mx-auto mb-4 bg-gray-100" />
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dev Panel</h1>
          <p className="text-sm text-gray-400 mt-1">Manage all branches or add a new one</p>
        </div>
        <div className="space-y-3">
          {gateLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-3 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: RED }} />
              <p className="text-sm text-gray-400 mt-3">Loading branches…</p>
            </div>
          ) : branches.length === 0 && !gateAdding ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No branches yet.</p>
              <p className="text-xs text-gray-300 mt-1">Click "Add New Branch" below to create one.</p>
            </div>
          ) : null}
          {branches.map((b: any) => (
            <div key={b.id} className="flex items-center gap-3">
              <button
                onClick={() => onSelect(b.id)}
                className="flex-1 flex items-center gap-4 px-5 py-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-red-300 hover:shadow-md transition-all duration-200 text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 group-hover:text-red-600 transition-colors">{b.name}</p>
                  <p className="text-xs text-gray-400 truncate">{b.address || "No address"}</p>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={() => { setGateEditingId(b.id); setGateForm({ name: b.name, address: b.address || "", phone: b.phone || "", email: b.email || "", lat: b.lat || 14.4566673, lng: b.lng || 121.0446128, delivery_radius_km: b.delivery_radius_km || 3, is_active: b.is_active }); setGateAdding(true); }} className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors" title="Edit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => setGateDeleteId(b.id)} className="p-2 rounded-lg bg-red-50 text-red-300 hover:text-red-600 hover:bg-red-100 transition-colors" title="Delete">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
          {!gateAdding && (
            <button onClick={() => { setGateAdding(true); setGateEditingId(null); resetGateForm(); }} className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 text-sm font-semibold hover:border-red-300 hover:text-red-500 transition-colors">
              + Add New Branch
            </button>
          )}
        </div>
        {gateAdding && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900">{gateEditingId ? "Edit Branch" : "New Branch"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={gateForm.name} onChange={(e) => setGateForm({ ...gateForm, name: e.target.value })} placeholder="Branch Name" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
              <input type="text" value={gateForm.phone} onChange={(e) => setGateForm({ ...gateForm, phone: e.target.value })} placeholder="Phone" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
              <input type="text" value={gateForm.email} onChange={(e) => setGateForm({ ...gateForm, email: e.target.value })} placeholder="Email" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Pin Location</label>
              <MapPicker
                key={gateEditingId || "new"}
                initialLat={gateForm.lat}
                initialLng={gateForm.lng}
                storeLat={gateForm.lat}
                storeLng={gateForm.lng}
                storeRadiusKm={gateForm.delivery_radius_km}
                onAddressChange={handleGateMapAddressChange}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" value={gateForm.lat} onChange={(e) => setGateForm({ ...gateForm, lat: parseFloat(e.target.value) || 0 })} placeholder="Latitude" step="0.000001" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 font-mono" />
              <input type="number" value={gateForm.lng} onChange={(e) => setGateForm({ ...gateForm, lng: parseFloat(e.target.value) || 0 })} placeholder="Longitude" step="0.000001" className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 font-mono" />
              <input type="number" value={gateForm.delivery_radius_km} onChange={(e) => setGateForm({ ...gateForm, delivery_radius_km: parseFloat(e.target.value) || 0 })} placeholder="Radius (km)" min={0.5} step={0.5} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
            </div>
            <input type="text" value={gateForm.address} onChange={(e) => setGateForm({ ...gateForm, address: e.target.value })} placeholder="Address (optional)" className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
            <label className="flex items-center gap-2 text-sm text-gray-500"><input type="checkbox" checked={gateForm.is_active} onChange={(e) => setGateForm({ ...gateForm, is_active: e.target.checked })} className="rounded border-gray-300 text-red-600 focus:ring-red-500/30" /> Active</label>
            {gateFormError && <p className="text-xs text-red-600">{gateFormError}</p>}
            <div className="flex gap-2"><button onClick={handleGateSave} disabled={gateSaving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40">{gateSaving ? "Saving…" : "Save"}</button><button onClick={() => { resetGateForm(); setGateAdding(false); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">Cancel</button></div>
          </div>
        )}
        {gateDeleteId && (
          <>
            <div className="fixed inset-0 bg-black/30 z-[100]" onClick={() => setGateDeleteId(null)} />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setGateDeleteId(null)}>
              <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-sm p-6 animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-black text-base text-[#0a0a0a] mb-2">Delete Branch</h3>
                <p className="text-sm text-gray-500 mb-4">Are you sure? All data associated with this branch should be reassigned first.</p>
                <div className="flex gap-2">
                  <button onClick={() => setGateDeleteId(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200">Cancel</button>
                  <button onClick={() => handleGateDelete(gateDeleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">Delete</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [adminBranchId, setAdminBranchId] = useState<string | null>(null);
  const [devBranches, setDevBranches] = useState<BranchOption[]>([]);

  const isDev = user?.role === "dev";
  const isAdmin = user?.role === "admin";

  // Redirect non-admin and non-dev users
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "admin" && user.role !== "dev"))) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // Admin: auto-lock to their assigned branch
  useEffect(() => {
    if (isAdmin && user?.branch_id) {
      setAdminBranchId(user.branch_id);
    }
  }, [isAdmin, user?.branch_id]);

  // Dev: fetch branches for gate
  useEffect(() => {
    if (isDev) {
      (async () => {
        const sb = createClient();
        const { data } = await sb.from("branches").select("id, name").eq("is_active", true).order("name");
        if (data) setDevBranches(data);
      })();
    }
  }, [isDev]);

  // Detect mobile on mount and resize
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-open sidebar on desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, [isMobile]);

  function handleNavClick(itemTab: AdminTab) {
    setTab(itemTab);
    if (isMobile) setSidebarOpen(false);
  }

  if (authLoading || !user || (user.role !== "admin" && user.role !== "dev")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: RED }} />
      </div>
    );
  }

  // Dev: show gate screen if no branch selected
  if (isDev && adminBranchId === null) {
    return <DevBranchGate onSelect={(id) => setAdminBranchId(id)} branches={devBranches} setBranches={setDevBranches} />;
  }

  // Admin: if branch_id is missing, show error
  if (isAdmin && !user?.branch_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🏢</p>
          <p className="text-lg font-bold text-gray-600">No Branch Assigned</p>
          <p className="text-sm text-gray-400 mt-1">Your account is not assigned to any branch. Please contact a dev to assign you a branch.</p>
        </div>
      </div>
    );
  }

  const effectiveBranchId = isDev ? adminBranchId : user?.branch_id ?? null;
  const branchName = isDev
    ? (adminBranchId ? devBranches.find(b => b.id === adminBranchId)?.name ?? "Unknown Branch" : "All Branches")
    : "Your Branch";

  return (
    <div className="min-h-screen bg-[#f9fafb] flex">
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 shadow-xl md:shadow-sm transition-all duration-300 ${
          isMobile
            ? sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full"
            : sidebarOpen ? "w-60" : "w-16"
        }`}
      >
        <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-100 flex-shrink-0">
          <StorageImage imageBaseName="logo" alt="Sizzling Hub" className="w-7 h-7 rounded object-contain flex-shrink-0" />
          {(sidebarOpen || isMobile) && <span className="text-sm font-black tracking-wide text-gray-900 truncate">{isDev ? "DEV" : "ADMIN"}</span>}
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = tab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => handleNavClick(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  active ? "bg-red-50 text-red-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
                title={!sidebarOpen && !isMobile ? item.label : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">{item.icon}</svg>
                {(sidebarOpen || isMobile) && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-gray-100 p-2">
          {!isMobile && (
            <button onClick={() => setSidebarOpen((o) => !o)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors text-xs font-semibold">
              <svg className={`w-4 h-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              {sidebarOpen && "Collapse"}
            </button>
          )}
          <a href="/" className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors text-xs font-semibold">
            {sidebarOpen || isMobile ? "← Back to Store" : "←"}
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isMobile ? "ml-0" : sidebarOpen ? "ml-60" : "ml-16"}`}>
        {/* Mobile top bar */}
        {isMobile && (
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <StorageImage imageBaseName="logo" alt="Sizzling Hub" className="w-6 h-6 rounded object-contain" />
            <h1 className="text-sm font-black text-gray-900 truncate">{TAB_LABELS[tab]}</h1>
          </div>
        )}
        <div className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">{TAB_LABELS[tab]}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{branchName}</p>
            </div>
            {isDev && (
              <button
                onClick={() => setAdminBranchId(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Switch Branch
              </button>
            )}
          </div>
          {tab === "dashboard" && <DashboardPanel branchId={effectiveBranchId} />}
          {tab === "profiles" && (
            <ProfilesPanel
              branchId={isDev ? adminBranchId : user?.branch_id ?? null}
              showBranchAssignment={isDev}
              currentUserRole={user?.role ?? "customer"}
              currentUserBranchId={user?.branch_id ?? null}
            />
          )}
          {tab === "menu" && <MenuPanel branchId={effectiveBranchId} />}
          {tab === "orders" && <OrdersPanel branchId={effectiveBranchId} />}
          {tab === "images" && <ImagesPanel branchId={effectiveBranchId} isDev={isDev} />}
          {tab === "banners" && <BannersPanel branchId={effectiveBranchId} />}
          {tab === "reports" && <ReportsPanel branchId={effectiveBranchId} />}
          {tab === "receipts" && <ReceiptsPanel branchId={effectiveBranchId} />}
        </div>
      </div>
    </div>
  );
}