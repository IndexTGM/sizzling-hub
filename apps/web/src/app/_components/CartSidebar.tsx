"use client";

import { useCart } from "@/lib/cart-context";
import { getImagePath } from "@/lib/menu-data";
import PlaceholderImage from "./PlaceholderImage";

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
  const { cart, itemCount, total, updateQty, removeFromCart, placeOrder, loading } = useCart();

  return (
    <>
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

            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f9fafb] animate-fade-in">
                <div className="w-12 h-12 rounded-lg bg-[#f3f4f6] overflow-hidden flex-shrink-0">
                  {imgErrors.has(item.imageName) ? (
                    <PlaceholderImage name={item.name} />
                  ) : (
                    <img
                      src={getImagePath(item.imageName)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={() => onImgError(item.imageName)}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#0a0a0a] truncate">{item.name}</p>
                  <p className="text-xs text-[#6b7280]">₱{item.price}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-7 h-7 rounded-full border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-[#0a0a0a]">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-7 h-7 rounded-full border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-[#9ca3af] hover:text-[#dc2626] transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-[#e5e7eb] px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280] font-medium">Total</span>
              <span className="text-xl font-black" style={{ color: "#dc2626" }}>₱{total}</span>
            </div>
            <button
              disabled={cart.length === 0}
              className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100"
              style={{ backgroundColor: "#dc2626" }}
              onClick={async () => {
                const result = await placeOrder();
                if (result.success) {
                  alert("Order placed successfully!");
                  onClose();
                } else {
                  alert(result.error || "Failed to place order.");
                }
              }}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      )}
    </>
  );
}