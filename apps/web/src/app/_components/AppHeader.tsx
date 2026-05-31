"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

const P = "#dc2626";

export default function AppHeader({
  onProfileClick,
  onCartToggle,
  activePage,
}: {
  onProfileClick: () => void;
  onCartToggle: () => void;
  activePage?: "home" | "menu";
}) {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const closeMobile = () => setMobileMenuOpen(false);

  const navLinkClass = (page: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
      activePage === page
        ? "text-[#dc2626] bg-[#fef2f2] hover:bg-[#fee2e2]"
        : "text-[#6b7280] hover:text-[#dc2626] hover:bg-[#fef2f2]"
    }`;

  return (
    <header className="sticky top-0 z-30 glass">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <img
            src="/images/logo.png"
            alt="Sizzling Hub"
            className="w-9 h-9 rounded-lg object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/placeholder.png";
            }}
          />
          <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: P }}>
            SIZZLING HUB
          </h1>
        </Link>

        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className={navLinkClass("home")}>Home</Link>
          <Link href="/menu" className={navLinkClass("menu")}>Menu</Link>
        </nav>

        {/* Right: Desktop actions + Hamburger */}
        <div className="flex items-center gap-2">
          {/* Cart button */}
          <button
            onClick={onCartToggle}
            className="relative p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors hidden md:flex"
            aria-label="Open cart"
          >
            <svg className="w-6 h-6" fill="none" stroke="#0a0a0a" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: P }}>
                {itemCount}
              </span>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative hidden md:block" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: dropdownOpen ? "#fef2f2" : "transparent", color: dropdownOpen ? "#dc2626" : "#6b7280" }}
            >
              <span className="w-7 h-7 rounded-full bg-[#dc2626] flex items-center justify-center text-white text-xs font-bold">
                {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
              </span>
              <span className="hidden lg:inline">{user?.fullName}</span>
              <svg className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#e5e7eb] py-1.5 z-50 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-[#f3f4f6]">
                  <p className="text-sm font-semibold text-[#0a0a0a] truncate">{user?.fullName}</p>
                  <p className="text-xs text-[#9ca3af] truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setDropdownOpen(false); onProfileClick(); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] hover:text-[#dc2626] transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Edit Profile
                </button>
                <Link href="/orders" onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] hover:text-[#dc2626] transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  Orders
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin" onClick={() => setDropdownOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] hover:text-[#dc2626] transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Admin Panel
                  </Link>
                )}
                <div className="border-t border-[#f3f4f6] mt-1 pt-1">
                  <button onClick={() => { setDropdownOpen(false); logout(); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#ef4444] hover:bg-[#fef2f2] transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile: Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="#0a0a0a" strokeWidth={2} viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={closeMobile} />
          <div className="fixed top-16 inset-x-0 bg-white border-b border-[#e5e7eb] shadow-xl z-40 md:hidden animate-fade-in rounded-b-2xl overflow-hidden">
            <div className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-3 px-2 py-2 mb-2 bg-[#f9fafb] rounded-xl">
                <span className="w-9 h-9 rounded-full bg-[#dc2626] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0a0a0a] truncate">{user?.fullName}</p>
                  <p className="text-xs text-[#9ca3af] truncate">{user?.email}</p>
                </div>
              </div>

              <Link href="/" onClick={closeMobile} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activePage === "home" ? "text-[#dc2626] bg-[#fef2f2]" : "text-[#374151] hover:bg-[#f9fafb]"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Home
              </Link>
              <Link href="/menu" onClick={closeMobile} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activePage === "menu" ? "text-[#dc2626] bg-[#fef2f2]" : "text-[#374151] hover:bg-[#f9fafb]"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                Menu
              </Link>
              <button onClick={() => { closeMobile(); onCartToggle(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                Cart {itemCount > 0 && <span className="text-xs font-bold text-[#dc2626]">({itemCount})</span>}
              </button>
              <Link href="/orders" onClick={closeMobile} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                Orders
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin" onClick={closeMobile} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Admin
                </Link>
              )}

              <hr className="border-[#f3f4f6] my-1" />

              <button onClick={() => { closeMobile(); onProfileClick(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Edit Profile
              </button>
              <button onClick={() => { closeMobile(); logout(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#ef4444] hover:bg-[#fef2f2] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}