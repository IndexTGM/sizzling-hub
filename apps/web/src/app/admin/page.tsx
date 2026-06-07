"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import StorageImage from "@/app/_components/StorageImage";

import DashboardPanel from "./panels/DashboardPanel";
import ProfilesPanel from "./panels/ProfilesPanel";
import MenuPanel from "./panels/MenuPanel";
import OrdersPanel from "./panels/OrdersPanel";
import ImagesPanel from "./panels/ImagesPanel";
import BannersPanel from "./panels/BannersPanel";
import AuditLogsPanel from "./panels/AuditLogsPanel";
import ReportsPanel from "./panels/ReportsPanel";

const RED = "#dc2626";

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

const TAB_LABELS: Record<AdminTab, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  menu: "Menu Items",
  profiles: "Profiles",
  banners: "Banners",
  images: "Images",
  audit: "Audit Logs",
  reports: "Reports",
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.replace("/");
  }, [user, authLoading, router]);

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

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: RED }} />
      </div>
    );
  }

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
          {(sidebarOpen || isMobile) && <span className="text-sm font-black tracking-wide text-gray-900 truncate">ADMIN</span>}
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
