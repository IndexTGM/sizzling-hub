"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBranch } from "@/lib/branch-context";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/app/_components/Toast";
import { createClient } from "@/lib/supabase/client";
import { haversineDistance } from "@/lib/store-config";
import PlaceholderImage from "./PlaceholderImage";
import StorageImage from "./StorageImage";
import AddressModal from "./AddressModal";

type OrderMethod = "delivery" | "pickup";
type PaymentMethod = "gcash" | null;

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  zip: string | null;
  is_default: boolean;
}

const PAYMENT_OPTIONS: { value: NonNullable<PaymentMethod>; label: string; icon: string }[] = [
  { value: "gcash", label: "GCash", icon: "📱" },
];

export default function CartSidebar({
  open,
  onClose,
  imgErrors,
  onImgError,
}: {
  open: boolean;
  onClose: () => void;
  imgErrors: Set<string>;
  onImgError: (name: string) => void;
}) {
  const { user } = useAuth();
  const { branchLocation, branchId } = useBranch();
  const { cart, itemCount, total, updateQty, removeFromCart, placeOrder } = useCart();
  const { showToast } = useToast();
  const [placing, setPlacing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orderMethod, setOrderMethod] = useState<OrderMethod>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressDistance, setAddressDistance] = useState<number | null>(null);
  const [withinRange, setWithinRange] = useState(true);

  // Fetch default address when delivery is selected
  useEffect(() => {
    if (!user || orderMethod !== "delivery") {
      setDefaultAddress(null);
      setAddressDistance(null);
      setWithinRange(true);
      return;
    }
    (async () => {
      setAddressLoading(true);
      const sb = createClient();
      const { data } = await sb
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();
      if (data) {
        setDefaultAddress(data as SavedAddress);
        const addrLat = (data as any).lat as number | undefined;
        const addrLng = (data as any).lng as number | undefined;
        if (addrLat && addrLng) {
          const dist = haversineDistance(branchLocation.lat, branchLocation.lng, addrLat, addrLng);
          setAddressDistance(dist);
          setWithinRange(dist <= branchLocation.deliveryRadiusKm);
        } else {
          setAddressDistance(null);
          setWithinRange(true);
        }
      } else {
        setDefaultAddress(null);
        setAddressDistance(null);
        setWithinRange(true);
      }
      setAddressLoading(false);
    })();
  }, [user, orderMethod, addressModalOpen, branchLocation]);

  const hasDeliveryAddress = orderMethod === "delivery" && defaultAddress !== null;
  const needsAddress = orderMethod === "delivery" && !addressLoading && defaultAddress === null;
  const outOfRange = orderMethod === "delivery" && hasDeliveryAddress && !withinRange;

  // Opening hours check: Mon-Sat 11:00 AM - 11:00 PM
  const isWithinOpeningHours = (() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (day === 0) return false; // Closed Sundays
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    return timeInMinutes >= 11 * 60 && timeInMinutes < 23 * 60; // 11:00 AM to 11:00 PM
  })();

  const isAdmin = user?.role === "admin" || user?.role === "dev";
  const blockedByHours = !isWithinOpeningHours && !isAdmin;
  const showHoursWarning = !isWithinOpeningHours;
  const needsPhone = user?.role !== "admin" && user?.role !== "dev" && !user?.phone;

  async function handleConfirmOrder() {
    if (!user) return;
    setConfirmOpen(false);

    // If a payment method is selected, create PayMongo source and redirect
    if (paymentMethod) {
      setPlacing(true);
      try {
        const origin = window.location.origin;
        const res = await fetch("/api/paymongo/create-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            type: paymentMethod,
            successUrl: `${origin}/payment/success`,
            failedUrl: `${origin}/payment/failed`,
            billing: user
              ? { name: `${user.first_name} ${user.last_name}`, email: user.email || "", phone: user?.phone || "" }
              : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "Failed to initiate payment.", "error");
          setPlacing(false);
          return;
        }

        // Don't create the order yet — store cart + payment info in sessionStorage.
        // The success page will create the order only after payment is confirmed.
        const addrWithCoords = defaultAddress
          ? { ...defaultAddress, addressLat: (defaultAddress as any).lat, addressLng: (defaultAddress as any).lng }
          : null;

        sessionStorage.setItem(
          "paymongo_payment",
          JSON.stringify({
            sourceId: data.sourceId,
            orderType: orderMethod,
            address: addrWithCoords,
            paymentMethod,
          }),
        );

        onClose();
        // Redirect to GCash checkout
        window.location.href = data.checkoutUrl;
      } catch (err: any) {
        showToast(err?.message || "Payment failed.", "error");
        setPlacing(false);
      }
      return;
    }

    // No payment method — COD / pay later
    setPlacing(true);
    const addrWithCoords = defaultAddress
      ? { ...defaultAddress, addressLat: (defaultAddress as any).lat, addressLng: (defaultAddress as any).lng }
      : null;
    const result = await placeOrder(orderMethod, addrWithCoords, null);
    setPlacing(false);
    if (result.success) {
      showToast("Order placed successfully! We're preparing your food now. 🍳", "success");
      onClose();
    } else {
      showToast(result.error || "Failed to place order.", "error");
    }
  }

  return (
    <>
      {/* Cart Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:max-w-sm bg-white border-l border-[#e5e7eb] shadow-xl z-50 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
            <h3 className="font-black text-lg text-[#0a0a0a]">Your Order ({itemCount})</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {cart.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#9ca3af] text-sm">Your cart is empty.</p>
                <p className="text-[#d1d5db] text-xs mt-1">Add items from the menu to get started.</p>
              </div>
            )}

            {cart.map((item) => {
              const note = item.note ?? "";
              return (
              <div key={`${item.id}-${note}`} className="p-3 rounded-xl bg-[#f9fafb] animate-fade-in space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#f3f4f6] overflow-hidden flex-shrink-0">
                    {imgErrors.has(item.imageName) ? <PlaceholderImage name={item.name} /> : <StorageImage imageBaseName={item.imageName} alt={item.name} className="w-full h-full object-cover" branchId={branchId} onError={() => onImgError(item.imageName)} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#0a0a0a] truncate">{item.name}</p>
                    <p className="text-xs text-[#6b7280]">₱{item.price}</p>
                    {note && <p className="text-xs text-[#9ca3af] italic mt-0.5 truncate">"{note}"</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, note, -1)} className="w-7 h-7 rounded-full border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-[#6b7280] hover:bg-[#f3f4f6] transition-colors">−</button>
                    <span className="w-5 text-center text-sm font-bold text-[#0a0a0a]">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, note, 1)} className="w-7 h-7 rounded-full border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-[#6b7280] hover:bg-[#f3f4f6] transition-colors">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id, note)} className="text-[#9ca3af] hover:text-[#dc2626] transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-[#e5e7eb] px-5 py-4 space-y-3">
            {/* Pickup / Delivery toggle */}
            <div className="flex gap-2">
              <button onClick={() => setOrderMethod("delivery")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${orderMethod === "delivery" ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`} style={orderMethod === "delivery" ? { backgroundColor: "#dc2626" } : undefined}>🛵 Delivery</button>
              <button onClick={() => setOrderMethod("pickup")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${orderMethod === "pickup" ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`} style={orderMethod === "pickup" ? { backgroundColor: "#dc2626" } : undefined}>🛍️ Pickup</button>
            </div>

            {/* Opening Hours Warning */}
            {showHoursWarning && (
              <div className={`p-3 rounded-xl border text-sm ${isAdmin ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                <p className="text-xs font-bold">
                  {isAdmin ? "⚠️ Outside Operating Hours" : "⛔ Outside Operating Hours"}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  Operating hours are Monday – Saturday, 11:00 AM – 11:00 PM.
                </p>
                {isAdmin ? (
                  <p className="text-xs mt-0.5 opacity-70">You can still place this order as an admin.</p>
                ) : (
                  <p className="text-xs mt-0.5 opacity-70">Orders can only be placed during operating hours.</p>
                )}
              </div>
            )}

            {/* Address warning for delivery — no address */}
            {needsAddress && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <p className="text-xs font-semibold text-red-700">⚠️ No delivery address set</p>
                <p className="text-xs text-red-500">Please add your delivery address to place a delivery order.</p>
                <button onClick={() => setAddressModalOpen(true)} className="w-full py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors">Set Delivery Address</button>
              </div>
            )}

            {/* Address info — has address, within range */}
            {hasDeliveryAddress && withinRange && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 mb-1">📍 Delivering to:</p>
                <p className="text-xs text-emerald-600 font-medium">{defaultAddress.street}</p>
                <p className="text-xs text-emerald-500">
                  {defaultAddress.city}, {defaultAddress.province}
                  {addressDistance !== null && <span> • {addressDistance.toFixed(1)} km away</span>}{" "}
                  <span className="text-emerald-400">(max {branchLocation.deliveryRadiusKm} km)</span>
                </p>
                <button onClick={() => setAddressModalOpen(true)} className="mt-2 text-xs font-semibold text-emerald-700 underline hover:no-underline">Change Address</button>
              </div>
            )}

            {/* Address info — has address, outside range */}
            {outOfRange && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <p className="text-xs font-semibold text-red-700">⚠️ Outside Delivery Zone</p>
                <p className="text-xs text-red-500">
                  This address is {addressDistance?.toFixed(1)} km away — our delivery range is {branchLocation.deliveryRadiusKm} km.
                </p>
                <p className="text-xs text-red-400">Please choose a closer address or switch to pickup.</p>
                <button onClick={() => setAddressModalOpen(true)} className="w-full py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors">Change Address</button>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPaymentMethod(paymentMethod === opt.value ? null : opt.value)}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                      paymentMethod === opt.value
                        ? "border-[#dc2626] bg-red-50 text-red-600"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span className="block text-lg mb-0.5">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
              {paymentMethod && (
                <p className="text-xs text-gray-400">
                  You'll be redirected to {PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.label} to complete payment.
                </p>
              )}
              {/* COD — available for both delivery and pickup */}
              <button
                onClick={() => setPaymentMethod(null)}
                className={`w-full py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  paymentMethod === null
                    ? "border-[#dc2626] bg-red-50 text-red-600"
                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                }`}
              >
                💵 Cash on Delivery
              </button>
            </div>

            {/* Phone Number Warning — non-admins must add phone before ordering */}
            {needsPhone && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <p className="text-xs font-semibold text-amber-700">📞 Phone Number Required</p>
                <p className="text-xs text-amber-500">
                  Please add your phone number so the driver can contact you during delivery. You can add it in your profile.
                </p>
                <button onClick={onClose} className="w-full py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors">
                  Add Phone Number in Profile
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280] font-medium">Total</span>
              <span className="text-xl font-black" style={{ color: "#dc2626" }}>₱{total}</span>
            </div>
            <button
              disabled={cart.length === 0 || placing || needsAddress || outOfRange || blockedByHours || needsPhone}
              className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100"
              style={{ backgroundColor: "#dc2626" }}
              onClick={() => setConfirmOpen(true)}
            >
              {placing ? "Placing Order…" : paymentMethod ? `Pay with ${PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.label}` : "Place Order"}
            </button>
          </div>
        </div>
      </div>

      {open && <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />}

      {/* ─── Custom Confirm Order Modal ─── */}
      {confirmOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setConfirmOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-sm max-h-[85vh] overflow-y-auto animate-fade-in-scale">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
                <h3 className="font-black text-base text-[#0a0a0a]">Confirm Your Order</h3>
                <button onClick={() => setConfirmOpen(false)} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-5 pt-3 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${orderMethod === "delivery" ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {orderMethod === "delivery" ? "🛵 Delivery" : "🛍️ Pickup"}
                </span>
                {paymentMethod && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600">
                    {PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.icon} {PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.label}
                  </span>
                )}
              </div>
              {orderMethod === "delivery" && defaultAddress && (
                <div className="px-5 pt-2">
                  <div className={`p-3 rounded-xl border ${withinRange ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"}`}>
                    <p className="text-xs font-semibold text-gray-400 mb-1">📍 Delivery Address</p>
                    <p className="text-sm font-semibold text-gray-800">{defaultAddress.street}</p>
                    <p className="text-xs text-gray-500">
                      {defaultAddress.city}, {defaultAddress.province}{defaultAddress.zip ? ` ${defaultAddress.zip}` : ""}
                      {addressDistance !== null && <span> • {addressDistance.toFixed(1)} km</span>}
                    </p>
                  </div>
                </div>
              )}
              {paymentMethod && (
                <div className="px-5 pt-2">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium">
                      You'll be redirected to {PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.label} to pay ₱{total}.
                    </p>
                  </div>
                </div>
              )}
              <div className="px-5 py-4 space-y-1.5 max-h-[50vh] overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#9ca3af] w-6 text-right">{item.quantity}x</span>
                        <span className="text-sm font-semibold text-[#1f2937] truncate">{item.name}</span>
                      </div>
                      {item.note && <p className="text-xs text-[#9ca3af] italic ml-8 mt-0.5">"{item.note}"</p>}
                    </div>
                    <span className="text-sm font-bold text-[#374151] flex-shrink-0">₱{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#f3f4f6] px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-[#0a0a0a]">Total</span>
                  <span className="text-xl font-black" style={{ color: "#dc2626" }}>₱{total}</span>
                </div>
              </div>
              <div className="border-t border-[#f3f4f6] px-5 py-4 flex gap-3">
                <button onClick={() => setConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleConfirmOrder} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all duration-200" style={{ backgroundColor: "#dc2626" }}>Place Order</button>
              </div>
            </div>
          </div>
        </>
      )}

      <AddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        userId={user?.id || ""}
        branchLat={branchLocation.lat}
        branchLng={branchLocation.lng}
        branchRadiusKm={branchLocation.deliveryRadiusKm}
      />
    </>
  );
}