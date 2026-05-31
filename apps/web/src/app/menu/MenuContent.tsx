"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useMenu } from "@/lib/menu-context";
import { useCart } from "@/lib/cart-context";
import { getImagePath, type MenuItem } from "@/lib/menu-data";
import AppHeader from "@/app/_components/AppHeader";
import CartSidebar from "@/app/_components/CartSidebar";
import ProfileModal from "@/app/_components/ProfileModal";
import PlaceholderImage from "@/app/_components/PlaceholderImage";

const PRIMARY = "#dc2626";
const AMBER = "#f59e0b";

type CategoryFilter = { key: string; label: string };

const CATEGORIES: CategoryFilter[] = [
  { key: "all", label: "All" },
  { key: "Silog", label: "Silog" },
  { key: "Drinks", label: "Drinks" },
  { key: "Add-ons", label: "Add-ons" },
];

export default function MenuContent() {
  const { user } = useAuth();
  const { menuItems, categories, loading: menuLoading } = useMenu();
  const { cart, addToCart } = useCart();

  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get("category") || "all");
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  function onImgError(name: string) {
    setImgErrors((prev) => new Set(prev).add(name));
  }

  const displayCategories: CategoryFilter[] = useMemo(() => {
    if (categories.length > 0) {
      return [
        { key: "all", label: "All" },
        ...categories.map((c) => ({ key: c.name, label: c.name })),
      ];
    }
    return CATEGORIES;
  }, [categories]);

  const filteredItems = useMemo(
    () =>
      activeCategory === "all"
        ? menuItems
        : menuItems.filter((item) => item.category === activeCategory),
    [menuItems, activeCategory]
  );

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <AppHeader
        onProfileClick={() => setProfileOpen(true)}
        onCartToggle={() => setCartOpen(!cartOpen)}
        activePage="menu"
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
          <h2 className="text-2xl font-black text-[#0a0a0a] mb-4">Menu</h2>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {displayCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat.key
                    ? "text-white"
                    : "text-[#6b7280] bg-white border border-[#e5e7eb] hover:border-[#dc2626] hover:text-[#dc2626]"
                }`}
                style={activeCategory === cat.key ? { backgroundColor: PRIMARY } : undefined}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          {menuLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <div className="w-full h-40 bg-[#f3f4f6] animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#f3f4f6] rounded w-3/4 animate-pulse" />
                    <div className="h-5 bg-[#f3f4f6] rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#9ca3af] text-sm">No items in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item, i) => (
                <Link
                  key={item.id}
                  href={`/menu/${item.id}`}
                  className="block bg-white rounded-xl border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="w-full h-40 bg-[#f3f4f6] relative overflow-hidden">
                    {imgErrors.has(item.imageName) ? (
                      <PlaceholderImage name={item.name} />
                    ) : (
                      <img
                        src={getImagePath(item.imageName)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => onImgError(item.imageName)}
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#0a0a0a] text-base">{item.name}</h3>
                    <p className="text-[#6b7280] text-sm">{item.category}</p>
                    <div className="flex items-center gap-1.5 mt-1 mb-3">
                      <span className="text-xs" style={{ color: AMBER }}>★</span>
                      <span className="text-xs font-bold text-[#92400e]">
                        {(3.9 + (item.name.length * 0.07 + item.price * 0.002) % 1.1).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black" style={{ color: PRIMARY }}>₱{item.price}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(item); }}
                        className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} imgErrors={imgErrors} onImgError={onImgError} />
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
    </div>
  );
}