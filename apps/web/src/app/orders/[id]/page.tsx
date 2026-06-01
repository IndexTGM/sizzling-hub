"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
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
  notes: string | null;
  items: OrderItem[];
  placedAt: string;
  completedAt: string | null;
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

/* ─── Progress tracker steps ─── */
const DINE_IN_STEPS = [
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
  { key: "otw", label: "On The Way", icon: "🛵" },
  { key: "completed", label: "Delivered", icon: "🏠" },
];

const STEP_ORDER = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "otw",
  "completed",
];

function getStepIndex(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  const key = status === "pending" ? "placed" : status;
  return STEP_ORDER.indexOf(key);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${mins} ${ampm}`;
}

function handlePrint() {
  window.print();
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { cart } = useCart();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const sb = createClient();

    const { data: row } = await sb
      .from("orders")
      .select(
        "id, order_type, status, subtotal, delivery_fee, discount, total, notes, placed_at, completed_at"
      )
      .eq("id", id)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (!row) {
      setOrder(null);
      setLoading(false);
      return;
    }

    const { data: items } = await sb
      .from("order_items")
      .select("quantity, unit_price, menu_item:menu_items(name)")
      .eq("order_id", id);

    setOrder({
      id: row.id,
      orderType: row.order_type as OrderType,
      status: row.status as OrderStatus,
      subtotal: row.subtotal,
      deliveryFee: row.delivery_fee,
      discount: row.discount,
      total: row.total,
      notes: row.notes,
      items: (items || []).map((it: any) => ({
        name: it.menu_item?.name || "Unknown",
        quantity: it.quantity,
        price: it.unit_price,
      })),
      placedAt: row.placed_at,
      completedAt: row.completed_at,
    });
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const isCancelled = order?.status === "cancelled";
  const isDelivery = order?.orderType === "delivery";
  const steps = isDelivery ? DELIVERY_STEPS : DINE_IN_STEPS;
  const stepIdx = order ? getStepIndex(order.status) : -1;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-container,
          #receipt-container * {
            visibility: visible;
          }
          #receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 10mm;
            size: auto;
          }
        }
      `}</style>

      <div className="no-print">
        <AppHeader
          onProfileClick={() => setProfileOpen(true)}
          onCartToggle={() => setCartOpen(!cartOpen)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-20 sm:pb-0 space-y-4">
          <div className="no-print">
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors mb-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Orders
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-24">
              <div className="w-10 h-10 border-4 border-[#e5e7eb] rounded-full animate-spin mx-auto" style={{ borderTopColor: PRIMARY }} />
              <p className="text-sm text-[#9ca3af] mt-4">Loading receipt…</p>
            </div>
          ) : !order ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-lg font-bold text-[#9ca3af]">Order Not Found</p>
              <Link href="/orders" className="inline-block mt-5 px-6 py-2.5 rounded-xl text-white text-sm font-bold" style={{ backgroundColor: PRIMARY }}>
                Back to Orders
              </Link>
            </div>
          ) : (
            <>
              {/* Print Button */}
              <div className="flex justify-end no-print">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105 flex items-center gap-2"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Receipt
                </button>
              </div>

              {/* ─── Receipt ─── */}
              <div ref={receiptRef} id="receipt-container" className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
                <div className="h-2" style={{ backgroundColor: PRIMARY }} />
                <div className="p-5">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-black" style={{ color: PRIMARY }}>BEN'S TAPSIHAN</h2>
                    <p className="text-xs text-[#9ca3af] font-mono mt-0.5">Order Receipt</p>
                  </div>

                  <div className="border-t border-b border-dashed border-[#e5e7eb] py-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280] font-medium">Order #</span>
                      <span className="font-mono font-bold text-[#0a0a0a]">{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280] font-medium">Type</span>
                      <span className="font-semibold text-[#0a0a0a]">{ORDER_TYPE_ICON[order.orderType]} {ORDER_TYPE_LABEL[order.orderType]}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280] font-medium">Status</span>
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-extrabold" style={{ backgroundColor: STATUS_CONFIG[order.status].bg, color: STATUS_CONFIG[order.status].color }}>
                        {STATUS_CONFIG[order.status].label}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280] font-medium">Placed</span>
                      <span className="font-semibold text-[#0a0a0a]">{formatDateTime(order.placedAt)}</span>
                    </div>
                    {order.completedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6b7280] font-medium">Completed</span>
                        <span className="font-semibold text-[#0a0a0a]">{formatDateTime(order.completedAt)}</span>
                      </div>
                    )}
                    {order.notes && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6b7280] font-medium">Notes</span>
                        <span className="font-semibold text-[#0a0a0a] italic max-w-[60%] text-right">{order.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="py-3 space-y-2">
                    <p className="text-xs font-bold text-[#6b7280] uppercase tracking-wider">Items</p>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#9ca3af] w-7">x{item.quantity}</span>
                          <span className="font-semibold text-[#1f2937]">{item.name}</span>
                        </div>
                        <span className="font-bold text-[#374151]">₱{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-[#e5e7eb] pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6b7280]">Subtotal</span>
                      <span className="font-semibold text-[#1f2937]">₱{order.subtotal}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#6b7280]">Delivery Fee</span>
                        <span className="font-semibold text-[#1f2937]">₱{order.deliveryFee}</span>
                      </div>
                    )}
                    {order.discount > 0 && (
                      <div className="flex justify-between text-[#10b981]">
                        <span>Discount</span>
                        <span className="font-semibold">-₱{order.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#e5e7eb] pt-2 mt-1">
                      <span className="text-base font-extrabold text-[#0a0a0a]">Total</span>
                      <span className="text-lg font-extrabold" style={{ color: PRIMARY }}>₱{order.total}</span>
                    </div>
                  </div>

                  <div className="text-center mt-4 pt-3 border-t border-dashed border-[#e5e7eb]">
                    <p className="text-xs text-[#9ca3af]">Thank you for your order!</p>
                    <p className="text-xs text-[#d1d5db] mt-0.5">Receipt • {formatDateTime(order.placedAt)}</p>
                  </div>
                </div>
              </div>

              {/* ─── Progress Tracker ─── */}
              {!isCancelled && (
                <div className="bg-white rounded-2xl p-5 border border-[#e5e7eb] no-print">
                  <h3 className="text-sm font-extrabold text-[#1f2937] mb-4">Order Progress</h3>
                  {steps.map((step, idx) => {
                    const isCompleted = idx <= stepIdx;
                    const isActive = idx === stepIdx;
                    const isLast = idx === steps.length - 1;
                    return (
                      <div key={step.key} className="flex items-start min-h-[52px]">
                        <div className="w-9 flex flex-col items-center relative">
                          {!isLast && (
                            <div className="absolute top-[34px] w-0.5 h-[40px]" style={{ backgroundColor: isCompleted ? PRIMARY : "#e5e7eb" }} />
                          )}
                          {idx !== 0 && (
                            <div className="absolute top-0 w-0.5 h-[9px]" style={{ backgroundColor: isCompleted ? PRIMARY : "#e5e7eb" }} />
                          )}
                          <div className="w-7 h-7 rounded-full flex items-center justify-center z-10 text-xs border-2" style={{
                            backgroundColor: isCompleted ? PRIMARY : isActive ? "#fef2f2" : "#f3f4f6",
                            borderColor: isActive && !isCompleted ? PRIMARY : "transparent",
                          }}>
                            {isCompleted ? <span className="text-white font-extrabold text-xs">✓</span> : <span className="text-xs">{step.icon}</span>}
                          </div>
                        </div>
                        <div className="flex-1 pl-3 pb-3">
                          <p className="text-sm" style={{ color: isActive ? "#1f2937" : isCompleted ? "#6b7280" : "#9ca3af", fontWeight: isActive ? 800 : 600 }}>
                            {step.label}
                          </p>
                          {isActive && <p className="text-xs font-semibold mt-0.5" style={{ color: PRIMARY }}>Current step</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cancelled message */}
              {isCancelled && (
                <div className="bg-white rounded-2xl p-5 border border-[#fee2e2] text-center no-print">
                  <p className="text-lg font-extrabold text-[#991b1b]">This order was cancelled</p>
                  <p className="text-sm text-[#6b7280] mt-1">If you have questions, please contact us.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="no-print">
        <Footer />
      </div>

      <div className="no-print">
        <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} imgErrors={imgErrors} onImgError={() => {}} />
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

        <button onClick={() => setCartOpen(true)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ backgroundColor: "#dc2626", boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4)" }} aria-label="Open cart">
          <svg className="w-6 h-6" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0a] text-white text-xs font-bold flex items-center justify-center border-2 border-white">
              {cart.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}