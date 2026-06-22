"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useMenu } from "@/lib/menu-context";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/app/_components/AppHeader";
import CartSidebar from "@/app/_components/CartSidebar";
import ProfileModal from "@/app/_components/ProfileModal";
import Footer from "@/app/_components/Footer";

const PRIMARY = "#dc2626";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery" | "pickup";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  items: OrderItem[];
  placedAt: string;
  completedAt?: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
}

const PAYMENT_ICON_MAP: Record<string, string> = {
  gcash: "📱 GCash",
  cod: "💵 Cash on Delivery",
};
const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid", color: "#059669", bg: "#d1fae5" },
  unpaid: { label: "Unpaid", color: "#92400e", bg: "#fef3c7" },
  failed: { label: "Failed", color: "#991b1b", bg: "#fee2e2" },
  refunded: { label: "Refunded", color: "#4b5563", bg: "#f3f4f6" },
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#1e40af", bg: "#dbeafe" },
  preparing: { label: "Preparing", color: "#6b21a8", bg: "#f3e8ff" },
  out_for_delivery: { label: "Out for Delivery", color: "#c2410c", bg: "#ffedd5" },
  delivered: { label: "Delivered", color: "#1e3a5f", bg: "#e0f2fe" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2" },
};

const ORDER_TYPE_ICON: Record<OrderType, string> = {
  dine_in: "🍽️",
  takeout: "🛍️",
  delivery: "🛵",
  pickup: "🛍️",
};
const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine In",
  takeout: "Takeout",
  delivery: "Delivery",
  pickup: "Pickup",
};

type FilterTab = "all" | OrderStatus;
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function OrderCard({ order, onCancel, cancelLoading }: { order: Order; onCancel: (id: string) => void; cancelLoading: boolean }) {
  const statusCfg = STATUS_CONFIG[order.status];
  const canCancel = order.status === "pending";

  return (
    <Link href={`/orders/${order.id}`} className="block bg-white rounded-2xl p-5 border border-[#e5e7eb] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-extrabold text-[#374151] tracking-wide">
            {order.id.slice(0, 8).toUpperCase()}…
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm">
              {ORDER_TYPE_ICON[order.orderType]}
            </span>
            <span className="text-xs font-semibold text-[#6b7280]">
              {ORDER_TYPE_LABEL[order.orderType]}
            </span>
          </div>
        </div>
        <span
          className="inline-block px-3 py-1 rounded-lg text-xs font-extrabold tracking-wide"
          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
      </div>
      <div className="border-t border-[#f3f4f6] pt-3 space-y-1.5 mb-3">
        {order.items.map((item, idx) => {
          const itemNote = (item as any).note ?? "";
          return (
          <div key={idx}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-bold text-[#9ca3af] w-7">x{item.quantity}</span>
              <span className="flex-1 font-semibold text-[#1f2937] truncate">{item.name}</span>
              <span className="font-bold text-[#374151]">₱{item.price * item.quantity}</span>
            </div>
            {itemNote && <p className="text-xs text-gray-400 italic ml-9 mt-0.5">"{itemNote}"</p>}
          </div>
        );
        })}
      </div>
      <div className="flex items-end justify-between border-t border-[#f3f4f6] pt-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#9ca3af]">
            {formatDate(order.placedAt)}
          </p>
          {order.completedAt && (
            <p className="text-xs text-[#9ca3af]">
              Completed {formatDate(order.completedAt)}
            </p>
          )}
        </div>
        <div className="text-right">
          {order.discount > 0 && (
            <p className="text-xs font-semibold text-[#10b981]">
              -₱{order.discount}
            </p>
          )}
          <p className="text-xl font-black" style={{ color: PRIMARY }}>
            ₱{order.total}
          </p>
        </div>
      </div>
      {/* Payment info */}
      {order.paymentMethod && (
        <div className="border-t border-[#f3f4f6] pt-2 mt-2 flex items-center gap-2 text-xs">
          <span className="font-semibold text-gray-600">{PAYMENT_ICON_MAP[order.paymentMethod] || order.paymentMethod}</span>
          {order.paymentStatus && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: PAYMENT_STATUS_MAP[order.paymentStatus]?.bg, color: PAYMENT_STATUS_MAP[order.paymentStatus]?.color }}>
              {PAYMENT_STATUS_MAP[order.paymentStatus]?.label || order.paymentStatus}
            </span>
          )}
        </div>
      )}
      {/* Cancel button — only for pending orders */}
      {canCancel && (
        <div className="mt-3 pt-3 border-t border-[#f3f4f6]">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(order.id); }}
            disabled={cancelLoading}
            className="w-full py-2 rounded-lg bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {cancelLoading ? "Cancelling…" : "Cancel Order"}
          </button>
        </div>
      )}
    </Link>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart } = useCart();
  const { refreshMenu } = useMenu();
  const router = useRouter();

  // Redirect to home (login) if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  async function handleCancelOrder(orderId: string) {
    if (!confirm("Cancel this order?")) return;
    setCancelLoading(true);
    const sb = createClient();

    // Check current status first — reject if no longer pending
    const { data: current } = await sb.from("orders").select("status").eq("id", orderId).single();
    if (!current || current.status !== "pending") {
      setCancelLoading(false);
      alert("This order can no longer be cancelled. It has already been processed by the restaurant.");
      await fetchOrders();
      return;
    }

    // Note: restore_stock skipped — order_items.menu_item is text, no FK to menu_items
    // If cancelling a paid online order, refund via PayMongo
    const { data: order } = await sb.from("orders").select("payment_status, payment_method").eq("id", orderId).maybeSingle();
    if (order?.payment_status === "paid" && order?.payment_method !== "cod") {
      try {
        await fetch("/api/paymongo/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
      } catch { /* best-effort */ }
    }

    await sb.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    refreshMenu().catch(() => { /* best-effort */ });
    setCancelLoading(false);
    await fetchOrders();
  }

  const fetchOrders = useCallback(async (silent = false) => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (!hasLoadedRef.current) setLoading(true);
    const sb = createClient();
    const { data: orderRows } = await sb
      .from("orders")
      .select(
        "id, order_type, status, subtotal, delivery_fee, discount, total, placed_at, completed_at, payment_method, payment_status"
      )
      .eq("customer_id", user.id)
      .order("placed_at", { ascending: false });

    if (!orderRows) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = orderRows.map((o) => o.id);
    const { data: itemRows } = await sb
      .from("order_items")
      .select("order_id, quantity, unit_price, menu_item")
      .in("order_id", orderIds);

    const itemsByOrder = new Map<string, OrderItem[]>();
    if (itemRows) {
      for (const row of itemRows) {
        const arr = itemsByOrder.get(row.order_id) || [];
        arr.push({
          name: row.menu_item || "Unknown",
          quantity: row.quantity,
          price: row.unit_price,
        });
        itemsByOrder.set(row.order_id, arr);
      }
    }

    setOrders(
      orderRows.map((o) => ({
        id: o.id,
        orderType: o.order_type as OrderType,
        status: o.status as OrderStatus,
        subtotal: o.subtotal,
        deliveryFee: o.delivery_fee,
        discount: o.discount,
        total: o.total,
        items: itemsByOrder.get(o.id) || [],
        placedAt: o.placed_at,
        completedAt: o.completed_at ?? undefined,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
      }))
    );
    setLoading(false);
    hasLoadedRef.current = true;
  }, [user]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 1000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <AppHeader
        onProfileClick={() => setProfileOpen(true)}
        onCartToggle={() => setCartOpen(!cartOpen)}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-20 sm:pb-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-2xl font-black text-[#0a0a0a]">
              My Orders
            </h2>
            <button onClick={() => fetchOrders()} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeFilter === tab.key
                    ? "text-white"
                    : "text-[#6b7280] bg-white border border-[#e5e7eb] hover:border-[#dc2626] hover:text-[#dc2626]"
                }`}
                style={
                  activeFilter === tab.key
                    ? { backgroundColor: PRIMARY }
                    : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-[#e5e7eb] rounded-full animate-spin mx-auto" style={{ borderTopColor: PRIMARY }} />
              <p className="text-sm text-[#9ca3af] mt-4">Loading orders…</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-lg font-bold text-[#9ca3af]">No orders found</p>
              <p className="text-sm text-[#d1d5db] mt-1">
                {activeFilter === "all"
                  ? "You haven't placed any orders yet."
                  : `No ${activeFilter} orders.`}
              </p>
              <Link
                href="/menu"
                className="inline-block mt-5 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: PRIMARY }}
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} onCancel={handleCancelOrder} cancelLoading={cancelLoading} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pb-16" />

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} imgErrors={imgErrors} onImgError={() => {}} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#dc2626", boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4)" }}
        aria-label="Open cart"
      >
        <svg className="w-6 h-6" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0a] text-white text-xs font-bold flex items-center justify-center border-2 border-white">
            {cart.length}
          </span>
        )}
      </button>
      <Footer />
    </div>
  );
}