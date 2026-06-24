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
   Expense Form Modal
   ────────────────────────────────────────────────── */
const EXPENSE_CATEGORIES = ["Ingredients", "Utilities", "Rent", "Salaries", "Marketing", "Supplies", "Maintenance", "Other"];

function AddExpenseModal({
  open,
  onClose,
  onSaved,
  branchId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  branchId: string | null;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }

    setSaving(true);
    const sb = createClient();
    const payload: Record<string, unknown> = {
      amount: amt,
      description: description.trim(),
      category,
    };
    if (branchId) payload.branch_id = branchId;

    const { error: insertErr, status, statusText } = await sb.from("expenses").insert(payload);
    setSaving(false);

    if (insertErr) {
      console.error("Insert expense error:", insertErr, status, statusText);
      setError(insertErr.message || String(statusText || "Unknown error"));
      return;
    }
    setAmount("");
    setDescription("");
    setCategory("Other");
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-gray-900 mb-4">Add Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₱)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g., Chicken supply"
            />
          </div>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">
              {saving ? "Saving…" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Expense Interface
   ────────────────────────────────────────────────── */
interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  created_at: string;
}

/* ──────────────────────────────────────────────────
   All Expenses Modal (date range filterable)
   ────────────────────────────────────────────────── */
function AllExpensesModal({
  open,
  onClose,
  expenses,
  loading,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onDelete,
  deletingId,
}: {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
  loading: boolean;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onApply: () => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (!open) return null;

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-gray-900">All Expenses</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Date Range Controls */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            onClick={onApply}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Apply
          </button>
          <div className="ml-auto text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total in Range</p>
            <p className="text-lg font-black text-gray-900">{fmtPHP(total)}</p>
          </div>
        </div>

        {/* Expense List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: RED }} />
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No expenses found in this range.</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1">
            <div className="flex items-center gap-3 px-2 py-1 sticky top-0 bg-white z-10">
              <span className="text-xs font-bold text-gray-300 uppercase w-28">Date</span>
              <span className="text-xs font-bold text-gray-300 uppercase flex-1">Description</span>
              <span className="text-xs font-bold text-gray-300 uppercase w-20 text-right">Category</span>
              <span className="text-xs font-bold text-gray-300 uppercase w-24 text-right">Amount</span>
              <span className="w-8" />
            </div>
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-xs text-gray-400 font-mono w-28">
                  {new Date(exp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                </span>
                <span className="flex-1 text-sm font-semibold text-gray-800 truncate" title={exp.description || "—"}>
                  {exp.description || "—"}
                </span>
                <span className="text-xs text-gray-500 w-20 text-right truncate">{exp.category}</span>
                <span className="text-sm font-bold text-red-600 w-24 text-right tabular-nums">{fmtPHP(exp.amount)}</span>
                <button
                  onClick={() => onDelete(exp.id)}
                  disabled={deletingId === exp.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                  title="Delete expense"
                >
                  {deletingId === exp.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers: calls the get_sales_report RPC ── */
interface SalesReportRow {
  branch_id: string | null;
  branch_name: string | null;
  day: string;
  order_count: number;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total_sales: number;
  online_count: number;
  walkin_count: number;
  pwd_count: number;
}

async function getSalesReport(sb: ReturnType<typeof createClient>, fromDate: string, toDate: string, branchId?: string | null) {
  const { data, error } = await sb.rpc("get_sales_report", {
    p_start_date: fromDate,
    p_end_date: toDate,
    p_branch_id: branchId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as SalesReportRow[];
}

/* ──────────────────────────────────────────────────
   Reports Panel
   ────────────────────────────────────────────────── */
export default function ReportsPanel({ branchId }: { branchId?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [reportDateFrom, setReportDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toLocaleDateString("en-CA");
  });
  const [reportDateTo, setReportDateTo] = useState(() => new Date().toLocaleDateString("en-CA"));

  // Only totalRevenue responds to date range picker
  const [totalRevenue, setTotalRevenue] = useState(0);
  // Default 30-day range values (NOT affected by date range picker)
  const [defaultRevenue, setDefaultRevenue] = useState(0);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);
  // Daily (always today) — polls every second
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayTopItems, setTodayTopItems] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; revenue: number }[]>([]);
  // Weekly top (always this week)
  const [weeklyTopItems, setWeeklyTopItems] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  // Top Sellers (fixed 30-day range)
  const [topByRevenue, setTopByRevenue] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  const [topByQuantity, setTopByQuantity] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  // Expenses (fixed 30-day range)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [allExpensesModalOpen, setAllExpensesModalOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  // Date range for "All Expenses" modal
  const [expDateFrom, setExpDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [expDateTo, setExpDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allExpensesLoading, setAllExpensesLoading] = useState(false);

  /* ── Heavy queries (RPC + 30-day data): run on mount + Apply button ── */
  const fetchHeavy = useCallback(async () => {
    const sb = createClient();

    // Total revenue for selected range (RPC)
    try {
      const rangeRows = await getSalesReport(sb, reportDateFrom, reportDateTo, branchId);
      setTotalRevenue(rangeRows.reduce((s, r) => s + Number(r.total_sales), 0));
    } catch { /* RPC may fail — leave current value */ }

    // Default 30-day revenue + trend + top sellers + expenses
    const default30Start = new Date();
    default30Start.setDate(default30Start.getDate() - 30);
    default30Start.setHours(0, 0, 0, 0);
    const default30End = new Date();
    default30End.setHours(23, 59, 59, 999);

    // 30-day revenue (RPC)
    try {
      const d30Rows = await getSalesReport(sb, default30Start.toLocaleDateString("en-CA"), default30End.toLocaleDateString("en-CA"), branchId);
      setDefaultRevenue(d30Rows.reduce((s, r) => s + Number(r.total_sales), 0));
    } catch { /* ignore */ }

    // 30-day receipts for trend chart + top sellers
    let d30Query = sb.from("receipts").select("total, completed_at, items")
      .gte("completed_at", default30Start.toISOString())
      .lte("completed_at", default30End.toISOString())
      .limit(100000);
    if (branchId) d30Query = d30Query.eq("branch_id", branchId);
    const { data: default30Receipts } = await d30Query;
    if (default30Receipts) {
      // Revenue trend (day-by-day)
      const dayMap = new Map<string, number>();
      const aMap = new Map<string, { sold: number; revenue: number }>();
      for (const o of default30Receipts) {
        const d = new Date(o.completed_at).toLocaleDateString("en-CA");
        dayMap.set(d, (dayMap.get(d) || 0) + Number(o.total));

        const items = (o.items || []) as { name: string; quantity: number; price: number }[];
        for (const it of items) {
          const n = it.name || "Unknown";
          const e = aMap.get(n) || { sold: 0, revenue: 0 };
          e.sold += it.quantity;
          e.revenue += it.quantity * (it.price || 0);
          aMap.set(n, e);
        }
      }
      setRevenueTrend(Array.from(dayMap.entries()).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date)));

      const sorted = Array.from(aMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);
      setTopByRevenue(sorted.slice(0, 10));
      setTopByQuantity([...sorted].sort((a, b) => b.sold - a.sold).slice(0, 10));
    }

    // Weekly top (always this week)
    const wk = weekRange();
    let wq = sb.from("receipts").select("items")
      .gte("completed_at", wk.start).lte("completed_at", wk.end)
      .limit(100000);
    if (branchId) wq = wq.eq("branch_id", branchId);
    const { data: weekReceipts } = await wq;
    if (weekReceipts && weekReceipts.length > 0) {
      const wiMap = new Map<string, { sold: number; revenue: number }>();
      for (const r of weekReceipts) {
        const items = (r.items || []) as { name: string; quantity: number; price: number }[];
        for (const it of items) {
          const n = it.name || "Unknown";
          const e = wiMap.get(n) || { sold: 0, revenue: 0 };
          e.sold += it.quantity;
          e.revenue += it.quantity * (it.price || 0);
          wiMap.set(n, e);
        }
      }
      setWeeklyTopItems(Array.from(wiMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 10));
    } else setWeeklyTopItems([]);

    // Expenses (30-day)
    const ex30Start = new Date();
    ex30Start.setDate(ex30Start.getDate() - 30);
    ex30Start.setHours(0, 0, 0, 0);
    const ex30End = new Date();
    ex30End.setHours(23, 59, 59, 999);
    let exQuery = sb.from("expenses").select("id, amount, description, category, created_at")
      .gte("created_at", ex30Start.toISOString())
      .lte("created_at", ex30End.toISOString())
      .order("created_at", { ascending: false });
    if (branchId) exQuery = exQuery.eq("branch_id", branchId);
    const { data: expenseData } = await exQuery;
    if (expenseData) {
      setExpenses(expenseData as Expense[]);
      setTotalExpenses(expenseData.reduce((s: number, e: any) => s + Number(e.amount), 0));
    } else {
      setExpenses([]);
      setTotalExpenses(0);
    }
  }, [branchId, reportDateFrom, reportDateTo]);

  /* ── Light queries: polls every 1s (today's live data only) ── */
  const fetchLive = useCallback(async () => {
    const sb = createClient();
    const td = todayRange();
    let tq = sb.from("receipts").select("id, total, completed_at, items")
      .gte("completed_at", td.start).lte("completed_at", td.end).limit(100000);
    if (branchId) tq = tq.eq("branch_id", branchId);
    const { data: todayReceipts } = await tq;

    if (todayReceipts) {
      setTodayRevenue(todayReceipts.reduce((s: number, o: any) => s + Number(o.total), 0));

      const hMap = new Map<number, number>();
      for (let h = 0; h < 24; h++) hMap.set(h, 0);
      for (const o of todayReceipts) {
        const h = new Date(o.completed_at).getHours();
        hMap.set(h, (hMap.get(h) || 0) + Number(o.total));
      }
      setHourlyData(Array.from(hMap.entries()).map(([h, revenue]) => ({ hour: `${h.toString().padStart(2, "0")}:00`, revenue })));

      if (todayReceipts.length > 0) {
        const iMap = new Map<string, { sold: number; revenue: number }>();
        for (const r of todayReceipts) {
          const items = (r.items || []) as { name: string; quantity: number; price: number }[];
          for (const it of items) {
            const n = it.name || "Unknown";
            const e = iMap.get(n) || { sold: 0, revenue: 0 };
            e.sold += it.quantity;
            e.revenue += it.quantity * (it.price || 0);
            iMap.set(n, e);
          }
        }
        setTodayTopItems(Array.from(iMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
      } else setTodayTopItems([]);
    }
    setLoading(false);
  }, [branchId]);

  // Run heavy queries once on mount and when date range changes (Apply)
  useEffect(() => {
    fetchHeavy();
  }, [fetchHeavy]);

  // Poll light queries every second
  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 1000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const fetchAllExpenses = useCallback(async () => {
    setAllExpensesLoading(true);
    const sb = createClient();
    const fromISO = new Date(expDateFrom).toISOString();
    const toISO = new Date(expDateTo + "T23:59:59.999").toISOString();
    let q = sb.from("expenses").select("id, amount, description, category, created_at")
      .gte("created_at", fromISO)
      .lte("created_at", toISO)
      .order("created_at", { ascending: false });
    if (branchId) q = q.eq("branch_id", branchId);
    const { data } = await q;
    setAllExpenses(data as Expense[] ?? []);
    setAllExpensesLoading(false);
  }, [expDateFrom, expDateTo, branchId]);

  // Fetch all expenses when modal opens
  useEffect(() => {
    if (allExpensesModalOpen) fetchAllExpenses();
  }, [allExpensesModalOpen, fetchAllExpenses]);

  const deleteExpense = async (id: string) => {
    setDeletingExpenseId(id);
    const sb = createClient();
    await sb.from("expenses").delete().eq("id", id);
    setDeletingExpenseId(null);
    fetchHeavy();
    if (allExpensesModalOpen) fetchAllExpenses();
  };

  if (loading) return <LoadingSkeleton />;

  const profitLoss = defaultRevenue - totalExpenses;
  const margin = defaultRevenue > 0 ? ((profitLoss / defaultRevenue) * 100) : 0;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header with Date Range */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-gray-400">Live · Updates every second</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-400">Date Range:</span>
          <input
            type="date"
            value={reportDateFrom}
            onChange={(e) => setReportDateFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={reportDateTo}
            onChange={(e) => setReportDateTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
          <button
            onClick={fetchHeavy}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={() => {
              const d = new Date(); d.setDate(d.getDate() - 30);
              setReportDateFrom(d.toLocaleDateString("en-CA"));
              setReportDateTo(new Date().toLocaleDateString("en-CA"));
            }}
            className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 transition-colors"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* ── Row 1: Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Revenue (Range)" value={fmtPHP(totalRevenue)} />
        <StatCard label="Today" value={fmtPHP(todayRevenue)} />
      </div>

      {/* ── Row 2: Profit & Loss ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Profit & Loss · Last 30 Days</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAllExpensesModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              View All Expenses
            </button>
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              + Add Expense
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue (30D)</p>
            <p className="text-xl font-black text-gray-900 mt-1">{fmtPHP(defaultRevenue)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expenses</p>
            <p className="text-xl font-black text-gray-900 mt-1">{fmtPHP(totalExpenses)}</p>
          </div>
          <div className={`rounded-lg p-4 ${profitLoss >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profit / Loss</p>
            <p className={`text-xl font-black mt-1 ${profitLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {profitLoss < 0 ? "-" : ""}{fmtPHP(Math.abs(profitLoss))}
            </p>
          </div>
          <div className={`rounded-lg p-4 ${margin >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Margin</p>
            <p className={`text-xl font-black mt-1 ${margin >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {margin >= 0 ? "+" : ""}{margin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Expense List */}
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No expenses recorded in the last 30 days.</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <div className="flex items-center gap-3 px-2 py-1">
              <span className="text-xs font-bold text-gray-300 uppercase flex-1">Description</span>
              <span className="text-xs font-bold text-gray-300 uppercase w-20 text-right">Category</span>
              <span className="text-xs font-bold text-gray-300 uppercase w-24 text-right">Amount</span>
              <span className="w-8" />
            </div>
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="flex-1 text-sm font-semibold text-gray-800 truncate" title={exp.description || "—"}>
                  {exp.description || "—"}
                </span>
                <span className="text-xs text-gray-500 w-20 text-right truncate">{exp.category}</span>
                <span className="text-sm font-bold text-red-600 w-24 text-right tabular-nums">{fmtPHP(exp.amount)}</span>
                <button
                  onClick={() => deleteExpense(exp.id)}
                  disabled={deletingExpenseId === exp.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                  title="Delete expense"
                >
                  {deletingExpenseId === exp.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Row 3: Revenue Trend (full-width area) ── */}
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

      {/* ── Row 5: Weekly Top + Top Sellers ── */}
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
        <CardTitle>Top by Revenue · Last 30 Days</CardTitle>
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

      {/* ── Row 6: Top by Quantity ── */}
      <Card>
        <CardTitle>Top by Quantity Sold · Last 30 Days</CardTitle>
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

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSaved={fetchHeavy}
        branchId={branchId ?? null}
      />

      {/* All Expenses Modal */}
      <AllExpensesModal
        open={allExpensesModalOpen}
        onClose={() => setAllExpensesModalOpen(false)}
        expenses={allExpenses}
        loading={allExpensesLoading}
        dateFrom={expDateFrom}
        dateTo={expDateTo}
        onDateFromChange={setExpDateFrom}
        onDateToChange={setExpDateTo}
        onApply={fetchAllExpenses}
        onDelete={deleteExpense}
        deletingId={deletingExpenseId}
      />
    </div>
  );
}