"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit-log";
import { LoadingSkeleton, EmptyState } from "./shared";
import type { OrderStatus, OrderType, AdminOrder } from "./shared";
import { STATUS_OPTIONS, STATUS_BG, getNextStatuses, OT_ICON, OT_LABEL } from "./shared";

export default function OrdersPanel() {
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
    if (newStatus === "cancelled" && oldOrder && oldOrder.status !== "cancelled") {
      const reason = window.prompt("Reason for cancellation (optional):");
      if (reason !== null) {
        updates.notes = (oldOrder.notes ? oldOrder.notes + "\n" : "") + `[Cancelled by admin]: ${reason || "No reason given"}`;
      }
    }
    await sb.from("orders").update(updates).eq("id", orderId);
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
                        {getNextStatuses(o.status, o.orderType).map((s) => (
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