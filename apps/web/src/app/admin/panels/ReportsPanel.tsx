"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingSkeleton, EmptyState } from "./shared";

export default function ReportsPanel() {
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