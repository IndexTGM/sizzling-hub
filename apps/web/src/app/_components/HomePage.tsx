"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useBanners } from "@/lib/banner-context";
import AppHeader from "./AppHeader";
import CartSidebar from "./CartSidebar";
import ProfileModal from "./ProfileModal";
import Footer from "./Footer";
import StorageImage from "./StorageImage";

const PRIMARY = "#dc2626";
const BANNER_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
];

/* ───────────────────────────────────────────────
   Banner Carousel
   ─────────────────────────────────────────────── */
function BannerCarousel({
  banners,
  onOrderNow,
}: {
  banners: { id: string; title: string; subtitle: string; image: string }[];
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
    if (banners.length < 2) return;
    autoRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % banners.length;
        trackRef.current?.scrollTo({
          left: next * (trackRef.current?.clientWidth ?? 0),
          behavior: "smooth",
        });
        return next;
      });
    }, 5000);
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
        {banners.map((b, i) => {
          const accentColor = BANNER_COLORS[i % BANNER_COLORS.length];
          const isActive = i === active;
          return (
          <div
            key={b.id}
            className="w-full flex-shrink-0 snap-center"
            style={{ scrollSnapAlign: "center" }}
          >
            <div className="px-4 py-2">
              <div
                className={`relative flex flex-col sm:flex-row items-center rounded-3xl p-7 sm:p-10 gap-6 sm:gap-8 shadow-2xl border border-white/20 transition-all duration-500 ${
                  isActive ? "scale-[1.01] sm:scale-100" : "scale-95 opacity-80 sm:opacity-100 sm:scale-100"
                }`}
                style={{
                  backgroundColor: accentColor,
                  backgroundImage: `
                    linear-gradient(145deg, ${accentColor} 0%, ${accentColor}cc 40%, ${accentColor}88 100%),
                    radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.3) 0%, transparent 50%),
                    radial-gradient(ellipse at 15% 85%, rgba(0,0,0,0.15) 0%, transparent 40%)
                  `,
                  boxShadow: isActive
                    ? `0 20px 60px -10px ${accentColor}66, 0 8px 20px -5px ${accentColor}44`
                    : "0 8px 30px -5px rgba(0,0,0,0.15)",
                }}
              >
                {/* Decorative patterns */}
                <div
                  className="absolute inset-0 opacity-[0.06] pointer-events-none rounded-3xl overflow-hidden"
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
                {/* Floating sparkles */}
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                  <div className="absolute top-[15%] left-[8%] w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDuration: "2.5s" }} />
                  <div className="absolute top-[25%] right-[12%] w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDuration: "3s", animationDelay: "0.5s" }} />
                  <div className="absolute bottom-[20%] left-[20%] w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDuration: "2s", animationDelay: "1s" }} />
                </div>

                {/* Text Content */}
                <div className="flex-1 space-y-4 text-center sm:text-left relative z-10">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-[10px] font-extrabold tracking-[0.2em] uppercase border border-white/20">
                    SPECIAL OFFER
                  </span>
                  <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1] drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                    {b.title}
                  </h3>
                  <p className="text-sm sm:text-lg text-white/85 font-medium max-w-md leading-relaxed drop-shadow-sm">
                    {b.subtitle}
                  </p>
                  <button
                    onClick={onOrderNow}
                    className="group relative px-8 py-3.5 rounded-2xl bg-white text-sm font-extrabold transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl overflow-hidden"
                    style={{ color: accentColor }}
                  >
                    <span className="relative z-10">Order Now</span>
                    <span className="absolute inset-0 rounded-2xl bg-black/5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <svg className="inline-block w-4 h-4 ml-1 relative z-10 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </button>
                </div>

                {/* Image */}
                <div className="relative z-10">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-white/0 blur-2xl scale-125" />
                  <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20 hover:ring-white/40 transition-all duration-300 hover:scale-105 hover:rotate-1">
                    <StorageImage
                      imageBaseName={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover"
                      priority={i === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2.5 mt-5">
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
                    width: 40,
                    height: 12,
                    backgroundColor: dotColor,
                    boxShadow: `0 0 14px ${dotColor}80, 0 2px 6px ${dotColor}44`,
                  }
                : {
                    width: 12,
                    height: 12,
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

/* ───────────────────────────────────────────────
   Our Story - History Section
   ─────────────────────────────────────────────── */
function OurStory() {
  return (
    <section className="py-12 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-black text-[#1f2937] tracking-tight">Our Story</h2>
        <div className="w-16 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: PRIMARY }} />
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-[#e5e7eb] overflow-hidden">
        {/* Hero image */}
        <div className="w-full h-48 sm:h-64 bg-[#f3f4f6] relative overflow-hidden">
          <StorageImage
            imageBaseName="story_background"
            alt="Sizzling Hub"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="p-6">
              <h3 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg">Sizzling Hub</h3>
              <p className="text-white/80 text-sm font-medium">Since 2003 — Serving comfort, one sizzling plate at a time.</p>
            </div>
          </div>
        </div>

        {/* Story content */}
        <div className="p-6 sm:p-10 space-y-5 text-sm sm:text-base leading-relaxed text-[#4b5563]">
          <p>
            What started as a humble carinderia along the busy streets of Manila has grown into a beloved neighborhood
            institution. <span className="font-bold text-[#0a0a0a]">Sizzling Hub</span> was born from a simple idea:
            serve hearty, affordable Filipino comfort food that brings people together.
          </p>
          <p>
            Our founder believed that the best meals
            are the ones shared with family and friends. He perfected the art of sizzling silog — garlic fried rice
            topped with a runny egg and your choice of tender, flavorful meat — all served on a cast-iron plate that
            crackles with excitement.
          </p>
          <p>
            From our signature <span className="font-semibold" style={{ color: PRIMARY }}>Tapsilog</span> to the
            crowd-favorite <span className="font-semibold" style={{ color: PRIMARY }}>Sisilog</span>, every dish is
            made fresh to order using time-honored recipes passed down through generations. We source locally, cook
            with love, and serve with a smile — because that's the Filipino way.
          </p>
          <p>
            Today, Sizzling Hub continues the legacy. Whether you're a regular who's been with us since day one
            or a first-timer looking for your new favorite meal, you're family here. Come for the sizzle, stay for the
            flavor.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
   Top 1 Ordered
   ─────────────────────────────────────────────── */
function TopOrdered() {
  return (
    <section className="py-10 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-[#1f2937] tracking-tight">Top #1 Ordered</h2>
        <div className="w-16 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: PRIMARY }} />
      </div>

      <div
        className="relative rounded-2xl overflow-hidden shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${PRIMARY} 0%, #991b1b 100%)`,
        }}
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 40%, #ffffff40 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 p-8 sm:p-10">
          {/* Trophy icon */}
          <div className="flex-shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
              <div className="text-center">
                <span className="text-5xl">🏆</span>
                <p className="text-white text-xs font-bold mt-1 tracking-wider">#1</p>
              </div>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-3">
            <span className="inline-block px-3 py-1 rounded-md bg-yellow-400/20 backdrop-blur-sm text-yellow-300 text-xs font-extrabold tracking-widest uppercase border border-yellow-400/30">
              ALL-TIME FAVORITE
            </span>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
              Tapsilog
            </h3>
            <p className="text-white/80 text-sm sm:text-base font-medium max-w-md leading-relaxed">
              The undisputed king of our menu. Tender beef tapa marinated to perfection, served on garlic rice
              with a perfectly fried egg. The dish that started it all — and the one our customers can't get enough of.
            </p>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-2xl font-black text-white">₱109</span>
              <span className="text-white/60 text-sm line-through">₱129</span>
              <span className="ml-2 px-2 py-0.5 rounded bg-yellow-400 text-xs font-bold text-[#0a0a0a]">SAVE ₱20</span>
            </div>
            <button
              onClick={() => window.location.href = "/menu"}
              className="inline-block px-8 py-3 rounded-xl bg-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
              style={{ color: PRIMARY }}
            >
              Order Now →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
   HomePage Component
   ─────────────────────────────────────────────── */
export default function HomePage() {
  const { cart } = useCart();
  const { banners } = useBanners();
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <AppHeader
        onProfileClick={() => setProfileOpen(true)}
        onCartToggle={() => setCartOpen(!cartOpen)}
        activePage="menu"
      />

      {/* ─── Scrollable Content ─── */}
      <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto pb-20 sm:pb-0">
        {/* Banner Carousel */}
        {banners.length > 0 && (
          <BannerCarousel banners={banners} onOrderNow={() => window.location.href = "/menu"} />
        )}

        {/* Top #1 Ordered - featured prominently */}
        <TopOrdered />

        {/* Our Story */}
        <OurStory />
      </div>

      <Footer />

      {/* Cart Sidebar */}
      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        imgErrors={new Set()}
        onImgError={() => {}}
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
        style={{ backgroundColor: PRIMARY, boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4)" }}
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