"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmModal from "@/app/_components/ConfirmModal";
import ChatPanel from "@/app/_components/ChatPanel";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [groupByStatus, setGroupByStatus] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<AdminOrder | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [confirmOutForDelivery, setConfirmOutForDelivery] = useState<{ orderId: string } | null>(null);
  const [confirmDeliver, setConfirmDeliver] = useState<{ orderId: string } | null>(null);
  const [confirmWithDiscount, setConfirmWithDiscount] = useState<{ orderId: string; newStatus: OrderStatus; oldStatus: OrderStatus } | null>(null);
  const [seniorPwdDiscount, setSeniorPwdDiscount] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // ── Sidebar drawer state ──
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  async function generateReceipt(order: AdminOrder) {
    const sb = createClient();
    const { count } = await sb.from("receipts").select("*", { count: "exact", head: true }).eq("order_id", order.id);
    if (count && count > 0) return;
    const source = order.orderType === "dine_in" || order.orderType === "takeout" ? "walk_in" : "online";
    const { data: branchRow } = await sb.from("branches").select("name").eq("id", branchId).maybeSingle();
    await sb.from("receipts").insert({
      order_id: order.id,
      order_type: order.orderType,
      source,
      customer_name: order.customerName,
      customer_email: order.customerEmail || null,
      customer_phone: order.customerPhone || null,
      branch_id: branchId || null,
      branch_name: branchRow?.name || null,
      items: order.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price, note: (it as any).note || "" })),
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      payment_method: order.paymentMethod || null,
      payment_status: order.paymentMethod === "cod" ? null : (order.paymentStatus || null),
      senior_pwd_discount: order.seniorPwdDiscount ?? false,
      notes: order.notes || null,
      placed_at: order.placedAt,
      completed_at: order.completedAt || new Date().toISOString(),
    });
  }
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    pageStyle: `
      @page { size: 65mm 200mm; margin: 0; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; }
        .receipt-popup { margin-left: 0 !important; margin-right: auto !important; }
      }
    `,
    onAfterPrint: () => setReceiptOrder(null),
  });
  const hasOrdersLoaded = React.useRef(false);
  const ordersFingerprintRef = React.useRef<string>("");
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
    const fp = rows.map((r: any) => `${r.id}:${r.status}:${r.payment_status}:${r.total}`).join("|") + "|" + (items ? items.map((it: any) => `${it.order_id}:${it.menu_item}:${it.quantity}`).join("|") : "");
    if (fp === ordersFingerprintRef.current) return;
    ordersFingerprintRef.current = fp;
    setOrders(rows.map((r: any) => {
      const cust = r.customer as any;
      const custName = cust?.first_name && cust?.last_name
        ? `${cust.first_name} ${cust.last_name}`
        : cust?.email || "N/A";
      return { id: r.id, customerName: custName, customerEmail: cust?.email || "", customerPhone: cust?.phone || null, orderType: r.order_type as OrderType, status: r.status as OrderStatus, subtotal: r.subtotal, deliveryFee: r.delivery_fee, discount: r.discount, total: r.total, notes: r.notes, items: itemsByOrder.get(r.id) || [], placedAt: r.placed_at, completedAt: r.completed_at, paymentMethod: r.payment_method, paymentStatus: r.payment_status, seniorPwdDiscount: r.senior_pwd_discount ?? false };
    }));
    if (!hasOrdersLoaded.current) setLoading(false);
    hasOrdersLoaded.current = true;
  }, [branchId]);
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => { fetchOrders(); }, 1000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  function updateOrderState(orderId: string, updates: Partial<AdminOrder>) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
  }

  async function handleTogglePayment(orderId: string, currentStatus: string) {
    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
    updateOrderState(orderId, { paymentStatus: newStatus });
    const sb = createClient();
    await sb.from("orders").update({ payment_status: newStatus }).eq("id", orderId);
  }
  async function handleDeleteOrder(orderId: string) {
    const sb = createClient();
    const { data: chatFiles } = await sb.storage.from("images").list(`chat/${orderId}`, { limit: 500 });
    if (chatFiles && chatFiles.length > 0) {
      const paths = chatFiles.map((f) => `chat/${orderId}/${f.name}`);
      await sb.storage.from("images").remove(paths);
    }
    await sb.from("order_messages").delete().eq("order_id", orderId);
    await sb.from("order_items").delete().eq("order_id", orderId);
    await sb.from("orders").delete().eq("id", orderId);
    setSelectedOrderId(null);
    await fetchOrders();
    setDeleteOrderId(null);
  }

  async function sendStatusMessage(orderId: string, status: OrderStatus, orderType?: OrderType) {
    if (orderType && orderType !== "delivery" && orderType !== "pickup") return;
    const statusMessages: Record<string, string> = {
      confirmed: "✅ Your order has been confirmed! We're getting ready to prepare it.",
      preparing: "👨‍🍳 Your order is now being prepared with care.",
      prepared: "📦 Your order has been prepared and is ready to go.",
      ready: "📦 Your order is ready for pickup! Please come to the counter.",
      out_for_delivery: "🛵 Your order is out for delivery and on its way to you!",
      delivered: "✅ Your order has been delivered. Thank you and enjoy your meal! 🍽️",
      cancelled: "❌ Your order has been cancelled. If you have questions, please contact us.",
    };
    const msg = statusMessages[status];
    if (!msg) return;
    const sb = createClient();
    await sb.from("order_messages").insert({
      order_id: orderId,
      sender_id: (await sb.auth.getSession()).data.session?.user?.id || "",
      sender_role: "admin",
      message: msg,
    });
  }

  async function handleConfirmOutForDelivery() {
    if (!confirmOutForDelivery) return;
    const orderId = confirmOutForDelivery.orderId;
    setConfirmOutForDelivery(null);
    setSavingId(orderId);
    const sb = createClient();
    updateOrderState(orderId, { status: "out_for_delivery" });
    await sb.from("orders").update({ status: "out_for_delivery" }).eq("id", orderId);
    const order = orders.find((o) => o.id === orderId);
    if (order) await sendStatusMessage(orderId, "out_for_delivery", order.orderType);
    setSavingId(null);
  }
  async function handleConfirmWithDiscount() {
    if (!confirmWithDiscount) return;
    const { orderId, newStatus } = confirmWithDiscount;
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
        for (let i = 0; i < items.length; i++) { if (items[i].price > maxPrice) maxPrice = items[i].price; }
        discountAmount = Math.round(maxPrice * 0.2 * 100) / 100;
      }
      newTotal = (oldOrder?.subtotal ?? 0) + (oldOrder?.deliveryFee ?? 0) - discountAmount;
      newTotal = Math.round(newTotal * 100) / 100;
    }

    const updates: Record<string, unknown> = { status: newStatus, senior_pwd_discount: seniorPwdDiscount, discount: discountAmount, total: newTotal };
    const optimistic: Partial<AdminOrder> = { status: newStatus, discount: discountAmount, total: newTotal, seniorPwdDiscount };
    // Auto-mark GCash as paid when confirmed
    if (newStatus === "confirmed" && oldOrder?.paymentMethod === "gcash" && oldOrder?.paymentStatus !== "paid") {
      updates.payment_status = "paid";
      optimistic.paymentStatus = "paid";
    }
    updateOrderState(orderId, optimistic);
    await sb.from("orders").update(updates).eq("id", orderId);
    setSeniorPwdDiscount(false);
    if (oldOrder) await sendStatusMessage(orderId, newStatus, oldOrder.orderType);
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
    if (oldOrder?.paymentMethod === "cod" && oldOrder?.paymentStatus !== "paid") { updates.payment_status = "paid"; }
    updateOrderState(orderId, { status: "delivered", completedAt: new Date().toISOString(), ...(oldOrder?.paymentMethod === "cod" && oldOrder?.paymentStatus !== "paid" ? { paymentStatus: "paid" } : {}) });
    await sb.from("orders").update(updates).eq("id", orderId);
    const deliveredOrder = orders.find((o) => o.id === orderId);
    if (deliveredOrder) await generateReceipt(deliveredOrder);
    if (oldOrder) await sendStatusMessage(orderId, "delivered", oldOrder.orderType);
    setSavingId(null);
  }
  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    const oldOrder = orders.find((o) => o.id === orderId);
    if (newStatus === "confirmed" && oldOrder?.status === "pending" && isWalkIn(oldOrder)) {
      setSeniorPwdDiscount(oldOrder.seniorPwdDiscount ?? false);
      setConfirmWithDiscount({ orderId, newStatus, oldStatus: oldOrder.status });
      return;
    }
    if (newStatus === "out_for_delivery" && oldOrder?.status === "prepared" && oldOrder?.orderType === "delivery") {
      setConfirmOutForDelivery({ orderId });
      return;
    }
    if (newStatus === "delivered" && oldOrder?.status === "out_for_delivery" && oldOrder?.orderType === "delivery") {
      setConfirmDeliver({ orderId });
      return;
    }
    setSavingId(orderId); const sb = createClient();
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "delivered") { updates.completed_at = new Date().toISOString(); if (oldOrder?.paymentMethod === "cod" && oldOrder?.paymentStatus !== "paid") { updates.payment_status = "paid"; } }
    // Auto-mark GCash orders as paid when confirmed (pickup & delivery)
    if (newStatus === "confirmed" && oldOrder?.paymentMethod === "gcash" && oldOrder?.paymentStatus !== "paid") {
      updates.payment_status = "paid";
    }
    if (newStatus === "cancelled" && oldOrder && oldOrder.status !== "cancelled") {
      const reason = window.prompt("Reason for cancellation (optional):");
      if (reason !== null) { updates.notes = (oldOrder.notes ? oldOrder.notes + "\n" : "") + `[Cancelled by admin]: ${reason || "No reason given"}`; }
    }
    const optimistic: Partial<AdminOrder> = { status: newStatus };
    if (newStatus === "delivered") optimistic.completedAt = new Date().toISOString();
    if (newStatus === "confirmed" && oldOrder?.paymentMethod === "gcash" && oldOrder?.paymentStatus !== "paid") optimistic.paymentStatus = "paid";
    if (newStatus === "cancelled" && oldOrder && oldOrder.status !== "cancelled" && updates.notes) optimistic.notes = updates.notes as string;
    updateOrderState(orderId, optimistic);
    await sb.from("orders").update(updates).eq("id", orderId);
    if (oldOrder) await sendStatusMessage(orderId, newStatus, oldOrder.orderType);
    if (newStatus === "delivered") {
      const deliveredOrder = orders.find((o) => o.id === orderId);
      if (deliveredOrder) await generateReceipt(deliveredOrder);
    }
    setSavingId(null);
    if (oldOrder?.status === "pending" && newStatus !== "pending") setReceiptOrder(orders.find((o) => o.id === orderId) || null);
  }

  const isWalkIn = (o: AdminOrder) => o.orderType === "dine_in" || o.orderType === "takeout";
  const statusLabel = (status: OrderStatus, orderType: OrderType) => {
    if (status === "delivered" && (orderType === "dine_in" || orderType === "takeout")) return "complete";
    return status.replace(/_/g, " ");
  };

  function relTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  }
  function fullTime(iso: string) { return new Date(iso).toLocaleString(); }

  const sourceFiltered = orders.filter((o) => sourceFilter === "all" || SOURCE_FILTER[o.orderType] === sourceFilter);
  const statusFiltered = sourceFiltered.filter((o) => statusFilter === "all" || o.status === statusFilter);
  const filtered = statusFiltered.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
  });

  const statusCounts: Record<string, number> = {};
  for (const s of STATUS_OPTIONS) { statusCounts[s.value] = sourceFiltered.filter((o) => o.status === s.value).length; }
  statusCounts["all"] = sourceFiltered.length;

  const grouped = new Map<OrderStatus, AdminOrder[]>();
  for (const o of filtered) { const list = grouped.get(o.status) || []; list.push(o); grouped.set(o.status, list); }
  const statusOrder: OrderStatus[] = ["pending", "confirmed", "preparing", "prepared", "ready", "out_for_delivery", "delivered", "cancelled"];

  const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) ?? null : null;
  const drawerOpen = selectedOrder !== null;

  if (loading && orders.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search by order # or customer name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-shadow" />
        </div>
        <span className="text-xs text-gray-400 font-semibold"><span className="text-gray-600 font-bold">{filtered.length}</span> / {orders.length} orders</span>
        <button onClick={() => setGroupByStatus(!groupByStatus)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${groupByStatus ? "bg-red-50 text-red-600 border border-red-200" : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg> Group
        </button>
        <button onClick={() => fetchOrders()} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5 border border-red-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Refresh
        </button>
      </div>

      {/* ── Filter Pills ── */}
      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setSourceFilter("all")} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${sourceFilter === "all" ? "bg-red-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All ({orders.length})</button>
          {SOURCE_OPTIONS.map((s) => {
            const count = orders.filter((o) => SOURCE_FILTER[o.orderType] === s.value).length;
            return (<button key={s.value} onClick={() => setSourceFilter(s.value)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${sourceFilter === s.value ? "bg-red-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{s.icon} {s.label} ({count})</button>);
          })}
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setStatusFilter("all")} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${statusFilter === "all" ? "bg-red-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>All ({sourceFiltered.length})</button>
          {STATUS_OPTIONS.map((s) => (<button key={s.value} onClick={() => setStatusFilter(s.value)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${statusFilter === s.value ? "bg-red-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{s.label} ({statusCounts[s.value] || 0})</button>))}
        </div>
      </div>

      {/* ── Order List (scrollable container, click-to-open drawer) ── */}
      <div className="overflow-auto max-h-[65vh] rounded-xl border border-gray-200 bg-white">
        {filtered.length === 0 ? (
          <div className="p-8"><EmptyState message={searchQuery ? "No orders match your search." : "No orders."} /></div>
        ) : groupByStatus ? (
          <div className="space-y-4 p-2">
            {statusOrder.map((status) => {
              const groupOrders = grouped.get(status);
              if (!groupOrders || groupOrders.length === 0) return null;
              const bgClass = STATUS_BG[status];
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${bgClass}`}>{status.replace(/_/g, " ")}</span>
                    <span className="text-[11px] text-gray-400 font-semibold">{groupOrders.length} order{groupOrders.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-1">
                    {groupOrders.map((o) => <OrderRow key={o.id} o={o} selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((o) => <OrderRow key={o.id} o={o} selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} />)}
          </div>
        )}
      </div>

      {/* ── Slide-over Order Detail Drawer ── */}
      {drawerOpen && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => { setSelectedOrderId(null); setSavingId(null); }} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-black text-sm text-gray-900">Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{OT_ICON[selectedOrder.orderType]} {OT_LABEL[selectedOrder.orderType]} · {fullTime(selectedOrder.placedAt)}</p>
              </div>
              <button onClick={() => { setSelectedOrderId(null); setSavingId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Customer */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">👤 Customer</p>
                <p className="text-sm font-bold text-gray-900">{selectedOrder.customerName}</p>
                {selectedOrder.customerEmail && <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.customerEmail}</p>}
                {selectedOrder.customerPhone && <p className="text-xs text-gray-500 mt-0.5">📱 {selectedOrder.customerPhone}</p>}
              </div>

              {/* Items */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">📋 Order Items</p>
                <div className="space-y-1.5">
                  {selectedOrder.items.map((item, i) => {
                    const itemNote = (item as any).note ?? "";
                    return (
                      <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-300 w-6 text-right">x{item.quantity}</span>
                        <span className="flex-1 text-xs font-semibold text-gray-700 truncate">{item.name}</span>
                        <span className="text-xs font-bold text-gray-600">₱{item.price * item.quantity}</span>
                        {itemNote && <p className="text-[10px] text-gray-400 italic ml-2 flex-shrink-0 max-w-[120px] truncate">"{itemNote}"</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="font-semibold text-gray-700">₱{selectedOrder.subtotal}</span></div>
                {selectedOrder.deliveryFee > 0 && <div className="flex justify-between text-gray-500"><span>Delivery Fee</span><span className="font-semibold text-gray-700">₱{selectedOrder.deliveryFee}</span></div>}
                {selectedOrder.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="font-semibold">-₱{selectedOrder.discount}</span></div>}
                <div className="flex justify-between text-sm font-black text-gray-900 pt-1.5 border-t border-gray-200"><span>Total</span><span className="text-red-600">₱{selectedOrder.total}</span></div>
              </div>

              {/* Payment */}
              {selectedOrder.paymentMethod && (
                <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">💳 Payment</p>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-gray-700">{PAYMENT_ICON[selectedOrder.paymentMethod] || ""} {PAYMENT_LABEL[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</span>
                    {selectedOrder.paymentStatus && (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${PAYMENT_STATUS_BG[selectedOrder.paymentStatus] || "bg-gray-50 text-gray-500"}`}>{selectedOrder.paymentStatus}</span>
                    )}
                    {isWalkIn(selectedOrder) && selectedOrder.paymentStatus === "unpaid" && selectedOrder.status !== "cancelled" && (
                      <button onClick={(e) => { e.stopPropagation(); handleTogglePayment(selectedOrder.id, selectedOrder.paymentStatus!); }} className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">Mark Paid</button>
                    )}
                  </div>
                  {selectedOrder.paymentMethod === "cod" && selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                    <p className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-center">⚠️ CALL & CONFIRM CUSTOMER FIRST BEFORE CONFIRMING / DELIVERING</p>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">📝 Note</p>
                  <p className="text-xs text-gray-600 italic">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Status Change */}
              <div className="bg-white rounded-lg border border-gray-100 px-3 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Status</p>
                {selectedOrder.status !== "delivered" && selectedOrder.status !== "cancelled" ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                      disabled={savingId === selectedOrder.id}
                      className="text-xs font-semibold px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30 flex-1"
                    >
                      <option value={selectedOrder.status}>{statusLabel(selectedOrder.status, selectedOrder.orderType)} (current)</option>
                      {getNextStatuses(selectedOrder.status, selectedOrder.orderType).map((s) => (<option key={s} value={s}>{statusLabel(s, selectedOrder.orderType)}</option>))}
                    </select>
                    {savingId === selectedOrder.id && <span className="text-[10px] text-gray-400 animate-pulse">Saving…</span>}
                  </div>
                ) : (
                  <span className="text-xs font-bold text-gray-400 uppercase">{statusLabel(selectedOrder.status, selectedOrder.orderType)} (final)</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-4 flex gap-2 flex-wrap">
              {selectedOrder.status !== "pending" && selectedOrder.paymentStatus !== "unpaid" && (
                <button onClick={() => { setReceiptOrder(selectedOrder); }} className="px-3 py-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">🧾 Receipt</button>
              )}
              {(selectedOrder.orderType === "delivery" || selectedOrder.orderType === "pickup") && selectedOrder.status !== "cancelled" && (
                <button onClick={() => setChatOrderId(selectedOrder.id)} className="px-3 py-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">💬 Chat</button>
              )}
              {(selectedOrder.status === "pending" || selectedOrder.status === "delivered" || selectedOrder.status === "cancelled") && (
                <button onClick={() => setDeleteOrderId(selectedOrder.id)} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">🗑 Delete</button>
              )}
              <button onClick={() => { setSelectedOrderId(null); setSavingId(null); }} className="ml-auto px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Close</button>
            </div>
          </div>
        </>
      )}

      {/* ── Receipt Modal ── */}
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
                <div ref={receiptRef} className="receipt-popup bg-white p-3 text-xs font-mono text-black w-[280px] mx-auto">
                  <div className="text-center mb-3 border-b border-dashed border-black pb-3">
                    {logoUrl && <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    <h1 className="font-bold text-base uppercase">{branchName}</h1>
                    {branchAddr && <p>{branchAddr}</p>}
                    {branchPhone && <p>Tel: {branchPhone}</p>}
                    <p className="mt-1 font-bold">ORDER RECEIPT</p>
                  </div>
                  <div className="mb-3 border-b border-dashed border-black pb-3 text-left">
                    <div className="flex justify-between"><span>Date: {dateStr}</span><span>Time: {timeStr}</span></div>
                    <div className="flex justify-between"><span>Order: #{receiptOrder.id.slice(0, 8).toUpperCase()}</span><span>{OT_LABEL[receiptOrder.orderType]}</span></div>
                    <div className="flex justify-between"><span>Customer:</span><span>{receiptOrder.customerName}</span></div>
                  </div>
                  <div className="mb-3 border-b border-dashed border-black pb-3">
                    <div className="flex justify-between font-bold border-b border-black pb-1 mb-1"><span className="w-1/2">Item</span><span className="w-1/4 text-center">Qty</span><span className="w-1/4 text-right">Price</span></div>
                    {receiptOrder.items.map((item, i) => (<div key={i} className="flex justify-between py-0.5"><span className="w-1/2 truncate">{item.name}</span><span className="w-1/4 text-center">{item.quantity}</span><span className="w-1/4 text-right">₱{(item.price * item.quantity).toFixed(2)}</span></div>))}
                  </div>
                  <div className="mb-3 text-right border-b border-dashed border-black pb-3">
                    <div className="flex justify-between py-0.5"><span>Subtotal:</span><span>₱{receiptOrder.subtotal.toFixed(2)}</span></div>
                    {receiptOrder.deliveryFee > 0 && <div className="flex justify-between py-0.5"><span>Delivery Fee:</span><span>₱{receiptOrder.deliveryFee.toFixed(2)}</span></div>}
                    {receiptOrder.discount > 0 && <div className="flex justify-between py-0.5"><span>Discount:</span><span>-₱{receiptOrder.discount.toFixed(2)}</span></div>}
                    <div className="flex justify-between py-0.5 font-bold text-sm mt-1 border-t border-black pt-1"><span>TOTAL:</span><span>₱{receiptOrder.total.toFixed(2)}</span></div>
                  </div>
                  {receiptOrder.paymentMethod && (<div className="mb-3 border-b border-dashed border-black pb-3"><div className="flex justify-between py-0.5"><span>Payment:</span><span>{PAYMENT_LABEL[receiptOrder.paymentMethod] || receiptOrder.paymentMethod}</span></div></div>)}
                  <div className="text-center text-[10px] border-t border-black pt-3"><p>THANK YOU!</p><p className="mt-1 font-bold">*** COPY ***</p></div>
                </div>
                <div className="flex gap-2 p-4 no-print"><button onClick={() => handlePrint()} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">🖨 Print Receipt</button><button onClick={() => setReceiptOrder(null)} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">Close</button></div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ─── Admin Chat Modal ─── */}
      {chatOrderId && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[80]" onClick={() => setChatOrderId(null)} />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-md h-[80vh] flex flex-col animate-fade-in-scale">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
                <div><h3 className="font-black text-base text-[#0a0a0a]">💬 Order Chat</h3><p className="text-xs text-gray-400 mt-0.5">Order #{chatOrderId.slice(0, 8).toUpperCase()}</p></div>
                <button onClick={() => setChatOrderId(null)} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"><svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <ChatPanel orderId={chatOrderId} isAdmin className="flex-1 min-h-0" />
            </div>
          </div>
        </>
      )}

      <ConfirmModal open={deleteOrderId !== null} title="Delete Order" message={`Permanently delete order #${deleteOrderId?.slice(0, 8).toUpperCase() || ""}? This action cannot be undone.`} confirmLabel="Delete" confirmDanger onConfirm={() => deleteOrderId && handleDeleteOrder(deleteOrderId)} onCancel={() => setDeleteOrderId(null)} />
      <ConfirmModal open={confirmOutForDelivery !== null} title="Out for Delivery" message={`Mark order #${confirmOutForDelivery?.orderId.slice(0, 8).toUpperCase() || ""} as "Out for Delivery"? This action should be confirmed in the driver's app before proceeding.`} confirmLabel="Yes, Out for Delivery" onConfirm={handleConfirmOutForDelivery} onCancel={() => setConfirmOutForDelivery(null)} />
      <ConfirmModal open={confirmDeliver !== null} title="Mark as Delivered" message={`Mark order #${confirmDeliver?.orderId.slice(0, 8).toUpperCase() || ""} as "Delivered"? This will complete the order.`} confirmLabel="Yes, Delivered" onConfirm={handleConfirmDeliver} onCancel={() => setConfirmDeliver(null)} />
      {confirmWithDiscount && (() => {
        const order = orders.find((o) => o.id === confirmWithDiscount.orderId);
        const items = order?.items ?? [];
        let maxPrice = 0; let maxItemName = "";
        for (const it of items) { if (it.price > maxPrice) { maxPrice = it.price; maxItemName = it.name; } }
        const discountAmount = Math.round(maxPrice * 0.2 * 100) / 100;
        const newTotal = Math.round(((order?.subtotal ?? 0) + (order?.deliveryFee ?? 0) - (seniorPwdDiscount ? discountAmount : 0)) * 100) / 100;
        return (
          <>
            <div className="fixed inset-0 bg-black/30 z-[100]" onClick={() => { setConfirmWithDiscount(null); setSeniorPwdDiscount(false); }} />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-sm animate-fade-in-scale">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]"><h3 className="font-black text-base text-[#0a0a0a]">Confirm Order</h3><button onClick={() => { setConfirmWithDiscount(null); setSeniorPwdDiscount(false); }} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"><svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                <div className="px-5 py-4 space-y-4">
                  <p className="text-sm text-[#4b5563] leading-relaxed">Confirm order <span className="font-mono font-bold text-gray-800">#{confirmWithDiscount.orderId.slice(0, 8).toUpperCase()}…</span>?</p>
                  <div className="bg-[#f9fafb] rounded-xl p-3 border border-[#f3f4f6]"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-[#1f2937]">♿ PWD / 👴 Senior Discount (20%)</p><p className="text-xs text-[#6b7280] mt-0.5">{seniorPwdDiscount ? `Deducts ₱${discountAmount.toFixed(2)} from "${maxItemName}" (most expensive item)` : "Toggle to apply 20% off the most expensive item"}</p></div><button type="button" onClick={() => setSeniorPwdDiscount(!seniorPwdDiscount)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${seniorPwdDiscount ? "bg-emerald-500" : "bg-gray-300"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${seniorPwdDiscount ? "translate-x-6" : "translate-x-1"}`} /></button></div></div>
                  {seniorPwdDiscount && (<div className="space-y-1 text-xs text-[#6b7280] bg-emerald-50 rounded-lg p-3 border border-emerald-100"><div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">₱{order?.subtotal}</span></div>{(order?.deliveryFee ?? 0) > 0 && <div className="flex justify-between"><span>Delivery Fee</span><span className="font-semibold">₱{order?.deliveryFee}</span></div>}<div className="flex justify-between text-emerald-600 font-bold"><span>PWD/Senior Discount</span><span>-₱{discountAmount.toFixed(2)}</span></div><div className="flex justify-between border-t border-emerald-200 pt-1 text-sm font-black text-emerald-700"><span>New Total</span><span>₱{newTotal.toFixed(2)}</span></div></div>)}
                </div>
                <div className="border-t border-[#f3f4f6] px-5 py-4 flex gap-3"><button onClick={() => { setConfirmWithDiscount(null); setSeniorPwdDiscount(false); }} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors">Cancel</button><button onClick={handleConfirmWithDiscount} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200" style={{ backgroundColor: "#dc2626" }}>{seniorPwdDiscount ? "Confirm with Discount" : "Confirm (No Discount)"}</button></div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ── Compact clickable order row ──
function OrderRow({ o, selectedOrderId, setSelectedOrderId }: { o: AdminOrder; selectedOrderId: string | null; setSelectedOrderId: (id: string | null) => void }) {

  const s = STATUS_BG[o.status];
  const isCod = o.paymentMethod === "cod";
  const isWalkIn = o.orderType === "dine_in" || o.orderType === "takeout";
  const itemCount = o.items.length;

  const isSelected = selectedOrderId === o.id;

  function relTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }

  return (
    <div
      onClick={() => setSelectedOrderId(o.id)}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? "bg-red-50/50 ring-1 ring-red-200" : ""}`}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-lg ${s.split(" ")[0]} ${s.split(" ")[1]}`}>
            {OT_ICON[o.orderType]}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-gray-400 tracking-wider">#{o.id.slice(0, 8).toUpperCase()}</span>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${SOURCE_BG[SOURCE_FILTER[o.orderType]]}`}>
              {SOURCE_FILTER[o.orderType] === "walk_in" ? "🚶 Walk-in" : "🌐 Online"}
            </span>
            {isCod && (<span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">💵 COD</span>)}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm font-bold text-gray-800 truncate max-w-[180px]">{o.customerName}</p>
            <span className="text-[11px] text-gray-400 flex-shrink-0">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0 flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-[10px] text-gray-400 leading-tight">{relTime(o.placedAt)}</p>
          <p className="text-[10px] text-gray-300 leading-tight">{new Date(o.placedAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm font-black text-red-600">₱{o.total}</p>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${s}`}>
            {isWalkIn && o.status === "delivered" ? "complete" : o.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>
    </div>
  );
}