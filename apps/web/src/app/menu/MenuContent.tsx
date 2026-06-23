"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useMenu } from "@/lib/menu-context";
import { useBranch } from "@/lib/branch-context";
import { useCart } from "@/lib/cart-context";
import { useBanners } from "@/lib/banner-context";
import type { MenuItem } from "@/lib/menu-data";
import AppHeader from "@/app/_components/AppHeader";
import BranchSwitcher from "@/app/_components/BranchSwitcher";
import CartSidebar from "@/app/_components/CartSidebar";
import ProfileModal from "@/app/_components/ProfileModal";
import PlaceholderImage from "@/app/_components/PlaceholderImage";
import Footer from "@/app/_components/Footer";
import StorageImage from "@/app/_components/StorageImage";

const PRIMARY = "#dc2626";
const AMBER = "#f59e0b";

type CategoryFilter = { key: string; label: string };

const BANNER_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899",
];

function BannerCarousel({ branchId }: { branchId: string | null }) {
  const { banners } = useBanners();
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    trackRef.current?.scrollTo({ left: idx * (trackRef.current?.clientWidth ?? 0), behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    autoRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % banners.length;
        trackRef.current?.scrollTo({ left: next * (trackRef.current?.clientWidth ?? 0), behavior: "smooth" });
        return next;
      });
    }, 5000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="w-full overflow-hidden mb-4 py-2">
      <div ref={trackRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
        {banners.map((b, i) => {
          const accentColor = BANNER_COLORS[i % BANNER_COLORS.length];
          const isActive = i === active;
          return (
          <div key={b.id} className="w-full flex-shrink-0 snap-center" style={{ scrollSnapAlign: "center" }}>
            <div className="px-4 py-1">
              <div
                className="relative flex items-center rounded-2xl p-5 sm:p-6 gap-4 sm:gap-5 shadow-2xl border border-white/20 overflow-hidden transition-shadow duration-500"
                style={{
                  backgroundColor: accentColor,
                  backgroundImage: `
                    linear-gradient(145deg, ${accentColor} 0%, ${accentColor}cc 40%, ${accentColor}88 100%),
                    radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.3) 0%, transparent 50%),
                    radial-gradient(ellipse at 15% 85%, rgba(0,0,0,0.12) 0%, transparent 40%)
                  `,
                  minHeight: 140,
                  boxShadow: isActive
                    ? `0 20px 60px -10px ${accentColor}66, 0 8px 20px -5px ${accentColor}44`
                    : "0 8px 30px -5px rgba(0,0,0,0.12)",
                }}
              >
                {/* Decorative dots */}
                <div
                  className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-2xl overflow-hidden"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 20% 30%, #ffffff 1.5px, transparent 1.5px),
                      radial-gradient(circle at 60% 70%, #ffffff 1px, transparent 1px),
                      radial-gradient(circle at 80% 15%, #ffffff 1.5px, transparent 1.5px)
                    `,
                    backgroundSize: "32px 32px, 24px 24px, 40px 40px",
                    backgroundPosition: "0 0, 12px 12px, 8px 8px",
                  }}
                />
                {/* Sparkle dots */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute top-[12%] left-[6%] w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDuration: "2.5s" }} />
                  <div className="absolute top-[65%] right-[15%] w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDuration: "3s", animationDelay: "0.7s" }} />
                </div>

                <div className="flex-1 space-y-1.5 relative z-10 min-w-0">
                  <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-sm line-clamp-1">{b.title}</h3>
                  <p className="text-xs sm:text-sm text-white/80 font-medium line-clamp-2 leading-relaxed">{b.subtitle}</p>
                </div>
                <StorageImage
                  imageBaseName={b.image}
                  alt={b.title}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0"
                  branchId={branchId}
                />
              </div>
            </div>
          </div>
        );
        })}
      </div>
      <div className="flex justify-center gap-2.5 mt-4">
        {banners.map((_, i) => {
          const dotColor = BANNER_COLORS[i % BANNER_COLORS.length];
          const isActive = i === active;
          return (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-400 hover:scale-110"
            style={
              isActive
                ? {
                    width: 32,
                    height: 10,
                    backgroundColor: dotColor,
                    boxShadow: `0 0 12px ${dotColor}80, 0 2px 4px ${dotColor}44`,
                  }
                : {
                    width: 10,
                    height: 10,
                    backgroundColor: "rgba(209, 213, 219, 0.6)",
                  }
            }
          />
        );
        })}
      </div>
    </div>
  );
}

export default function MenuContent() {
  const { user, loading: authLoading } = useAuth();
  const { branch, branchId, allBranches, setBranchId } = useBranch();
  const { menuItems, categories, loading: menuLoading } = useMenu();
  const { cart, addToCart } = useCart();
  const router = useRouter();

  // Redirect to home (login) if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get("category") || "all");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  function onImgError(name: string) {
    setImgErrors((prev) => new Set(prev).add(name));
  }

  const displayCategories: CategoryFilter[] = useMemo(() => {
    return [
      { key: "all", label: "All" },
      ...categories.map((c) => ({ key: c.id, label: c.name })),
    ];
  }, [categories]);

  const filteredItems = useMemo(() => {
    let items = activeCategory === "all"
      ? menuItems
      : menuItems.filter((item) => {
          const catLabel = displayCategories.find((c) => c.key === activeCategory)?.label ?? activeCategory;
          return item.categories.includes(catLabel);
        });
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, activeCategory, search, displayCategories]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <AppHeader
        onProfileClick={() => setProfileOpen(true)}
        onCartToggle={() => setCartOpen(!cartOpen)}
        activePage="menu"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-20 sm:pb-0">
          {/* Banner Carousel */}
          <BannerCarousel branchId={branchId} />

          {/* Branch name banner when branch is selected */}
          {branch && allBranches.length > 1 && (
            <div className="mb-4 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Viewing menu for <span className="font-bold">{branch.name}</span>
                {branch.address && <span className="text-gray-400 font-normal hidden sm:inline">· {branch.address}</span>}
              </div>
              {allBranches.length > 1 && <BranchSwitcher />}
            </div>
          )}

          <h2 className="text-2xl font-black text-[#0a0a0a] mb-4">Menu</h2>

          {/* Search and Category Tabs */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items…"
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e7eb] bg-white text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all mb-4"
          />

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
              {filteredItems.map((item, i) => {
                const soldOut = (item.stock ?? 0) <= 0;
                return (
                <Link
                  key={item.id}
                  href={`/menu/${item.id}`}
                  className={`block bg-white rounded-xl border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group animate-fade-in ${
                    soldOut ? "opacity-75" : ""
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="w-full h-40 bg-[#f3f4f6] relative overflow-hidden">
                    {imgErrors.has(item.imageName) ? (
                      <PlaceholderImage name={item.name} />
                    ) : (
                      <StorageImage
                        imageBaseName={item.imageName}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          soldOut ? "" : "group-hover:scale-105"
                        }`}
                        branchId={branchId}
                        onError={() => onImgError(item.imageName)}
                      />
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <span className="text-white text-sm font-extrabold uppercase tracking-widest drop-shadow-lg">Sold Out</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#0a0a0a] text-base">{item.name}</h3>
                    <p className="text-[#6b7280] text-sm">{item.categories.join(", ")}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-lg font-black" style={{ color: PRIMARY }}>₱{item.price}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!soldOut) addToCart(item); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                          soldOut
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "text-white hover:scale-105 active:scale-95"
                        }`}
                        style={soldOut ? undefined : { backgroundColor: PRIMARY }}
                        disabled={soldOut}
                      >
                        {soldOut ? "Sold Out" : "+ Add"}
                      </button>
                    </div>
                  </div>
                </Link>
              );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pb-16" />

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
      <Footer />
    </div>
  );
}
