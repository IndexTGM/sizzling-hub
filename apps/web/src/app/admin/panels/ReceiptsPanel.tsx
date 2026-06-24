"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { LoadingSkeleton, EmptyState, PAYMENT_LABEL, OT_ICON, OT_LABEL, STATUS_BG } from "./shared";
import type { OrderType } from "./shared";

interface Receipt {
  id: string;
  order_id: string;
  order_type: string;
  source: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  branch_name: string | null;
  items: { name: string; quantity: number; price: number; note: string }[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  senior_pwd_discount: boolean;
  notes: string | null;
  placed_at: string | null;
  completed_at: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 30;

const sourceColors: Record<string, string> = {
  walk_in: "bg-indigo-50 text-indigo-600",
  online: "bg-teal-50 text-teal-600",
};

/** Parses a single CSV line, handling quoted fields with commas inside */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = false; }
      } else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { result.push(current); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

export default function ReceiptsPanel({ branchId }: { branchId?: string | null }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | "walk_in" | "online">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const pageRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; skipped: number; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "single" | "range"; receiptId?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchReceipts = useCallback(async (reset = false, loadPage?: number) => {
    const currentPage = reset ? 0 : (loadPage ?? pageRef.current);
    if (reset) {
      setLoading(true);
      pageRef.current = 0;
    }
    const fid = ++fetchIdRef.current;
    const sb = createClient();
    let query = sb.from("receipts").select("*", { count: "exact" });
    if (branchId) query = query.eq("branch_id", branchId);
    if (sourceFilter !== "all") query = query.eq("source", sourceFilter);
    if (dateFrom) query = query.gte("completed_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte("completed_at", endDate.toISOString());
    }
    query = query.order("completed_at", { ascending: false });
    query = query.range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);
    const { data, count } = await query;
    if (fid !== fetchIdRef.current) return; // stale — a newer fetch superseded this one
    if (reset) setReceipts((data || []) as Receipt[]);
    else setReceipts((prev) => [...prev, ...((data || []) as Receipt[])]);
    setHasMore((count || 0) > (currentPage + 1) * ITEMS_PER_PAGE);
    setLoading(false);
  }, [branchId, sourceFilter, dateFrom, dateTo]);

  useEffect(() => { fetchReceipts(true); }, [fetchReceipts]);
  function handleLoadMore() {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    fetchReceipts(false, nextPage);
  }

  async function handleDeleteReceipt(id: string) {
    setDeleting(true);
    const sb = createClient();
    const { error } = await sb.from("receipts").delete().eq("id", id);
    if (error) {
      setImportResult({ ok: 0, skipped: 0, error: `Delete failed: ${error.message}` });
    } else {
      setSelected(null);
      await fetchReceipts(true);
    }
    setDeleting(false);
    setDeleteConfirm(null);
  }

  async function handleDeleteByDateRange() {
    if (!dateFrom && !dateTo) {
      setImportResult({ ok: 0, skipped: 0, error: "Please set a date range first." });
      setDeleteConfirm(null);
      return;
    }
    setDeleting(true);
    const sb = createClient();
    let query = sb.from("receipts").delete({ count: "exact" });
    if (branchId) query = query.eq("branch_id", branchId);
    if (dateFrom) query = query.gte("completed_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte("completed_at", endDate.toISOString());
    }
    const { count, error } = await query;
    if (error) {
      setImportResult({ ok: 0, skipped: 0, error: `Delete failed: ${error.message}` });
    } else {
      setImportResult({ ok: count || 0, skipped: 0 });
      await fetchReceipts(true);
    }
    setDeleting(false);
    setDeleteConfirm(null);
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) {
        setImportResult({ ok: 0, skipped: 0, error: "CSV file is empty or has no data rows." });
        setImporting(false);
        return;
      }

      const header = parseCSVLine(lines[0]);
      const colIndex: Record<string, number> = {};
      header.forEach((h, i) => { colIndex[h.trim()] = i; });

      let ok = 0;
      let skipped = 0;
      let dupes = 0;
      const sb = createClient();
      const seen = new Set<string>();

      // Phase 1: Parse all CSV rows first
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine || !rawLine.trim()) continue;
        const cols = parseCSVLine(rawLine);

        const get = (name: string): string => (colIndex[name] !== undefined ? (cols[colIndex[name]] ?? "") : "");

        const orderIdShort = get("Order ID").trim();
        const orderType = get("Order Type").trim();
        const source = get("Source").trim();
        const customerName = get("Customer Name").trim();
        const customerEmail = get("Customer Email").trim() || null;
        const customerPhone = get("Customer Phone").trim() || null;
        const branchName = get("Branch").trim() || null;
        const itemsStr = get("Items").trim();
        const subtotal = parseFloat(get("Subtotal")) || 0;
        const deliveryFee = parseFloat(get("Delivery Fee")) || 0;
        const discount = parseFloat(get("Discount")) || 0;
        const total = parseFloat(get("Total")) || 0;
        const paymentMethod = get("Payment Method").trim() || null;
        const paymentStatus = get("Payment Status").trim() || null;
        const seniorPwdRaw = get("PWD/Senior Discount").trim();
        const notes = get("Notes").trim() || null;
        const placedAtRaw = get("Placed At").trim();
        const completedAtRaw = get("Completed At").trim();

        const items: { name: string; quantity: number; price: number; note: string }[] = [];
        if (itemsStr) {
          const itemParts = itemsStr.split(";");
          for (const part of itemParts) {
            const match = part.trim().match(/^(.+?)\s+x(\d+)\s+@₱([\d.]+)$/);
            if (match) {
              items.push({ name: match[1].trim(), quantity: parseInt(match[2]), price: parseFloat(match[3]), note: "" });
            }
          }
        }

        // All fields are optional — only skip if completely empty (no completed_at AND no total)
        if (!completedAtRaw && !total && !customerName && !orderIdShort && !itemsStr) {
          skipped++;
          continue;
        }

        // Generate a placeholder order_id if none provided
        const finalOrderId = orderIdShort || `imported-${Date.now()}-${i}`;

        parsedRows.push({
          order_id: finalOrderId,
          order_type: orderType || "dine_in",
          source: source || "walk_in",
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          branch_name: branchName,
          items,
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          total,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          senior_pwd_discount: seniorPwdRaw === "Yes" || seniorPwdRaw === "yes",
          notes,
          placed_at: placedAtRaw || null,
          completed_at: completedAtRaw,
        });
      }

      // Phase 2: Query existing receipts by order_id to build a set of seen IDs
      const csvOrderIds = [...new Set(parsedRows.map((r) => r.order_id))];
      if (csvOrderIds.length > 0) {
        try {
          // Query in batches of 100 to stay within Supabase IN clause limits
          for (let k = 0; k < csvOrderIds.length; k += 100) {
            const batchIds = csvOrderIds.slice(k, k + 100);
            let dupQuery = sb.from("receipts").select("order_id").in("order_id", batchIds);
            if (branchId) dupQuery = dupQuery.eq("branch_id", branchId);
            const { data: existing } = await dupQuery;
            if (existing) {
              for (const r of existing) {
                seen.add(r.order_id);
              }
            }
          }
        } catch { /* proceed without dedup if query fails */ }
      }

      // Phase 3: Filter out duplicates by order_id (prevents re-importing same receipt)
      const toInsert: any[] = [];
      for (const row of parsedRows) {
        if (seen.has(row.order_id)) {
          dupes++;
          continue;
        }
        seen.add(row.order_id);
        toInsert.push({
          ...row,
          branch_id: branchId || null,
        });
      }

      if (toInsert.length === 0) {
        setImportResult({ ok: 0, skipped, error: "No valid rows to import." });
        setImporting(false);
        return;
      }

      // Insert in batches of 50
      for (let j = 0; j < toInsert.length; j += 50) {
        const batch = toInsert.slice(j, j + 50);
        const { error } = await sb.from("receipts").insert(batch);
        if (error) {
          setImportResult({ ok, skipped: skipped + (toInsert.length - j - batch.length), error: error.message });
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        ok += batch.length;
      }

      setImportResult({ ok, skipped: skipped + dupes });
      await fetchReceipts(true);
    } catch (err: any) {
      setImportResult({ ok: 0, skipped: 0, error: err?.message || "Failed to parse CSV" });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function exportCSV() {
    const rows = receipts.map((r) => {
      const itemsStr = r.items.map((it) => `${it.name} x${it.quantity} @₱${it.price}`).join("; ");
      return [r.order_id, r.order_type, r.source, r.customer_name, r.customer_email || "", r.customer_phone || "", r.branch_name || "", itemsStr, r.subtotal, r.delivery_fee, r.discount, r.total, r.payment_method || "", r.payment_status || "", r.senior_pwd_discount ? "Yes" : "No", r.notes || "", r.placed_at ? new Date(r.placed_at).toISOString() : "", new Date(r.completed_at).toISOString()];
    });
    const header = ["Order ID", "Order Type", "Source", "Customer Name", "Customer Email", "Customer Phone", "Branch", "Items", "Subtotal", "Delivery Fee", "Discount", "Total", "Payment Method", "Payment Status", "PWD/Senior Discount", "Notes", "Placed At", "Completed At"];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `receipts_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const orderTypeColors: Record<string, string> = {
    dine_in: "bg-amber-50 text-amber-600",
    takeout: "bg-purple-50 text-purple-600",
    delivery: "bg-orange-50 text-orange-600",
    pickup: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-gray-400">{receipts.length} receipts shown</p>
        <button onClick={() => fetchReceipts(true)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
        <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export CSV
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 disabled:opacity-40"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          {importing ? "Importing…" : "Import CSV"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="hidden"
        />
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={`rounded-lg px-4 py-2.5 text-xs font-medium flex items-center justify-between ${importResult.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          <span>
            {importResult.error
              ? `Import error: ${importResult.error}`
              : `Imported ${importResult.ok} receipt${importResult.ok !== 1 ? "s" : ""}${importResult.skipped > 0 ? ` (${importResult.skipped} skipped)` : ""}`}
          </span>
          <button onClick={() => setImportResult(null)} className="ml-2 font-bold hover:opacity-70">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "walk_in", "online"] as const).map((s) => (
            <button key={s} onClick={() => setSourceFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sourceFilter === s ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {s === "all" ? "All" : s === "walk_in" ? "🚶 Walk-in" : "🌐 Online"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-400">From:</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
          <label className="text-xs font-semibold text-gray-400">To:</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
          )}
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => setDeleteConfirm({ type: "range" })}
            disabled={deleting}
            className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-100 transition-colors disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "🗑 Delete Range"}
          </button>
        )}
      </div>

      {loading && receipts.length === 0 ? <LoadingSkeleton /> :
       !loading && receipts.length === 0 ? <EmptyState message="No receipts found for the selected filters." /> : (
        <>
          {/* Desktop table — scrollable container */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-[10px] uppercase text-gray-400 tracking-wider shadow-sm">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Order #</th>
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Total</th>
                  <th className="px-4 py-2.5 font-semibold">Payment</th>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-400">#{r.order_id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold ${sourceColors[r.source]}`}>
                        {r.source === "walk_in" ? "🚶" : "🌐"} {r.source === "walk_in" ? "Walk-in" : "Online"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-800">{r.customer_name}</p>
                      {r.customer_phone && <p className="text-xs text-gray-400">📱 {r.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">₱{r.total}</td>
                    <td className="px-4 py-3">
                      {r.payment_method ? (
                        <span className="text-xs font-semibold text-gray-600">{PAYMENT_LABEL[r.payment_method] || r.payment_method}</span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(r.completed_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile cards — scrollable container */}
          <div className="md:hidden overflow-auto max-h-[60vh] space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
            {receipts.map((r) => (
              <button key={r.id} onClick={() => setSelected(r)} className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-400">#{r.order_id.slice(0, 8).toUpperCase()}</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${sourceColors[r.source]}`}>
                      {r.source === "walk_in" ? "🚶 Walk-in" : "🌐 Online"}
                    </span>
                  </div>
                  <span className="text-base font-black text-red-600">₱{r.total}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-gray-800">{r.customer_name}</p>
                    <p className="text-gray-400">{new Date(r.completed_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  {r.payment_method && <span className="text-gray-500">{PAYMENT_LABEL[r.payment_method] || r.payment_method}</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {hasMore && (
        <button onClick={handleLoadMore} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold hover:bg-gray-200 transition-colors">
          Load More
        </button>
      )}

      {/* ─── Receipt Detail Modal ─── */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[80]" onClick={() => setSelected(null)} />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-fade-in-scale">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6] sticky top-0 bg-white rounded-t-2xl z-10">
                <div>
                  <h3 className="font-black text-base text-[#0a0a0a]">Receipt</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Order #{selected.order_id.slice(0, 8).toUpperCase()}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Source + Type badges */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${sourceColors[selected.source]}`}>
                    {selected.source === "walk_in" ? "🚶 Walk-in" : "🌐 Online"}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${orderTypeColors[selected.order_type] || "bg-gray-50 text-gray-500"}`}>
                    {OT_ICON[selected.order_type as OrderType] || ""} {OT_LABEL[selected.order_type as OrderType] || selected.order_type}
                  </span>
                  {selected.senior_pwd_discount && (
                    <span className="inline-block px-2 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-600">♿ PWD/Senior</span>
                  )}
                </div>

                {/* Customer Info */}
                <div className="bg-[#f9fafb] rounded-xl p-3 space-y-1">
                  <p className="text-sm font-bold text-gray-800">{selected.customer_name}</p>
                  {selected.customer_email && <p className="text-xs text-gray-500">{selected.customer_email}</p>}
                  {selected.customer_phone && <p className="text-xs text-gray-500">📱 {selected.customer_phone}</p>}
                  {selected.branch_name && <p className="text-xs text-gray-400 mt-1">🏢 {selected.branch_name}</p>}
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Items</p>
                  <div className="space-y-1.5">
                    {selected.items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-gray-300 w-6 text-right">{it.quantity}x</span>
                          <span className="font-semibold text-gray-700 truncate">{it.name}</span>
                          {it.note && <span className="text-xs text-gray-400 italic truncate">"{it.note}"</span>}
                        </div>
                        <span className="font-bold text-gray-600 flex-shrink-0 ml-3">₱{it.price * it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="font-semibold text-gray-700">₱{selected.subtotal}</span></div>
                  {selected.delivery_fee > 0 && <div className="flex justify-between text-gray-500"><span>Delivery Fee</span><span className="font-semibold text-gray-700">₱{selected.delivery_fee}</span></div>}
                  {selected.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="font-semibold">-₱{selected.discount}</span></div>}
                  <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-100"><span>Total</span><span className="text-red-600">₱{selected.total}</span></div>
                </div>

                {/* Payment */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {selected.payment_method && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Payment Method</span>
                      <span className="font-semibold text-gray-700">{PAYMENT_LABEL[selected.payment_method] || selected.payment_method}</span>
                    </div>
                  )}
                  {selected.payment_status && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selected.payment_status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{selected.payment_status}</span>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="border-t border-gray-100 pt-3 space-y-1 text-xs text-gray-400">
                  {selected.placed_at && <div className="flex justify-between"><span>Placed</span><span>{new Date(selected.placed_at).toLocaleString("en-PH")}</span></div>}
                  <div className="flex justify-between"><span>Completed</span><span>{new Date(selected.completed_at).toLocaleString("en-PH")}</span></div>
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-gray-600 italic">{selected.notes}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-[#f3f4f6] px-5 py-4 flex gap-3">
                <button
                  onClick={() => setDeleteConfirm({ type: "single", receiptId: selected.id })}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "🗑 Delete Receipt"}
                </button>
                <button onClick={() => setSelected(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <ConfirmModal
        open={deleteConfirm !== null}
        title={deleting ? "Deleting…" : deleteConfirm?.type === "single" ? "Delete Receipt" : "Delete by Date Range"}
        message={deleteConfirm?.type === "single"
          ? `Permanently delete this receipt? This action cannot be undone.`
          : `Permanently delete ALL receipts${dateFrom ? ` from ${dateFrom}` : ""}${dateTo ? ` to ${dateTo}` : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === "single" && deleteConfirm.receiptId) handleDeleteReceipt(deleteConfirm.receiptId);
          else handleDeleteByDateRange();
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
