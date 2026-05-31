"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import AppHeader from "@/app/_components/AppHeader";
import CartSidebar from "@/app/_components/CartSidebar";
import ProfileModal from "@/app/_components/ProfileModal";

const PRIMARY = "#dc2626";
const GREEN = "#10b981";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery";

interface OrderItem { name: string; quantity: number; price: number; }

interface Order {
  id: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentMethod: "cash" | "gcash" | "card";
  paymentStatus: "unpaid" | "paid";
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  items: OrderItem[];
  placedAt: string;
  completedAt?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  pending: { color: "#92400e", bg: "#fef3c7" },
  confirmed: { color: "#1e40af", bg: "#dbeafe" },
  preparing: { color: "#6b21a8", bg: "#f3e8ff" },
  ready: { color: "#065f46", bg: "#d1fae5" },
  completed: { color: "#1e3a5f", bg: "#e0f2fe" },
  cancelled: { color: "#991b1b", bg: "#fee2e2" },
};

const ORDER_TYPE_ICON: Record<OrderType, string> = { dine_in: "🍽️", takeout: "🛍️", delivery: "🛵" };
const ORDER_TYPE_LABEL: Record<OrderType, string> = { dine_in: "Dine In", takeout: "Takeout", delivery: "Delivery" };

const STEPS = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "ready", label: "Ready", icon: "📦" },
  { key: "completed", label: "Completed", icon: "✨" },
];

const DELIVERY_STEPS = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "ready", label: "Ready", icon: "📦" },
  { key: "driver_assigned", label: "Driver Assigned", icon: "🛵" },
  { key: "on_the_way", label: "On the Way", icon: "📍" },
  { key: "completed", label: "Delivered", icon: "🏠" },
];

const STATUS_INDEX: Record<string, number> = { placed: 0, pending: 0, confirmed: 1, preparing: 2, ready: 3, driver_assigned: 4, on_the_way: 5, completed: 6 };

const MOCK_ORDERS: Order[] = [
  { id: "ORD-1001", orderType: "dine_in", status: "completed", paymentMethod: "cash", paymentStatus: "paid", subtotal: 245, deliveryFee: 0, discount: 0, total: 245, items: [{ name: "Sisilog", quantity: 1, price: 129 }, { name: "Iced Tea", quantity: 2, price: 58 }], placedAt: "2026-05-25T14:30:00Z", completedAt: "2026-05-25T14:55:00Z" },
  { id: "ORD-1002", orderType: "delivery", status: "preparing", paymentMethod: "gcash", paymentStatus: "paid", subtotal: 440, deliveryFee: 50, discount: 20, total: 470, items: [{ name: "Tapsilog", quantity: 2, price: 119 }, { name: "Bangsilog", quantity: 1, price: 139 }, { name: "Mango Shake", quantity: 1, price: 63 }], placedAt: "2026-05-25T15:10:00Z" },
  { id: "ORD-1003", orderType: "takeout", status: "pending", paymentMethod: "cash", paymentStatus: "unpaid", subtotal: 258, deliveryFee: 0, discount: 0, total: 258, items: [{ name: "Adobosilog", quantity: 1, price: 139 }, { name: "Chicksilog", quantity: 1, price: 119 }], placedAt: "2026-05-25T15:45:00Z" },
  { id: "ORD-1004", orderType: "delivery", status: "ready", paymentMethod: "card", paymentStatus: "paid", subtotal: 376, deliveryFee: 50, discount: 0, total: 426, items: [{ name: "Sisilog", quantity: 2, price: 129 }, { name: "Porksilog", quantity: 1, price: 118 }], placedAt: "2026-05-24T18:20:00Z" },
  { id: "ORD-1005", orderType: "dine_in", status: "cancelled", paymentMethod: "cash", paymentStatus: "unpaid", subtotal: 129, deliveryFee: 0, discount: 0, total: 129, items: [{ name: "Sisilog", quantity: 1, price: 129 }], placedAt: "2026-05-24T12:00:00Z" },
  { id: "ORD-1006", orderType: "takeout", status: "confirmed", paymentMethod: "gcash", paymentStatus: "paid", subtotal: 237, deliveryFee: 0, discount: 0, total: 237, items: [{ name: "Tapsilog", quantity: 1, price: 119 }, { name: "Iced Tea", quantity: 1, price: 58 }, { name: "Extra Rice", quantity: 2, price: 30 }], placedAt: "2026-05-24T19:05:00Z" },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${mins} ${ampm}`;
}

function getETA(status: OrderStatus): string {
  switch (status) {
    case "pending": return "~20-30 mins";
    case "confirmed": return "~15-25 mins";
    case "preparing": return "~10-15 mins";
    case "ready": return "Almost ready!";
    case "completed": return "Delivered";
    default: return "";
  }
}

function getStepKey(status: OrderStatus, orderType: OrderType): string {
  if (status === "cancelled" || status === "pending") return "placed";
  if (orderType === "delivery" && (status === "ready" || status === "completed")) {
    if (status === "completed") return "completed";
    return "on_the_way";
  }
  return status;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { cart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors] = useState<Set<string>>(new Set());

  const order = useMemo(() => MOCK_ORDERS.find((o) => o.id === id), [id]);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col">
        <AppHeader onProfileClick={() => setProfileOpen(true)} onCartToggle={() => setCartOpen(!cartOpen)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-bold text-[#9ca3af]">Order Not Found</p>
            <Link href="/orders" className="inline-block mt-5 px-6 py-2.5 rounded-xl text-white text-sm font-bold" style={{ backgroundColor: PRIMARY }}>Back to Orders</Link>
          </div>
        </div>
        <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} imgErrors={imgErrors} onImgError={() => {}} />
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    );
  }

  const isDelivery = order.orderType === "delivery";
  const isCancelled = order.status === "cancelled";
  const steps = isDelivery ? DELIVERY_STEPS : STEPS;
  const currentStepKey = getStepKey(order.status, order.orderType);
  const currentStepIdx = STATUS_INDEX[currentStepKey] ?? 0;
  const statusCfg = STATUS_CONFIG[order.status];

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <AppHeader onProfileClick={() => setProfileOpen(true)} onCartToggle={() => setCartOpen(!cartOpen)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-20 sm:pb-0 space-y-4">
          <div className="mb-2">
            <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Orders
            </Link>
            <div>
              <h2 className="text-2xl font-black text-[#0a0a0a]">{order.id}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span>{ORDER_TYPE_ICON[order.orderType]}</span>
                <span className="text-sm font-semibold text-[#6b7280]">{ORDER_TYPE_LABEL[order.orderType]}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e7eb] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">{isCancelled ? "Order Status" : "Estimated Delivery"}</p>
              <p className={`text-xl font-extrabold mt-0.5 ${isCancelled ? "text-[#991b1b]" : "text-[#1f2937]"}`}>{isCancelled ? "This order was cancelled" : getETA(order.status)}</p>
            </div>
            <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wide" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e7eb]">
            <h3 className="text-sm font-extrabold text-[#1f2937] mb-4">Order Progress</h3>
            <div>
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx && !isCancelled;
                const isActive = idx === currentStepIdx && !isCancelled;
                const isLast = idx === steps.length - 1;
                return (
                  <div key={step.key} className="flex items-start min-h-[52px]">
                    <div className="w-9 flex flex-col items-center relative">
                      {!isLast && <div className="absolute top-[34px] w-0.5 h-[40px]" style={{ backgroundColor: isCompleted ? PRIMARY : "#e5e7eb" }} />}
                      {idx !== 0 && <div className="absolute top-0 w-0.5 h-[9px]" style={{ backgroundColor: isCompleted ? PRIMARY : "#e5e7eb" }} />}
                      <div className="w-7 h-7 rounded-full flex items-center justify-center z-10 text-xs border-2" style={{ backgroundColor: isCompleted ? PRIMARY : isActive ? "#fef2f2" : "#f3f4f6", borderColor: isActive && !isCompleted ? PRIMARY : "transparent" }}>
                        {isCompleted ? <span className="text-white font-extrabold text-xs">✓</span> : <span className="text-xs">{step.icon}</span>}
                      </div>
                    </div>
                    <div className="flex-1 pl-3 pb-3">
                      <p className="text-sm" style={{ color: isActive ? "#1f2937" : isCompleted ? "#6b7280" : "#9ca3af", fontWeight: isActive ? 800 : 600 }}>{step.label}</p>
                      {isActive && !isCancelled && <p className="text-xs font-semibold mt-0.5" style={{ color: PRIMARY }}>Current step</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e7eb]">
            <h3 className="text-sm font-extrabold text-[#1f2937] mb-3">Order Items</h3>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2"><span className="text-sm font-bold text-[#9ca3af] w-7">x{item.quantity}</span><span className="text-sm font-semibold text-[#1f2937]">{item.name}</span></div>
                  <span className="text-sm font-bold text-[#374151]">₱{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e7eb]">
            <h3 className="text-sm font-extrabold text-[#1f2937] mb-3">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Subtotal</span><span className="font-semibold text-[#1f2937]">₱{order.subtotal}</span></div>
              {order.deliveryFee > 0 && <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Delivery Fee</span><span className="font-semibold text-[#1f2937]">₱{order.deliveryFee}</span></div>}
              {order.discount > 0 && <div className="flex justify-between text-sm"><span className="text-[#10b981] font-medium">Discount</span><span className="font-semibold text-[#10b981]">-₱{order.discount}</span></div>}
              <div className="border-t border-[#f3f4f6] pt-2 mt-2 flex justify-between"><span className="text-base font-extrabold text-[#1f2937]">Total</span><span className="text-lg font-extrabold" style={{ color: PRIMARY }}>₱{order.total}</span></div>
              <div className="flex items-center gap-2 pt-2 mt-2 border-t border-[#f3f4f6]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: order.paymentStatus === "paid" ? GREEN : "#9ca3af" }} />
                <span className="text-xs font-semibold text-[#6b7280]">{order.paymentStatus === "paid" ? "Paid" : "Unpaid"} via {order.paymentMethod === "cash" ? "Cash" : order.paymentMethod === "gcash" ? "GCash" : "Card"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#e5e7eb] space-y-2">
            <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Placed</span><span className="font-semibold text-[#1f2937]">{formatDateTime(order.placedAt)}</span></div>
            {order.completedAt && <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Completed</span><span className="font-semibold text-[#1f2937]">{formatDateTime(order.completedAt)}</span></div>}
          </div>
        </div>
      </div>

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} imgErrors={imgErrors} onImgError={() => {}} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      <button onClick={() => setCartOpen(true)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#dc2626", boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4)" }}>
        <svg className="w-6 h-6" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
        {cart.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0a] text-white text-xs font-bold flex items-center justify-center border-2 border-white">{cart.length}</span>}
      </button>
    </div>
  );
}