"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoadingSkeleton } from "./shared";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ──────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────── */
const RED = "#dc2626";
const fmtPHP = (v: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(v);
const fmtShort = (v: number) => v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v}`;

function todayRange(): { start: string; end: string } {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 999);
  return { start: s.toISOString(), end: e.toISOString() };
}
function yesterdayRange(): { start: string; end: string } {
  const s = new Date(); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999);
  return { start: s.toISOString(), end: e.toISOString() };
}
function weekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const s = new Date(now); s.setDate(now.getDate() - diff); s.setHours(0, 0, 0, 0);
  const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
  return { start: s.toISOString(), end: e.toISOString() };
}

/* ──────────────────────────────────────────────────
   Card components
   ────────────────────────────────────────────────── */
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className || ""}`}>
      {children}
    </div>
  );
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{children}</h3>;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sub}</p>}
    </Card>
  );
}

function ItemRow({ rank, name, sold, revenue }: { rank: number; name: string; sold: number; revenue: number }) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors">
      <span className="text-xs font-bold text-gray-300 w-5 text-right">#{rank}</span>
      <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{name}</span>
      <span className="text-xs text-gray-400 font-mono w-12 text-right">x{sold}</span>
      <span className="text-sm font-bold text-red-600 w-24 text-right tabular-nums">{fmtPHP(revenue)}</span>
    </div>
  );
}

function EmptyChart({ msg }: { msg: string }) {
  return <p className="text-sm text-gray-400 text-center py-12">{msg}</p>;
}

/* ──────────────────────────────────────────────────
   Reports Panel
   ────────────────────────────────────────────────── */
export default function ReportsPanel({ branchId }: { branchId?: string | null }) {
  const [loading, setLoading] = useState(true);
  // Overview
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);
  // Daily
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0);
  const [todayTopItems, setTodayTopItems] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; revenue: number }[]>([]);
  // Weekly top
  const [weeklyTopItems, setWeeklyTopItems] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  // Top Sellers (all time)
  const [topByRevenue, setTopByRevenue] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  const [topByQuantity, setTopByQuantity] = useState<{ name: string; sold: number; revenue: number }[]>([]);

  const fetchAll = useCallback(async () => {
    const sb = createClient();

    // ── Overview: 30 days ──
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let ovQuery = sb.from("orders").select("id, total, placed_at")
      .in("status", ["delivered", "out_for_delivery"])
      .gte("placed_at", thirtyDaysAgo.toISOString());
    if (branchId) ovQuery = ovQuery.eq("branch_id", branchId);
    const { data: overviewOrders } = await ovQuery.order("placed_at", { ascending: true });
    if (overviewOrders) {
      setTotalRevenue(overviewOrders.reduce((s: number, o: any) => s + Number(o.total), 0));
      setTotalOrders(overviewOrders.length);
      setAvgOrderValue(overviewOrders.length > 0 ? overviewOrders.reduce((s: number, o: any) => s + Number(o.total), 0) / overviewOrders.length : 0);

      const dayMap = new Map<string, number>();
      for (const o of overviewOrders) {
        const d = new Date(o.placed_at).toLocaleDateString("en-CA");
        dayMap.set(d, (dayMap.get(d) || 0) + Number(o.total));
      }
      setRevenueTrend(Array.from(dayMap.entries()).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date)));
    }

    // ── Daily ──
    const td = todayRange();
    const yd = yesterdayRange();
    let tq = sb.from("orders").select("id, total, placed_at")
      .in("status", ["delivered", "out_for_delivery"]).gte("placed_at", td.start).lte("placed_at", td.end);
    let yq = sb.from("orders").select("total")
      .in("status", ["delivered", "out_for_delivery"]).gte("placed_at", yd.start).lte("placed_at", yd.end);
    if (branchId) { tq = tq.eq("branch_id", branchId); yq = yq.eq("branch_id", branchId); }
    const { data: todayOrdersData } = await tq;
    const { data: yesterdayOrdersData } = await yq;

    if (todayOrdersData) {
      setTodayRevenue(todayOrdersData.reduce((s: number, o: any) => s + Number(o.total), 0));

      const hMap = new Map<number, number>();
      for (let h = 0; h < 24; h++) hMap.set(h, 0);
      for (const o of todayOrdersData) {
        const h = new Date(o.placed_at).getHours();
        hMap.set(h, (hMap.get(h) || 0) + Number(o.total));
      }
      setHourlyData(Array.from(hMap.entries()).map(([h, revenue]) => ({ hour: `${h.toString().padStart(2, "0")}:00`, revenue })));

      if (todayOrdersData.length > 0) {
        const ids = todayOrdersData.map((o: any) => o.id);
        const { data: todayItems } = await sb.from("order_items").select("quantity, unit_price, menu_item:menu_items(name)").in("order_id", ids);
        if (todayItems) {
          const iMap = new Map<string, { sold: number; revenue: number }>();
          for (const it of todayItems) {
            const n = (it.menu_item as any)?.name || "Unknown";
            const e = iMap.get(n) || { sold: 0, revenue: 0 };
            e.sold += it.quantity; e.revenue += it.quantity * Number(it.unit_price);
            iMap.set(n, e);
          }
          setTodayTopItems(Array.from(iMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
        }
      } else setTodayTopItems([]);
    }
    if (yesterdayOrdersData) setYesterdayRevenue(yesterdayOrdersData.reduce((s: number, o: any) => s + Number(o.total), 0));

    // ── Weekly top items ──
    const wk = weekRange();
    let wq = sb.from("orders").select("id")
      .in("status", ["delivered", "out_for_delivery"]).gte("placed_at", wk.start).lte("placed_at", wk.end);
    if (branchId) wq = wq.eq("branch_id", branchId);
    const { data: weekOrders } = await wq;
    if (weekOrders && weekOrders.length > 0) {
      const ids = weekOrders.map((o: any) => o.id);
      const { data: weekItems } = await sb.from("order_items").select("quantity, unit_price, menu_item:menu_items(name)").in("order_id", ids);
      if (weekItems) {
        const wiMap = new Map<string, { sold: number; revenue: number }>();
        for (const it of weekItems) {
          const n = (it.menu_item as any)?.name || "Unknown";
          const e = wiMap.get(n) || { sold: 0, revenue: 0 };
          e.sold += it.quantity; e.revenue += it.quantity * Number(it.unit_price);
          wiMap.set(n, e);
        }
        setWeeklyTopItems(Array.from(wiMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 10));
      }
    } else setWeeklyTopItems([]);

    // ── Top Sellers (all time) ──
    const { data: allOrders } = await sb.from("orders").select("id").in("status", ["delivered", "out_for_delivery"]);
    if (allOrders && allOrders.length > 0) {
      const allIds = allOrders.map((o: any) => o.id);
      const { data: allItems } = await sb.from("order_items").select("quantity, unit_price, menu_item:menu_items(name)").in("order_id", allIds);
      if (allItems) {
        const aMap = new Map<string, { sold: number; revenue: number }>();
        for (const it of allItems) {
          const n = (it.menu_item as any)?.name || "Unknown";
          const e = aMap.get(n) || { sold: 0, revenue: 0 };
          e.sold += it.quantity; e.revenue += it.quantity * Number(it.unit_price);
          aMap.set(n, e);
        }
        const sorted = Array.from(aMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);
        setTopByRevenue(sorted.slice(0, 10));
        setTopByQuantity([...sorted].sort((a, b) => b.sold - a.sold).slice(0, 10));
      }
    }

    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) return <LoadingSkeleton />;

  const pctChange = todayRevenue > 0 && yesterdayRevenue > 0
    ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : null;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Sales Reports</h2>
          <p className="text-xs text-gray-400 mt-0.5">Live · Updates every second</p>
        </div>
      </div>

      {/* ── Row 1: Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue (30d)" value={fmtPHP(totalRevenue)} />
        <StatCard label="Orders (30d)" value={String(totalOrders)} sub={`Avg ${fmtPHP(avgOrderValue)} / order`} />
        <StatCard label="Today" value={fmtPHP(todayRevenue)} />
        <StatCard
          label="vs Yesterday"
          value={pctChange !== null ? `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%` : "—"}
          sub={pctChange !== null ? fmtPHP(yesterdayRevenue) : undefined}
        />
      </div>

      {/* ── Row 2: Revenue Trend (full-width area) ── */}
      <Card>
        <CardTitle>Revenue Trend · Last 30 Days</CardTitle>
        {revenueTrend.length === 0 ? <EmptyChart msg="No data yet." /> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RED} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={RED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(d: string) => new Date(d).getDate().toString()} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={fmtShort} width={55} />
              <Tooltip formatter={(v: any) => [fmtPHP(Number(v)), "Revenue"]} labelFormatter={(l: any) => new Date(l).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
              <Area type="monotone" dataKey="revenue" stroke={RED} fill="url(#revGrad)" strokeWidth={2} dot={{ r: 2, fill: RED }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Row 3: Hourly Revenue + Today Top 5 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Hourly Revenue · Today</CardTitle>
          {hourlyData.every((d) => d.revenue === 0) ? <EmptyChart msg="No orders today yet." /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={fmtShort} width={50} />
                <Tooltip formatter={(v: any) => [fmtPHP(Number(v)), "Revenue"]} />
                <Bar dataKey="revenue" fill={RED} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <CardTitle>Top 5 Items · Today</CardTitle>
          {todayTopItems.length === 0 ? <EmptyChart msg="No orders today yet." /> : (
            <div className="divide-y divide-gray-100">
              {todayTopItems.map((it, i) => <ItemRow key={it.name} rank={i + 1} name={it.name} sold={it.sold} revenue={it.revenue} />)}
            </div>
          )}
        </Card>
      </div>

      {/* ── Row 4: Weekly Top + All-Time Top Sellers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Top 10 Items · This Week</CardTitle>
          {weeklyTopItems.length === 0 ? <EmptyChart msg="No orders this week yet." /> : (
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
              {weeklyTopItems.map((it, i) => <ItemRow key={it.name} rank={i + 1} name={it.name} sold={it.sold} revenue={it.revenue} />)}
            </div>
          )}
        </Card>
        <Card>
          <CardTitle>Top by Revenue · All Time</CardTitle>
          {topByRevenue.length === 0 ? <EmptyChart msg="No data." /> : (
            <ResponsiveContainer width="100%" height={topByRevenue.length * 40 + 20} minHeight={200}>
              <BarChart data={topByRevenue} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={fmtShort} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#4b5563" }} width={110} />
                <Tooltip formatter={(v: any) => [fmtPHP(Number(v)), "Revenue"]} />
                <Bar dataKey="revenue" fill={RED} radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Row 5: Top by Quantity All Time ── */}
      <Card>
        <CardTitle>Top by Quantity Sold · All Time</CardTitle>
        {topByQuantity.length === 0 ? <EmptyChart msg="No data." /> : (
          <ResponsiveContainer width="100%" height={topByQuantity.length * 40 + 20} minHeight={200}>
            <BarChart data={topByQuantity} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#4b5563" }} width={110} />
              <Tooltip formatter={(v: any) => [v, "Sold"]} />
              <Bar dataKey="sold" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}