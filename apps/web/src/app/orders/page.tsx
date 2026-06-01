"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
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
  | "otw"
  | "ready"
  | "completed"
  | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery";

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
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#1e40af", bg: "#dbeafe" },
  preparing: { label: "Preparing", color: "#6b21a8", bg: "#f3e8ff" },
  otw: { label: "On The Way", color: "#c2410c", bg: "#ffedd5" },
  ready: { label: "Ready", color: "#065f46", bg: "#d1fae5" },
  completed: { label: "Completed", color: "#1e3a5f", bg: "#e0f2fe" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2" },
};

const ORDER_TYPE_ICON: Record<OrderType, string> = {
  dine_in: "🍽️",
  takeout: "🛍️",
  delivery: "🛵",
};
const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine In",
  takeout: "Takeout",
  delivery: "Delivery",
};

type FilterTab = "all" | OrderStatus;
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "otw", label: "On The Way" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
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

function OrderCard({ order }: { order: Order }) {
  const statusCfg = STATUS_CONFIG[order.status];
  return (
    <div className="block bg-white rounded-2xl p-5 border border-[#e5e7eb] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
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
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span className="text-xs font-bold text-[#9ca3af] w-7">
              x{item.quantity}
            </span>
            <span className="flex-1 font-semibold text-[#1f2937] truncate">
              {item.name}
            </span>
            <span className="font-bold text-[#374151]">
              ₱{item.price * item.quantity}
            </span>
          </div>
        ))}
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
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { cart } = useCart();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const sb = createClient();
    // Fetch orders for this customer
    const { data: orderRows } = await sb
      .from("orders")
      .select(
        "id, order_type, status, subtotal, delivery_fee, discount, total, placed_at, completed_at"
      )
      .eq("customer_id", user.id)
      .order("placed_at", { ascending: false });

    if (!orderRows) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = orderRows.map((o) => o.id);
    // Fetch items for all orders
    const { data: itemRows } = await sb
      .from("order_items")
      .select("order_id, quantity, unit_price, menu_item:menu_items(name)")
      .in("order_id", orderIds);

    const itemsByOrder = new Map<string, OrderItem[]>();
    if (itemRows) {
      for (const row of itemRows) {
        const arr = itemsByOrder.get(row.order_id) || [];
        arr.push({
          name: (row.menu_item as any)?.name || "Unknown",
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
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
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
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
          <h2 className="text-2xl font-black text-[#0a0a0a] mb-5">
            My Orders
          </h2>
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
              <div
                className="w-10 h-10 border-4 border-[#e5e7eb] rounded-full animate-spin mx-auto"
                style={{ borderTopColor: PRIMARY }}
              />
              <p className="text-sm text-[#9ca3af] mt-4">
                Loading orders…
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-lg font-bold text-[#9ca3af]">
                No orders found
              </p>
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
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pb-16" />

      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        imgErrors={imgErrors}
        onImgError={() => {}}
      />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          backgroundColor: "#dc2626",
          boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4)",
        }}
        aria-label="Open cart"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="#fff"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          />
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