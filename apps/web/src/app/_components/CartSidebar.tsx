"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/app/_components/Toast";
import { createClient } from "@/lib/supabase/client";
import PlaceholderImage from "./PlaceholderImage";
import StorageImage from "./StorageImage";
import AddressModal from "./AddressModal";

type OrderMethod = "delivery" | "pickup";

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  zip: string | null;
  is_default: boolean;
}

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
  const { cart, itemCount, total, updateQty, removeFromCart, placeOrder } = useCart();
  const { showToast } = useToast();
  const [placing, setPlacing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orderMethod, setOrderMethod] = useState<OrderMethod>("delivery");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Fetch default address when delivery is selected
  useEffect(() => {
    if (!user || orderMethod !== "delivery") {
      setDefaultAddress(null);
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
      if (data) setDefaultAddress(data as SavedAddress);
      else setDefaultAddress(null);
      setAddressLoading(false);
    })();
  }, [user, orderMethod, addressModalOpen]); // re-fetch when modal closes

  async function handleConfirmOrder() {
    setConfirmOpen(false);
    setPlacing(true);
    const result = await placeOrder(orderMethod, defaultAddress);
    setPlacing(false);
    if (result.success) {
      showToast("Order placed successfully! We're preparing your food now. 🍳", "success");
      onClose();
    } else {
      showToast(result.error || "Failed to place order.", "error");
    }
  }

  const hasDeliveryAddress = orderMethod === "delivery" && defaultAddress !== null;
  const needsAddress = orderMethod === "delivery" && !addressLoading && defaultAddress === null;

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
            <h3 className="font-black text-lg text-[#0a0a0a]">
              Your Order ({itemCount})
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"
            >
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
                    {imgErrors.has(item.imageName) ? (
                      <PlaceholderImage name={item.name} />
                    ) : (
                      <StorageImage
                        imageBaseName={item.imageName}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={() => onImgError(item.imageName)}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#0a0a0a] truncate">{item.name}</p>
                    <p className="text-xs text-[#6b7280]">₱{item.price}</p>
                    {note && <p className="text-xs text-[#9ca3af] italic mt-0.5 truncate">"{note}"</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, note, -1)}
                      className="w-7 h-7 rounded-full border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
                    >−</button>
                    <span className="w-5 text-center text-sm font-bold text-[#0a0a0a]">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, note, 1)}
                      className="w-7 h-7 rounded-full border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
                    >+</button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id, note)}
                    className="text-[#9ca3af] hover:text-[#dc2626] transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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
              <button
                onClick={() => setOrderMethod("delivery")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  orderMethod === "delivery"
                    ? "text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
                style={orderMethod === "delivery" ? { backgroundColor: "#dc2626" } : undefined}
              >
                🛵 Delivery
              </button>
              <button
                onClick={() => setOrderMethod("pickup")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  orderMethod === "pickup"
                    ? "text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
                style={orderMethod === "pickup" ? { backgroundColor: "#dc2626" } : undefined}
              >
                🛍️ Pickup
              </button>
            </div>

            {/* Address warning for delivery */}
            {needsAddress && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <p className="text-xs font-semibold text-red-700">⚠️ No delivery address set</p>
                <p className="text-xs text-red-500">Please add your delivery address to place a delivery order.</p>
                <button
                  onClick={() => setAddressModalOpen(true)}
                  className="w-full py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  Set Delivery Address
                </button>
              </div>
            )}

            {hasDeliveryAddress && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 mb-1">📍 Delivering to:</p>
                <p className="text-xs text-emerald-600 font-medium">{defaultAddress.street}</p>
                <p className="text-xs text-emerald-500">{defaultAddress.city}, {defaultAddress.province}</p>
                <button
                  onClick={() => setAddressModalOpen(true)}
                  className="mt-2 text-xs font-semibold text-emerald-700 underline hover:no-underline"
                >
                  Change Address
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280] font-medium">Total</span>
              <span className="text-xl font-black" style={{ color: "#dc2626" }}>₱{total}</span>
            </div>
            <button
              disabled={cart.length === 0 || placing || needsAddress}
              className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100"
              style={{ backgroundColor: "#dc2626" }}
              onClick={() => setConfirmOpen(true)}
            >
              {placing ? "Placing Order…" : "Place Order"}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      )}

      {/* ─── Custom Confirm Order Modal ─── */}
      {confirmOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setConfirmOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl w-full max-w-sm max-h-[85vh] overflow-y-auto animate-fade-in-scale">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
                <h3 className="font-black text-base text-[#0a0a0a]">Confirm Your Order</h3>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="#6b7280" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Order method badge */}
              <div className="px-5 pt-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  orderMethod === "delivery" ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                }`}>
                  {orderMethod === "delivery" ? "🛵 Delivery" : "🛍️ Pickup"}
                </span>
              </div>

              {/* Delivery address */}
              {orderMethod === "delivery" && defaultAddress && (
                <div className="px-5 pt-2">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 mb-1">📍 Delivery Address</p>
                    <p className="text-sm font-semibold text-gray-800">{defaultAddress.street}</p>
                    <p className="text-xs text-gray-500">{defaultAddress.city}, {defaultAddress.province}{defaultAddress.zip ? ` ${defaultAddress.zip}` : ""}</p>
                  </div>
                </div>
              )}

              {/* Items list */}
              <div className="px-5 py-4 space-y-1.5 max-h-[50vh] overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#9ca3af] w-6 text-right">{item.quantity}x</span>
                        <span className="text-sm font-semibold text-[#1f2937] truncate">{item.name}</span>
                      </div>
                      {item.note && (
                        <p className="text-xs text-[#9ca3af] italic ml-8 mt-0.5">"{item.note}"</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-[#374151] flex-shrink-0">₱{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-[#f3f4f6] px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-[#0a0a0a]">Total</span>
                  <span className="text-xl font-black" style={{ color: "#dc2626" }}>₱{total}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="border-t border-[#f3f4f6] px-5 py-4 flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOrder}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all duration-200"
                  style={{ backgroundColor: "#dc2626" }}
                >
                  Place Order
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Address Modal */}
      <AddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        userId={user?.id || ""}
      />
    </>
  );
}