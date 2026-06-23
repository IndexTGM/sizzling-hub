"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useBranch } from "@/lib/branch-context";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/app/_components/AppHeader";
import CartSidebar from "@/app/_components/CartSidebar";
import ProfileModal from "@/app/_components/ProfileModal";
import Footer from "@/app/_components/Footer";
import StorageImage from "@/app/_components/StorageImage";
import ChatPanel from "@/app/_components/ChatPanel";

const PRIMARY = "#dc2626";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery" | "pickup";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  note?: string;
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
  paymentMethod: string | null;
  paymentStatus: string | null;
  branchId: string | null;
  branchName: string | null;
}

const PAYMENT_ICON_MAP: Record<string, string> = { gcash: "📱 GCash", cod: "💵 Cash on Delivery" };

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#1e40af", bg: "#dbeafe" },
  preparing: { label: "Preparing", color: "#6b21a8", bg: "#f3e8ff" },
  ready: { label: "Ready for Pickup", color: "#059669", bg: "#d1fae5" },
  out_for_delivery: { label: "Out for Delivery", color: "#c2410c", bg: "#ffedd5" },
  delivered: { label: "Delivered", color: "#1e3a5f", bg: "#e0f2fe" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2" },
};

const ORDER_TYPE_ICON: Record<OrderType, string> = { dine_in: "🍽️", takeout: "🛍️", delivery: "🛵", pickup: "🛍️" };
const ORDER_TYPE_LABEL: Record<OrderType, string> = { dine_in: "Dine In", takeout: "Takeout", delivery: "Delivery", pickup: "Pickup" };

const DELIVERY_STEPS = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "🛵" },
  { key: "delivered", label: "Delivered", icon: "🏠" },
];
const PICKUP_STEPS = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "ready", label: "Ready for Pickup", icon: "📦" },
  { key: "delivered", label: "Picked Up", icon: "✅" },
];
const STEP_ORDER_DELIVERY = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"];
const STEP_ORDER_PICKUP = ["placed", "confirmed", "preparing", "ready", "delivered"];

function getStepIndex(status: OrderStatus, orderType?: OrderType): number {
  if (status === "cancelled") return -1;
  const key = status === "pending" ? "placed" : status;
  const steps = orderType === "pickup" ? STEP_ORDER_PICKUP : STEP_ORDER_DELIVERY;
  return steps.indexOf(key);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${mins} ${ampm}`;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { branch } = useBranch();
  const { cart } = useCart();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const receiptRef = useRef<HTMLDivElement>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [gcashQrOpen, setGcashQrOpen] = useState(false);
  const [fullscreenQr, setFullscreenQr] = useState(false);
  const hasLoadedRef = useRef(false);

  const fetchOrder = useCallback(async (silent = false) => {
    if (!id || !user) { setLoading(false); return; }
    if (!hasLoadedRef.current) setLoading(true);
    const sb = createClient();
    const { data: row } = await sb.from("orders").select("id, order_type, status, subtotal, delivery_fee, discount, total, notes, placed_at, completed_at, payment_method, payment_status, branch_id, branches(name)").eq("id", id).eq("customer_id", user.id).maybeSingle();
    if (!row) { setOrder(null); setLoading(false); return; }
    const { data: items } = await sb.from("order_items").select("quantity, unit_price, menu_item, note").eq("order_id", id);
    setOrder({
      id: row.id, orderType: row.order_type as OrderType, status: row.status as OrderStatus,
      subtotal: row.subtotal, deliveryFee: row.delivery_fee, discount: row.discount, total: row.total,
      notes: row.notes,
      items: (items || []).map((it: any) => ({ name: it.menu_item || "Unknown", quantity: it.quantity, price: it.unit_price, note: it.note ?? "" })),
      placedAt: row.placed_at, completedAt: row.completed_at,
      paymentMethod: row.payment_method, paymentStatus: row.payment_status,
      branchId: row.branch_id ?? null,
      branchName: (row.branches as any)?.name || null,
    });
    setLoading(false);
    hasLoadedRef.current = true;
  }, [id, user]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => fetchOrder(true), 1000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const isCancelled = order?.status === "cancelled";
  const isFinal = order?.status === "delivered" || order?.status === "cancelled";
  const isProcessing = order && !isFinal;
  const isPickup = order?.orderType === "pickup";
  const isOnline = order?.orderType === "delivery" || order?.orderType === "pickup";
  const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const stepIdx = order ? getStepIndex(order.status, order.orderType) : -1;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <style jsx global>{`@media print { body * { visibility: hidden; } #receipt-container, #receipt-container * { visibility: visible; } #receipt-container { position: absolute; left: 0; top: 0; width: auto; max-width: auto; padding: 2mm; margin: 0; box-sizing: border-box; overflow: hidden; max-height: none !important; font-family: monospace; font-size: 11px; line-height: 1.3; color: #000 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } #receipt-container * { color: #000 !important; background: transparent !important; border-color: #000 !important; } .no-print { display: none !important; } @page { margin: 0; size: auto auto; } html, body { margin: 0 !important; padding: 0 !important; } }`}</style>

      <div className="no-print">
        <AppHeader onProfileClick={() => setProfileOpen(true)} onCartToggle={() => setCartOpen(!cartOpen)} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-20 sm:pb-0 space-y-4">
          <div className="no-print">
            <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
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
              <Link href="/orders" className="inline-block mt-5 px-6 py-2.5 rounded-xl text-white text-sm font-bold" style={{ backgroundColor: PRIMARY }}>Back to Orders</Link>
            </div>
          ) : (
            <>
              {/* Receipt */}
              <div ref={receiptRef} id="receipt-container" className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
                <div className="h-2 receipt-red-bar" style={{ backgroundColor: PRIMARY }} />
                <div className="p-5">
                  <div className="text-center mb-4">
                    {order.branchId && supabaseUrl && (
                      <img
                        src={`${supabaseUrl}/storage/v1/object/public/images/${order.branchId}/logo.png`}
                        alt="Branch Logo"
                        className="w-16 h-16 mx-auto object-contain mb-2 rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <h2 className="text-xl font-black" style={{ color: PRIMARY }}>{order.branchName || "SIZZLING HUB"}</h2>
                    <p className="text-xs text-[#9ca3af] font-mono mt-0.5">Order Receipt</p>
                  </div>
                  <div className="border-t border-b border-dashed border-[#e5e7eb] py-3 space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Order #</span><span className="font-mono font-bold text-[#0a0a0a]">{order.id.slice(0, 8).toUpperCase()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Type</span><span className="font-semibold text-[#0a0a0a]">{ORDER_TYPE_ICON[order.orderType]} {ORDER_TYPE_LABEL[order.orderType]}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Status</span><span className="inline-block px-2 py-0.5 rounded-full text-xs font-extrabold" style={{ backgroundColor: STATUS_CONFIG[order.status].bg, color: STATUS_CONFIG[order.status].color }}>{STATUS_CONFIG[order.status].label}</span></div>
                    {order.paymentMethod && <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Payment</span><span className="font-semibold text-[#0a0a0a]">{PAYMENT_ICON_MAP[order.paymentMethod] || order.paymentMethod}{order.paymentStatus && <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${order.paymentStatus === "paid" ? "text-emerald-600 bg-emerald-50" : order.paymentStatus === "failed" ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"}`}>{order.paymentStatus}</span>}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Placed</span><span className="font-semibold text-[#0a0a0a]">{formatDateTime(order.placedAt)}</span></div>
                    {order.completedAt && <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Completed</span><span className="font-semibold text-[#0a0a0a]">{formatDateTime(order.completedAt)}</span></div>}
                    {order.notes && <div className="flex justify-between text-sm"><span className="text-[#6b7280] font-medium">Notes</span><span className="font-semibold text-[#0a0a0a] italic" style={{ maxWidth: "60%", textAlign: "right", overflowWrap: "break-word" }}>{order.notes}</span></div>}
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
                    <div className="flex justify-between"><span className="text-[#6b7280]">Subtotal</span><span className="font-semibold text-[#1f2937]">₱{order.subtotal}</span></div>
                    {order.deliveryFee > 0 && <div className="flex justify-between"><span className="text-[#6b7280]">Delivery Fee</span><span className="font-semibold text-[#1f2937]">₱{order.deliveryFee}</span></div>}
                    {order.discount > 0 && <div className="flex justify-between text-[#10b981]"><span>Discount</span><span className="font-semibold">-₱{order.discount}</span></div>}
                    <div className="flex justify-between border-t border-[#e5e7eb] pt-2 mt-1"><span className="text-base font-extrabold text-[#0a0a0a]">Total</span><span className="text-lg font-extrabold" style={{ color: PRIMARY }}>₱{order.total}</span></div>
                  </div>
                  <div className="text-center mt-4 pt-3 border-t border-dashed border-[#e5e7eb]">
                    <p className="text-xs text-[#9ca3af]">Thank you for your order!</p>
                    <p className="text-xs text-[#d1d5db] mt-0.5">Receipt • {formatDateTime(order.placedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Processing Indicator */}
              {isProcessing && (() => {
                const statusStyles: Record<string, { accent: string; accentBg: string; accentBorder: string; icon: string; title: string }> = {
                  pending: { accent: "#b45309", accentBg: "#fef3c7", accentBorder: "#fde68a", icon: "⏳", title: "Order Received" },
                  confirmed: { accent: "#1d4ed8", accentBg: "#dbeafe", accentBorder: "#bfdbfe", icon: "✅", title: "Order Confirmed" },
                  preparing: { accent: "#7c3aed", accentBg: "#ede9fe", accentBorder: "#ddd6fe", icon: "👨‍🍳", title: "Preparing Your Order" },
                  out_for_delivery: { accent: "#ea580c", accentBg: "#ffedd5", accentBorder: "#fed7aa", icon: "🛵", title: "Out for Delivery" },
                  ready: { accent: "#059669", accentBg: "#d1fae5", accentBorder: "#a7f3d0", icon: "📦", title: "Ready for Pickup" },
                };
                const s = statusStyles[order!.status] ?? statusStyles.pending;
                return (
                  <div className="bg-white rounded-2xl p-5 border no-print flex items-center gap-4 animate-fade-in-scale" style={{ borderColor: s.accentBorder, backgroundColor: s.accentBg }}>
                    <div className="flex-shrink-0 relative">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${s.accent}15` }}><span className="text-2xl">{s.icon}</span></div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full animate-ping" style={{ backgroundColor: s.accent }} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: s.accent }}>{s.title}</p>
                      <p className="text-xs mt-0.5 opacity-70" style={{ color: s.accent }}>
                        {order!.status === "pending" && "Hang tight — the restaurant will confirm your order soon."}
                        {order!.status === "confirmed" && "The kitchen is getting ready to prepare your food."}
                        {order!.status === "preparing" && "Our chefs are cooking your meal with care."}
                        {order!.status === "out_for_delivery" && "Your order is on the way. Almost there!"}
                        {order!.status === "ready" && "Your order is ready! Come pick it up at the counter."}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Progress Tracker */}
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
                          {!isLast && <div className="absolute top-[34px] w-0.5 h-[40px]" style={{ backgroundColor: isCompleted ? PRIMARY : "#e5e7eb" }} />}
                          {idx !== 0 && <div className="absolute top-0 w-0.5 h-[9px]" style={{ backgroundColor: isCompleted ? PRIMARY : "#e5e7eb" }} />}
                          <div className="w-7 h-7 rounded-full flex items-center justify-center z-10 text-xs border-2" style={{ backgroundColor: isCompleted ? PRIMARY : isActive ? "#fef2f2" : "#f3f4f6", borderColor: isActive && !isCompleted ? PRIMARY : "transparent" }}>
                            {isCompleted ? <span className="text-white font-extrabold text-xs">✓</span> : <span className="text-xs">{step.icon}</span>}
                          </div>
                        </div>
                        <div className="flex-1 pl-3 pb-3">
                          <p className="text-sm" style={{ color: isActive ? "#1f2937" : isCompleted ? "#6b7280" : "#9ca3af", fontWeight: isActive ? 800 : 600 }}>{step.label}</p>
                          {isActive && <p className="text-xs font-semibold mt-0.5" style={{ color: PRIMARY }}>Current step</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* GCash QR button for unpaid GCash orders */}
              {order && order.paymentMethod === "gcash" && order.paymentStatus !== "paid" && !isCancelled && (
                <div className="no-print">
                  <button
                    onClick={() => setGcashQrOpen(true)}
                    className="w-full py-3 rounded-xl bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 mb-3"
                  >
                    <span>📱</span> View GCash QR Code
                  </button>
                </div>
              )}

              {/* Chat button for online orders */}
              {order && isOnline && (
                <div className="no-print">
                  <button
                    onClick={() => setChatOrderId(order.id)}
                    className="w-full py-3 rounded-xl bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>💬</span> Chat with {order.branchName || "Branch"}
                  </button>
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

      {/* GCash QR Modal */}
      {gcashQrOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[75]" onClick={() => setGcashQrOpen(false)} />
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-sm animate-fade-in-scale">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
                <h3 className="font-black text-base text-[#0a0a0a]">GCash Payment</h3>
                <button onClick={() => setGcashQrOpen(false)} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-5 py-5 space-y-5">
                <div className="text-center space-y-2">
                  <p className="text-2xl font-black" style={{ color: "#dc2626" }}>₱{order?.total}</p>
                  <p className="text-xs text-gray-500">Scan the QR code below with your GCash app to pay.</p>
                </div>
                <div
                  className="flex items-center justify-center p-4 bg-[#f9fafb] rounded-xl border border-[#e5e7eb] cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setFullscreenQr(true)}
                  title="Click to enlarge QR code"
                >
                  <StorageImage imageBaseName="gcash_qr" alt="GCash QR Code" className="w-48 h-48 object-contain" branchId="global" />
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-xs text-blue-700 font-semibold mb-1">📋 How to pay:</p>
                  <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                    <li>Open your GCash app</li>
                    <li>Tap "Scan" and scan the QR code</li>
                    <li>Enter the amount: <strong>₱{order?.total}</strong></li>
                    <li>Complete the payment and <strong>send the proof in the chat</strong></li>
                  </ol>
                </div>
                <button onClick={() => setGcashQrOpen(false)} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen QR Image Viewer */}
      {!!fullscreenQr && (
        <div className="fixed inset-0 bg-black/80 z-[85] flex items-center justify-center p-4 cursor-pointer" onClick={() => setFullscreenQr(false)}>
          <button onClick={(e) => { e.stopPropagation(); setFullscreenQr(false); }} className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors">✕</button>
          <StorageImage imageBaseName="gcash_qr" alt="GCash QR Code" className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-xl shadow-2xl" branchId="global" />
        </div>
      )}

      {/* Chat Modal */}
      {chatOrderId && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[70]" onClick={() => setChatOrderId(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-md h-[80vh] flex flex-col animate-fade-in-scale">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
                <div>
                  <h3 className="font-black text-base text-[#0a0a0a]">💬 Order Chat</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Order #{chatOrderId.slice(0, 8).toUpperCase()}</p>
                </div>
                <button onClick={() => setChatOrderId(null)} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <ChatPanel orderId={chatOrderId} className="flex-1 min-h-0" branchName={branch?.name ?? undefined} />
            </div>
          </div>
        </>
      )}

      <div className="no-print"><Footer /></div>
      <div className="no-print">
        <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} imgErrors={imgErrors} onImgError={() => {}} />
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
        <button onClick={() => setCartOpen(true)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95" style={{ backgroundColor: "#dc2626", boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4)" }} aria-label="Open cart">
          <svg className="w-6 h-6" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
          {cart.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0a] text-white text-xs font-bold flex items-center justify-center border-2 border-white">{cart.length}</span>}
        </button>
      </div>
    </div>
  );
}