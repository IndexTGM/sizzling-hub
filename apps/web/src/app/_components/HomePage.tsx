"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useMenu } from "@/lib/menu-context";
import { useCart } from "@/lib/cart-context";
import { getImagePath, type MenuItem } from "@/lib/menu-data";
import AppHeader from "./AppHeader";
import CartSidebar from "./CartSidebar";
import ProfileModal from "./ProfileModal";
import PlaceholderImage from "./PlaceholderImage";

const PRIMARY = "#dc2626";
const AMBER = "#f59e0b";

/* ───────────────────────────────────────────────
   Banner Data
   ─────────────────────────────────────────────── */
interface Banner {
  id: string;
  type: "featured" | "discount" | "announcement";
  title: string;
  subtitle: string;
  image: string;
  tag?: string;
  color: string;
  accentColor: string;
}

const BANNERS: Banner[] = [
  {
    id: "1",
    type: "featured",
    title: "Sisilog",
    subtitle: "Our #1 Best Seller — sizzling pork sisig on garlic rice with a runny egg",
    image: "sisilog",
    tag: "BEST SELLER",
    color: "#fef2f2",
    accentColor: PRIMARY,
  },
  {
    id: "2",
    type: "discount",
    title: "20% OFF",
    subtitle: "On all Silog meals every Monday! Start your week right.",
    image: "tapsilog",
    tag: "MONDAY MADNESS",
    color: "#fffbeb",
    accentColor: AMBER,
  },
  {
    id: "3",
    type: "discount",
    title: "Buy 1 Get 1",
    subtitle: "Iced Tea — every Friday from 2PM to 5PM. Stay refreshed!",
    image: "icedtea",
    tag: "HAPPY HOUR",
    color: "#eff6ff",
    accentColor: "#3b82f6",
  },
];

/* ───────────────────────────────────────────────
   Most Ordered Names
   ─────────────────────────────────────────────── */
const MOST_ORDERED_NAMES = [
  "Tapsilog",
  "Sisilog",
  "Bangsilog",
  "Adobosilog",
  "Chiksilog",
  "Mango Shake",
];

/* ───────────────────────────────────────────────
   Banner Carousel
   ─────────────────────────────────────────────── */
function BannerCarousel({
  banners,
  onOrderNow,
}: {
  banners: Banner[];
  onOrderNow: () => void;
}) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    trackRef.current?.scrollTo({ left: idx * (trackRef.current?.clientWidth ?? 0), behavior: "smooth" });
  }, []);

  useEffect(() => {
    autoRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % banners.length;
        trackRef.current?.scrollTo({
          left: next * (trackRef.current?.clientWidth ?? 0),
          behavior: "smooth",
        });
        return next;
      });
    }, 4000);
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [banners.length]);

  const onScroll = () => {
    if (!trackRef.current) return;
    const idx = Math.round(trackRef.current.scrollLeft / trackRef.current.clientWidth);
    setActive(idx);
  };

  return (
    <div className="pt-5 pb-2 w-full overflow-hidden">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {banners.map((b) => (
          <div
            key={b.id}
            className="w-full flex-shrink-0 snap-center"
            style={{ scrollSnapAlign: "center" }}
          >
            <div className="px-4">
              <div
                className="relative flex flex-col sm:flex-row items-center rounded-2xl p-6 sm:p-8 gap-5 sm:gap-6 shadow-md border border-white/50 overflow-hidden"
                style={{
                  backgroundColor: b.accentColor,
                  backgroundImage: `linear-gradient(135deg, ${b.accentColor} 0%, ${b.accentColor}dd 100%)`,
                }}
              >
                {/* Subtle pattern over the banner background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle at 20% 80%, #ffffff40 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <div className="flex-1 space-y-3 text-center sm:text-left relative z-10">
                  {b.tag && (
                    <span className="inline-block px-3 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs font-extrabold tracking-widest uppercase border border-white/20">
                      {b.tag}
                    </span>
                  )}
                  <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                    {b.title}
                  </h3>
                  <p className="text-sm sm:text-base text-white/80 font-medium max-w-md leading-relaxed">
                    {b.subtitle}
                  </p>
                  <button
                    onClick={onOrderNow}
                    className="px-6 py-3 rounded-xl bg-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                    style={{ color: b.accentColor }}
                  >
                    Order Now →
                  </button>
                </div>
                <div className="relative z-10">
                  <div className="absolute inset-0 rounded-2xl bg-white/20 blur-md" />
                  <img
                    src={getImagePath(`${b.image}.jpg`)}
                    alt={b.title}
                    className="relative w-28 h-28 sm:w-40 sm:h-40 object-cover rounded-2xl shadow-lg ring-2 ring-white/30"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder.png"; }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "w-8 h-2.5 bg-[#dc2626]"
                : "w-2.5 h-2.5 bg-[#d1d5db] hover:bg-[#9ca3af]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Category Cards
   ─────────────────────────────────────────────── */
function CategoryCards() {
  const cats = [
    { icon: "🍽️", label: "All", href: "/menu" },
    { icon: "🍳", label: "Silog", href: "/menu?category=Silog" },
    { icon: "🥤", label: "Drinks", href: "/menu?category=Drinks" },
    { icon: "🍚", label: "Add-ons", href: "/menu?category=Add-ons" },
  ];

  return (
    <div className="py-2 px-4 max-w-6xl mx-auto">
      <h2 className="text-lg font-extrabold text-[#1f2937] mb-3">Categories</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cats.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className="flex flex-col items-center gap-2 bg-white rounded-2xl py-5 shadow-sm border border-[#f3f4f6] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center text-xl">
              {cat.icon}
            </div>
            <span className="text-xs font-bold text-[#374151]">{cat.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Menu Item Card
   ─────────────────────────────────────────────── */
function MenuItemCard({
  item,
  onAdd,
  imgErrors,
  onImgError,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  imgErrors: Set<string>;
  onImgError: (name: string) => void;
}) {
  return (
    <Link
      href={`/menu/${item.id}`}
      className="block bg-white rounded-xl border border-[#e5e7eb] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group animate-fade-in"
    >
      <div className="w-full h-36 bg-[#f3f4f6] relative overflow-hidden">
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
      <div className="p-3">
        <h4 className="font-bold text-sm text-[#0a0a0a] truncate">{item.name}</h4>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs" style={{ color: AMBER }}>★</span>
          <span className="text-xs font-bold text-[#92400e]">
            {(3.9 + (item.name.length * 0.07 + item.price * 0.002) % 1.1).toFixed(1)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-black" style={{ color: PRIMARY }}>
            ₱{item.price}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdd(item);
            }}
            className="px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ backgroundColor: PRIMARY }}
          >
            + Add
          </button>
        </div>
      </div>
    </Link>
  );
}

/* ───────────────────────────────────────────────
   HomePage Component
   ─────────────────────────────────────────────── */
export default function HomePage() {
  const { user } = useAuth();
  const { menuItems, loading: menuLoading } = useMenu();
  const { cart, addToCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  function onImgError(name: string) {
    setImgErrors((prev) => new Set(prev).add(name));
  }

  const mostOrdered = menuItems.filter((m) => MOST_ORDERED_NAMES.includes(m.name));

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <AppHeader
        onProfileClick={() => setProfileOpen(true)}
        onCartToggle={() => setCartOpen(!cartOpen)}
        activePage="home"
      />

      {/* ─── Scrollable Content ─── */}
      <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto pb-20 sm:pb-0">
        {/* Banner Carousel */}
        <BannerCarousel banners={BANNERS} onOrderNow={() => window.location.href = "/menu"} />

        {/* Categories */}
        <CategoryCards />

        {/* Most Ordered */}
        <div className="py-6 px-4 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-[#1f2937]">Most Ordered</h2>
            <Link
              href="/menu"
              className="text-sm font-bold text-[#dc2626] hover:underline"
            >
              See All →
            </Link>
          </div>

          {menuLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <div className="w-full h-36 bg-[#f3f4f6] animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-[#f3f4f6] rounded w-3/4 animate-pulse" />
                    <div className="h-5 bg-[#f3f4f6] rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : mostOrdered.length === 0 ? (
            <p className="text-sm text-[#9ca3af] text-center py-8">Loading items...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {mostOrdered.map((item, i) => (
                <div key={item.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-in">
                  <MenuItemCard
                    item={item}
                    onAdd={addToCart}
                    imgErrors={imgErrors}
                    onImgError={onImgError}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        imgErrors={imgErrors}
        onImgError={onImgError}
      />

      {/* Profile Modal */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Floating Cart Button */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#dc2626", boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4)" }}
        aria-label="Open cart"
      >
        <svg className="w-6 h-6" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24">
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
    </div>
  );
}