"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useMenu } from "@/lib/menu-context";
import { useCart } from "@/lib/cart-context";
import AppHeader from "@/app/_components/AppHeader";
import CartSidebar from "@/app/_components/CartSidebar";
import ProfileModal from "@/app/_components/ProfileModal";
import PlaceholderImage from "@/app/_components/PlaceholderImage";
import StorageImage from "@/app/_components/StorageImage";

const PRIMARY = "#dc2626";
const AMBER = "#f59e0b";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f-${i}`} className="text-lg" style={{ color: AMBER }}>★</span>
      ))}
      {half && <span className="text-lg" style={{ color: AMBER, opacity: 0.5 }}>★</span>}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e-${i}`} className="text-lg text-[#d1d5db]">★</span>
      ))}
    </div>
  );
}

export default function MenuItemPage() {
  const { id } = useParams<{ id: string }>();
  const { menuItems } = useMenu();
  const { cart, addToCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const item = useMemo(() => menuItems.find((m) => m.id === id), [menuItems, id]);

  if (!item) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col">
        <AppHeader onProfileClick={() => setProfileOpen(true)} onCartToggle={() => setCartOpen(!cartOpen)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-bold text-[#9ca3af]">Item Not Found</p>
            <p className="text-sm text-[#d1d5db] mt-1">This menu item no longer exists.</p>
            <Link href="/menu" className="inline-block mt-5 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-105" style={{ backgroundColor: PRIMARY }}>Browse Menu</Link>
          </div>
        </div>
        <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} imgErrors={new Set()} onImgError={() => {}} />
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    );
  }

  const description = item.description || "A delicious item from Sizzling Hub's kitchen. Made fresh to order with quality ingredients.";
  const rating = item.rating ?? 4.5;
  const stock = item.stock ?? 999;
  const isSoldOut = stock === 0;
  const isLowStock = stock > 0 && stock <= 5;
  const totalPrice = item.price * quantity;

  function handleAddToCart() {
    addToCart(item!);
    for (let i = 1; i < quantity; i++) addToCart(item!);
    if (typeof window !== "undefined") window.history.back();
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <AppHeader onProfileClick={() => setProfileOpen(true)} onCartToggle={() => setCartOpen(!cartOpen)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="relative w-full h-64 sm:h-80 bg-[#f3f4f6] overflow-hidden">
            {imgError ? (
              <PlaceholderImage name={item.name} />
            ) : (
              <StorageImage
                imageBaseName={item.imageName}
                alt={item.name}
                className="w-full h-full object-cover"
                priority
                transform={{ width: 800, quality: 80, format: "webp" }}
                onError={() => setImgError(true)}
              />
            )}
            {isSoldOut && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <p className="text-white text-2xl font-extrabold tracking-widest">Sold Out</p>
              </div>
            )}
            {isLowStock && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-md bg-[#fef2f2] text-[#dc2626] text-xs font-bold">Only {stock} left</span>
            )}
          </div>

          <div className="px-5 py-6 space-y-4 max-w-2xl mx-auto">
            <Link href="/menu" className="inline-flex items-center gap-1 text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Menu
            </Link>

            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-extrabold text-[#1f2937] flex-1">{item.name}</h1>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fef3c7] shrink-0">
                <span className="text-sm" style={{ color: AMBER }}>★</span>
                <span className="text-sm font-extrabold text-[#92400e]">{rating}</span>
              </div>
            </div>

            <Stars rating={rating} />
            <p className="text-2xl font-extrabold" style={{ color: PRIMARY }}>₱{item.price}</p>
            <hr className="border-[#f3f4f6]" />

            <div>
              <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-[#4b5563] leading-relaxed">{description}</p>
            </div>
            <hr className="border-[#f3f4f6]" />

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide">Availability</p>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: isSoldOut ? "#f3f4f6" : isLowStock ? "#fef2f2" : "#ecfdf5", color: isSoldOut ? "#9ca3af" : isLowStock ? "#dc2626" : "#065f46" }}>
                {isSoldOut ? "Out of stock" : `${stock} in stock`}
              </span>
            </div>
            <hr className="border-[#f3f4f6]" />

            <div>
              <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide mb-3">Quantity</p>
              <div className="flex items-center gap-4">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} className="w-10 h-10 rounded-xl bg-[#f3f4f6] flex items-center justify-center text-xl font-bold text-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e5e7eb] transition-colors">−</button>
                <span className="text-xl font-extrabold text-[#1f2937] min-w-[28px] text-center">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(stock, q + 1))} disabled={quantity >= stock || isSoldOut} className="w-10 h-10 rounded-xl bg-[#f3f4f6] flex items-center justify-center text-xl font-bold text-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e5e7eb] transition-colors">+</button>
              </div>
            </div>
            <hr className="border-[#f3f4f6]" />

            <div>
              <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide mb-2">Order Note (optional)</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="e.g., less ice, no onions, extra spicy..." className="w-full px-4 py-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] text-sm font-medium text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all resize-none" rows={3} maxLength={200} />
              <p className="text-xs font-medium text-[#9ca3af] text-right mt-1">{note.length}/200</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-[#f3f4f6] px-5 py-4 flex items-center gap-4 z-20">
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">Total</p>
          <p className="text-2xl font-extrabold" style={{ color: PRIMARY }}>₱{totalPrice}</p>
        </div>
        <button onClick={handleAddToCart} disabled={isSoldOut} className="flex-1 px-6 py-3.5 rounded-2xl text-white text-sm font-extrabold transition-all duration-200 disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] hover:scale-[1.02] active:scale-100"
          style={{ backgroundColor: isSoldOut ? "#e5e7eb" : PRIMARY }}>{isSoldOut ? "Unavailable" : `Add ${quantity} to Cart`}</button>
      </div>

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} imgErrors={new Set([imgError ? item.imageName : ""])} onImgError={() => {}} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      <button onClick={() => setCartOpen(true)} className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#dc2626", boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4)" }}>
        <svg className="w-6 h-6" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
        {cart.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0a] text-white text-xs font-bold flex items-center justify-center border-2 border-white">{cart.length}</span>}
      </button>
    </div>
  );
}