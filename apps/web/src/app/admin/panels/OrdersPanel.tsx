"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmModal from "@/app/_components/ConfirmModal";
import { LoadingSkeleton, EmptyState } from "./shared";
import type { OrderStatus, OrderType, AdminOrder } from "./shared";
import { STATUS_OPTIONS, STATUS_BG, getNextStatuses, OT_ICON, OT_LABEL, PAYMENT_LABEL, PAYMENT_ICON, PAYMENT_STATUS_BG, SOURCE_OPTIONS, SOURCE_FILTER, SOURCE_BG, type OrderSource } from "./shared";
import { useBranch } from "@/lib/branch-context";
import { useReactToPrint } from "react-to-print";

export default function OrdersPanel({ branchId }: { branchId?: string | null }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const { branch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | OrderSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<AdminOrder | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [confirmOutForDelivery, setConfirmOutForDelivery] = useState<{ orderId: string } | null>(null);
  const [confirmDeliver, setConfirmDeliver] = useState<{ orderId: string } | null>(null);
  const [confirmWithDiscount, setConfirmWithDiscount] = useState<{ orderId: string; newStatus: OrderStatus; oldStatus: OrderStatus } | null>(null);
  const [seniorPwdDiscount, setSeniorPwdDiscount] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    pageStyle: `
      @page { size: 65mm 200mm; margin: 0; }
      @media print { html, body { margin: 0 !important; padding: 0 !important; } }
    `,
    onAfterPrint: () => setReceiptOrder(null),
  });
  const hasOrdersLoaded = React.useRef(false);
  const fetchOrders = useCallback(async () => {
    const sb = createClient();
    let query = sb.from("orders").select("id, order_type, status, subtotal, delivery_fee, discount, total, notes, placed_at, completed_at, payment_method, payment_status, senior_pwd_discount, customer:profiles(first_name, last_name, email, phone)");
    if (branchId) query = query.eq("branch_id", branchId);
    const { data: rows, error } = await query.order("placed_at", { ascending: false });
    if (error || !rows) {
      if (!hasOrdersLoaded.current) { setOrders([]); setLoading(false); }
      return;
    }
    const ids = rows.map((r: any) => r.id);
    const { data: items } = await sb.from("order_items").select("order_id, quantity, unit_price, note, menu_item").in("order_id", ids);
    const itemsByOrder = new Map<string, { name: string; quantity: number; price: number; note: string }[]>();
    if (items) for (const it of items) { const arr = itemsByOrder.get(it.order_id) || []; arr.push({ name: it.menu_item || "Unknown", quantity: it.quantity, price: it.unit_price, note: it.note ?? "" }); itemsByOrder.set(it.order_id, arr); }
    setOrders(rows.map((r: any) => {
      const cust = r.customer as any;
      const custName = cust?.first_name && cust?.last_name
        ? `${cust.first_name} ${cust.last_name}`
        : cust?.email || "N/A";
      return { id: r.id, customerName: custName, customerEmail: cust?.email || "", customerPhone: cust?.phone || null, orderType: r.order_type as OrderType, status: r.status as OrderStatus, subtotal: r.subtotal, deliveryFee: r.delivery_fee, discount: r.discount, total: r.total, notes: r.notes, items: itemsByOrder.get(r.id) || [], placedAt: r.placed_at, completedAt: r.completed_at, paymentMethod: r.payment_method, paymentSourceId: null, paymentStatus: r.payment_status, seniorPwdDiscount: r.senior_pwd_discount ?? false };
    }));
    if (!hasOrdersLoaded.current) setLoading(false);
    hasOrdersLoaded.current = true;
  }, [branchId]);
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 1000);
    return () => clearInterval(interval);
  }, [fetchOrders]);
  async function handleTogglePayment(orderId: string, currentStatus: string) {
    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
    const sb = createClient();
    await sb.from("orders").update({ payment_status: newStatus }).eq("id", orderId);
    await fetchOrders();
  }
  async function handleDeleteOrder(orderId: string) { const sb = createClient(); await sb.from("order_items").delete().eq("order_id", orderId); await sb.from("orders").delete().eq("id", orderId); await fetchOrders(); setDeleteOrderId(null); }
  async function handleConfirmOutForDelivery() {
    if (!confirmOutForDelivery) return;
    const orderId = confirmOutForDelivery.orderId;
    setConfirmOutForDelivery(null);
    setSavingId(orderId);
    const sb = createClient();
    await sb.from("orders").update({ status: "out_for_delivery" }).eq("id", orderId);
    await fetchOrders();
    setSavingId(null);
  }
  async function handleConfirmWithDiscount() {
    if (!confirmWithDiscount) return;
    const { orderId, newStatus, oldStatus } = confirmWithDiscount;
    const oldOrder = orders.find((o) => o.id === orderId);
    setConfirmWithDiscount(null);
    setSavingId(orderId);
    const sb = createClient();

    let discountAmount = 0;
    let newTotal = oldOrder?.total ?? 0;

    if (seniorPwdDiscount) {
      const items = oldOrder?.items ?? [];
      if (items.length > 0) {
        let maxPrice = 0;
        for (let i = 0; i < items.length; i++) {
          if (items[i].price > maxPrice) maxPrice = items[i].price;
        }
        discountAmount = Math.round(maxPrice * 0.2 * 100) / 100;
      }
      newTotal = (oldOrder?.subtotal ?? 0) + (oldOrder?.deliveryFee ?? 0) - discountAmount;
      newTotal = Math.round(newTotal * 100) / 100;
    }

    const updates: Record<string, unknown> = {
      status: newStatus,
      senior_pwd_discount: seniorPwdDiscount,
      discount: discountAmount,
      total: newTotal,
    };

    await sb.from("orders").update(updates).eq("id", orderId);
    setSeniorPwdDiscount(false);
    await fetchOrders();
    setSavingId(null);
  }

  async function handleConfirmDeliver() {
    if (!confirmDeliver) return;
    const orderId = confirmDeliver.orderId;
    const oldOrder = orders.find((o) => o.id === orderId);
    setConfirmDeliver(null);
    setSavingId(orderId);
    const sb = createClient();
    const updates: Record<string, unknown> = { status: "delivered", completed_at: new Date().toISOString() };
    if (oldOrder?.paymentMethod === "cod" && oldOrder?.paymentStatus !== "paid") {
      updates.payment_status = "paid";
    }
    await sb.from("orders").update(updates).eq("id", orderId);
    await fetchOrders();
    setSavingId(null);
  }
  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    const oldOrder = orders.find((o) => o.id === orderId);

    // Intercept: pending → confirmed — show discount modal for PWD/Senior discount (walk-in only)
    if (newStatus === "confirmed" && oldOrder?.status === "pending" && isWalkIn(oldOrder)) {
      setSeniorPwdDiscount(oldOrder.seniorPwdDiscount ?? false);
      setConfirmWithDiscount({ orderId, newStatus, oldStatus: oldOrder.status });
      return;
    }

    // Intercept: online delivery order going from "prepared" → "out_for_delivery" needs confirmation
    if (newStatus === "out_for_delivery" && oldOrder?.status === "prepared" && oldOrder?.orderType === "delivery") {
      setConfirmOutForDelivery({ orderId });
      return;
    }

    // Intercept: online delivery order going from "out_for_delivery" → "delivered" needs confirmation
    if (newStatus === "delivered" && oldOrder?.status === "out_for_delivery" && oldOrder?.orderType === "delivery") {
      setConfirmDeliver({ orderId });
      return;
    }

    setSavingId(orderId); const sb = createClient();
    const updates: Record<string, unknown> = { status: newStatus }; if (newStatus === "delivered") {
      updates.completed_at = new Date().toISOString();
      if (oldOrder?.paymentMethod === "cod" && oldOrder?.paymentStatus !== "paid") {
        updates.payment_status = "paid";
      }
    }
    if (newStatus === "cancelled" && oldOrder && oldOrder.status !== "cancelled") {
      const reason = window.prompt("Reason for cancellation (optional):");
      if (reason !== null) {
        updates.notes = (oldOrder.notes ? oldOrder.notes + "\n" : "") + `[Cancelled by admin]: ${reason || "No reason given"}`;
      }
    }
    await sb.from("orders").update(updates).eq("id", orderId);

    // If cancelling a paid online order, refund via PayMongo
    if (newStatus === "cancelled" && oldOrder && oldOrder.status !== "cancelled" &&
        oldOrder?.paymentStatus === "paid" && oldOrder?.paymentMethod !== "cod") {
      try {
        await fetch("/api/paymongo/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
      } catch { /* best-effort, don't block cancel */ }
    }

    await fetchOrders(); setSavingId(null);
    if (oldOrder?.status === "pending" && newStatus !== "pending") setReceiptOrder(orders.find((o) => o.id === orderId) || null);
  }
  function fmt(iso: string) { const d = new Date(iso); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const h = d.getHours(); const mi = d.getMinutes().toString().padStart(2, "0"); const a = h >= 12 ? "PM" : "AM"; return `${m[d.getMonth()]} ${d.getDate()}, ${h % 12 || 12}:${mi} ${a}`; }
  function toggleExpand(id: string) { setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const isWalkIn = (o: AdminOrder) => o.orderType === "dine_in" || o.orderType === "takeout";
  const statusLabel = (status: OrderStatus, orderType: OrderType) => {
    if (status === "delivered" && (orderType === "dine_in" || orderType === "takeout")) return "complete";
    return status.replace(/_/g, " ");
  };
  const filtered = orders
    .filter((o) => sourceFilter === "all" || SOURCE_FILTER[o.orderType] === sourceFilter)
    .filter((o) => statusFilter === "all" || o.status === statusFilter);
  if (loading && orders.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-400 mt-0.5">{orders.length} total</p>
        <button onClick={() => fetchOrders()} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setSourceFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sourceFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All Sources</button>
          {SOURCE_OPTIONS.map((s) => (<button key={s.value} onClick={() => setSourceFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sourceFilter === s.value ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{s.icon} {s.label}</button>))}
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setStatusFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === "all" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All Status</button>
          {STATUS_OPTIONS.map((s) => (<button key={s.value} onClick={() => setStatusFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === s.value ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{s.label}</button>))}
        </div>
      </div>
      {filtered.length === 0 ? <EmptyState message="No orders." /> : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const s = STATUS_BG[o.status]; const isEx = expanded.has(o.id);
            return (
              <div key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleExpand(o.id)}>
                  <div className="flex-shrink-0 text-gray-300 text-sm">{isEx ? "▼" : "▶"}</div>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-gray-400">#{o.id.slice(0, 8).toUpperCase()}…</span><span className="text-xs text-gray-400">{OT_ICON[o.orderType]} {OT_LABEL[o.orderType]}</span><span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${SOURCE_BG[SOURCE_FILTER[o.orderType]]}`}>{SOURCE_FILTER[o.orderType] === "walk_in" ? "🚶 Walk-in" : "🌐 Online"}</span></div><p className="text-sm font-semibold text-gray-800 truncate">{o.customerName}</p></div>
                  <div className="text-right flex-shrink-0"><p className="text-sm font-black text-red-600">₱{o.total}</p><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${s}`}>{isWalkIn(o) && o.status === "delivered" ? "complete" : o.status}</span></div>
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
                    <div className="text-xs text-gray-400 space-y-0.5"><p>Placed: {new Date(o.placedAt).toLocaleString()}</p>{o.completedAt && <p>Completed: {new Date(o.completedAt).toLocaleString()}</p>}{o.notes && <p className="italic">Note: {o.notes}</p>}
                    {/* Customer Phone */}
                    {o.customerPhone && (
                      <div className="pt-1.5 border-t border-gray-200 mt-1.5 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">📱</span>
                        <span className="text-xs font-semibold text-gray-700">{o.customerPhone}</span>
                      </div>
                    )}
                    {o.paymentMethod && (
                      <div className="pt-1.5 border-t border-gray-200 mt-1.5">
                        <p className="text-xs font-semibold text-gray-400 mb-1">💳 Payment</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-700">{PAYMENT_ICON[o.paymentMethod] || ""} {PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod}</span>
                          {o.paymentStatus && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold capitalize ${PAYMENT_STATUS_BG[o.paymentStatus] || "bg-gray-50 text-gray-500"}`}>
                              {o.paymentStatus}
                            </span>
                          )}
                          {isWalkIn(o) && o.paymentStatus === "unpaid" && o.status !== "cancelled" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleTogglePayment(o.id, o.paymentStatus!); }}
                              className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            >
                              Mark as Paid
                            </button>
                          )}
                        </div>
                      </div>
                    )}</div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      {o.status !== "delivered" && o.status !== "cancelled" ? (
                        <>
                          <span className="text-xs font-semibold text-gray-400">Status:</span>
                          <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)} disabled={savingId === o.id} className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30">
                            <option value={o.status} className="bg-white">{statusLabel(o.status, o.orderType)} (current)</option>
                        {getNextStatuses(o.status, o.orderType).map((s) => (
                              <option key={s} value={s} className="bg-white">{statusLabel(s, o.orderType)}</option>
                            ))}
                          </select>
                          {savingId === o.id && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-gray-400">Status: {statusLabel(o.status, o.orderType)} (final)</span>
                      )}
                      {o.status !== "pending" && o.paymentStatus !== "unpaid" && <button onClick={(e) => { e.stopPropagation(); setReceiptOrder(o); }} className="ml-auto px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100">Print Receipt</button>}
                      {(o.status === "pending" || o.status === "delivered" || o.status === "cancelled") && (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteOrderId(o.id); }} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {receiptOrder && (() => {
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
        const timeStr = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;
        const branchName = branch?.name ?? "SIZZLING HUB";
        const branchAddr = branch?.address ?? "";
        const branchPhone = branch?.phone ?? "";
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const logoUrl = branchId && supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/images/${branchId}/logo.png` : null;
        return (
          <>
            <div className="fixed inset-0 bg-black/30 z-50 no-print" onClick={() => setReceiptOrder(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 receipt-wrapper">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto receipt-outer">
                {/* 80mm Thermal Receipt */}
                <div ref={receiptRef} className="receipt-popup bg-white p-3 text-xs font-mono text-black w-[280px] mx-auto">
                  {/* Header */}
                  <div className="text-center mb-3 border-b border-dashed border-black pb-3">
                    {logoUrl && <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    <h1 className="font-bold text-base uppercase">{branchName}</h1>
                    {branchAddr && <p>{branchAddr}</p>}
                    {branchPhone && <p>Tel: {branchPhone}</p>}
                    <p className="mt-1 font-bold">ORDER RECEIPT</p>
                  </div>
                  {/* Transaction Info */}
                  <div className="mb-3 border-b border-dashed border-black pb-3 text-left">
                    <div className="flex justify-between">
                      <span>Date: {dateStr}</span>
                      <span>Time: {timeStr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Order: #{receiptOrder.id.slice(0, 8).toUpperCase()}</span>
                      <span>{OT_LABEL[receiptOrder.orderType]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span>{receiptOrder.customerName}</span>
                    </div>
                  </div>
                  {/* Items Table */}
                  <div className="mb-3 border-b border-dashed border-black pb-3">
                    <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
                      <span className="w-1/2">Item</span>
                      <span className="w-1/4 text-center">Qty</span>
                      <span className="w-1/4 text-right">Price</span>
                    </div>
                    {receiptOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between py-0.5">
                        <span className="w-1/2 truncate">{item.name}</span>
                        <span className="w-1/4 text-center">{item.quantity}</span>
                        <span className="w-1/4 text-right">₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Totals */}
                  <div className="mb-3 text-right border-b border-dashed border-black pb-3">
                    <div className="flex justify-between py-0.5">
                      <span>Subtotal:</span>
                      <span>₱{receiptOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {receiptOrder.deliveryFee > 0 && (
                      <div className="flex justify-between py-0.5">
                        <span>Delivery Fee:</span>
                        <span>₱{receiptOrder.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    {receiptOrder.discount > 0 && (
                      <div className="flex justify-between py-0.5">
                        <span>Discount:</span>
                        <span>-₱{receiptOrder.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-0.5 font-bold text-sm mt-1 border-t border-black pt-1">
                      <span>TOTAL:</span>
                      <span>₱{receiptOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                  {/* Payment Details */}
                  {receiptOrder.paymentMethod && (
                    <div className="mb-3 border-b border-dashed border-black pb-3">
                      <div className="flex justify-between py-0.5">
                        <span>Payment:</span>
                        <span>{PAYMENT_LABEL[receiptOrder.paymentMethod] || receiptOrder.paymentMethod}</span>
                      </div>
                      {receiptOrder.paymentStatus && (
                        <div className="flex justify-between py-0.5">
                          <span>Status:</span>
                          <span className="capitalize">{receiptOrder.paymentStatus}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Footer */}
                  <div className="text-center text-[10px] border-t border-black pt-3">
                    <p>THANK YOU!</p>
                    <p className="mt-1 font-bold">*** COPY ***</p>
                  </div>
                </div>
                {/* Print Button */}
                <div className="flex gap-2 p-4 no-print">
                  <button onClick={() => handlePrint()} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">🖨 Print Receipt</button>
                  <button onClick={() => setReceiptOrder(null)} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">Close</button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
      <ConfirmModal
        open={deleteOrderId !== null}
        title="Delete Order"
        message={`Permanently delete order #${deleteOrderId?.slice(0, 8).toUpperCase() || ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => deleteOrderId && handleDeleteOrder(deleteOrderId)}
        onCancel={() => setDeleteOrderId(null)}
      />
      <ConfirmModal
        open={confirmOutForDelivery !== null}
        title="Out for Delivery"
        message={`Mark order #${confirmOutForDelivery?.orderId.slice(0, 8).toUpperCase() || ""} as "Out for Delivery"? This action should be confirmed in the driver's app before proceeding.`}
        confirmLabel="Yes, Out for Delivery"
        onConfirm={handleConfirmOutForDelivery}
        onCancel={() => setConfirmOutForDelivery(null)}
      />
      <ConfirmModal
        open={confirmDeliver !== null}
        title="Mark as Delivered"
        message={`Mark order #${confirmDeliver?.orderId.slice(0, 8).toUpperCase() || ""} as "Delivered"? This will complete the order.`}
        confirmLabel="Yes, Delivered"
        onConfirm={handleConfirmDeliver}
        onCancel={() => setConfirmDeliver(null)}
      />
      {confirmWithDiscount && (() => {
        const order = orders.find((o) => o.id === confirmWithDiscount.orderId);
        const items = order?.items ?? [];
        let maxPrice = 0;
        let maxItemName = "";
        for (const it of items) {
          if (it.price > maxPrice) { maxPrice = it.price; maxItemName = it.name; }
        }
        const discountAmount = Math.round(maxPrice * 0.2 * 100) / 100;
        const newTotal = Math.round(((order?.subtotal ?? 0) + (order?.deliveryFee ?? 0) - (seniorPwdDiscount ? discountAmount : 0)) * 100) / 100;
        return (
          <>
            <div className="fixed inset-0 bg-black/30 z-[100]" onClick={() => { setConfirmWithDiscount(null); setSeniorPwdDiscount(false); }} />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-sm animate-fade-in-scale">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
                  <h3 className="font-black text-base text-[#0a0a0a]">Confirm Order</h3>
                  <button onClick={() => { setConfirmWithDiscount(null); setSeniorPwdDiscount(false); }} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <p className="text-sm text-[#4b5563] leading-relaxed">
                    Confirm order <span className="font-mono font-bold text-gray-800">#{confirmWithDiscount.orderId.slice(0, 8).toUpperCase()}…</span>?
                  </p>
                  <div className="bg-[#f9fafb] rounded-xl p-3 border border-[#f3f4f6]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#1f2937]">♿ PWD / 👴 Senior Discount (20%)</p>
                        <p className="text-xs text-[#6b7280] mt-0.5">
                          {seniorPwdDiscount
                            ? `Deducts ₱${discountAmount.toFixed(2)} from "${maxItemName}" (most expensive item)`
                            : "Toggle to apply 20% off the most expensive item"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSeniorPwdDiscount(!seniorPwdDiscount)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${seniorPwdDiscount ? "bg-emerald-500" : "bg-gray-300"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${seniorPwdDiscount ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                  </div>
                  {seniorPwdDiscount && (
                    <div className="space-y-1 text-xs text-[#6b7280] bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                      <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">₱{order?.subtotal}</span></div>
                      {(order?.deliveryFee ?? 0) > 0 && <div className="flex justify-between"><span>Delivery Fee</span><span className="font-semibold">₱{order?.deliveryFee}</span></div>}
                      <div className="flex justify-between text-emerald-600 font-bold"><span>PWD/Senior Discount</span><span>-₱{discountAmount.toFixed(2)}</span></div>
                      <div className="flex justify-between border-t border-emerald-200 pt-1 text-sm font-black text-emerald-700"><span>New Total</span><span>₱{newTotal.toFixed(2)}</span></div>
                    </div>
                  )}
                </div>
                <div className="border-t border-[#f3f4f6] px-5 py-4 flex gap-3">
                  <button
                    onClick={() => { setConfirmWithDiscount(null); setSeniorPwdDiscount(false); }}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmWithDiscount}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200"
                    style={{ backgroundColor: "#dc2626" }}
                  >
                    {seniorPwdDiscount ? "Confirm with Discount" : "Confirm (No Discount)"}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}