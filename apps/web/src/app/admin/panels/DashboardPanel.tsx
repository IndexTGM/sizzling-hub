"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingSkeleton, EmptyState, RED } from "./shared";

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

export default function DashboardPanel() {
  const [stats, setStats] = useState<{ totalOrders: number; totalRevenue: number; totalCustomers: number; totalMenuItems: number; pendingOrders: number; recentOrders: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const sb = createClient();
    const [{ count: orderCount }, { data: revenueRows }, { count: customerCount }, { count: menuCount }, { count: pendingCount }, { data: recent }] = await Promise.all([
      sb.from("orders").select("*", { count: "exact", head: true }),
      sb.from("orders").select("total").in("status", ["delivered", "out_for_delivery"]),
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
      <StatCard label="Total Revenue" value={rev} sub="From delivered orders" color="#10b981" />
        <StatCard label="Orders" value={String(stats.totalOrders)} sub={`${stats.pendingOrders} pending`} color="#f59e0b" />
        <StatCard label="Customers" value={String(stats.totalCustomers)} color="#3b82f6" />
        <StatCard label="Menu Items" value={String(stats.totalMenuItems)} color="#ec4899" />
      </div>
      <div><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Orders</h3>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {stats.recentOrders.length === 0 ? <div className="p-6 text-center"><p className="text-sm text-gray-400">No orders yet.</p></div> : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 tracking-wider"><tr><th className="px-4 py-3 font-semibold">Order</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Total</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Date</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recentOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-400">#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{o.customer}</td>
                        <td className="px-4 py-3 font-bold text-red-600">₱{o.total}</td>
                        <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${o.status === "delivered" ? "bg-emerald-50 text-emerald-600" : o.status === "pending" ? "bg-amber-50 text-amber-600" : o.status === "cancelled" ? "bg-red-50 text-red-600" : o.status === "out_for_delivery" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>{o.status}</span></td>
                        <td className="px-4 py-3 text-gray-400">{new Date(o.placed_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {stats.recentOrders.map((o: any) => (
                  <div key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-400">#{o.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${o.status === "delivered" ? "bg-emerald-50 text-emerald-600" : o.status === "pending" ? "bg-amber-50 text-amber-600" : o.status === "cancelled" ? "bg-red-50 text-red-600" : o.status === "out_for_delivery" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>{o.status}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 truncate mt-1">{o.customer}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(o.placed_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-base font-black text-red-600 flex-shrink-0">₱{o.total}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}