"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getImagePath,
  type MenuItem,
} from "@/lib/menu-data";
import { useCart } from "@/lib/cart-context";
import { useMenu } from "@/lib/menu-context";

type View = "login" | "register" | "forgot";

/* ───────────────────────────────────────────────
   Auth Forms
   ─────────────────────────────────────────────── */
function AuthForms({ initialView }: { initialView: View }) {
  const { login, register } = useAuth();
  const [view, setView] = useState<View>(initialView);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Login
  const [lemail, setLEmail] = useState("");
  const [lpass, setLPass] = useState("");

  // Register
  const [rname, setRName] = useState("");
  const [remail, setREmail] = useState("");
  const [rpass, setRPass] = useState("");
  const [rcpass, setRCPass] = useState("");

  function switchView(v: View) {
    setView(v);
    setError("");
    setSuccess("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await login(lemail, lpass);
    setLoading(false);
    if (err) setError(err);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const err = await register(rname, remail, rpass, rcpass);
    setLoading(false);
    if (err === "check-email") {
      setSuccess(
        "Account created! Check your email for a confirmation link. (If email confirmation is disabled in Supabase, you can log in immediately.)"
      );
    } else if (err) {
      setError(err);
    }
  }

  function handleForgotClick() {
    switchView("forgot");
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!lemail || !lemail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    // Simulate API call — no backend yet
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSuccess(
      //"If an account with that email exists, we've sent a password reset link. Check your inbox."
      "This is not working yet."
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10 animate-fade-in">
          <img
            src="/images/logo.png"
            alt="Sizzling Hub"
            className="w-20 h-20 mx-auto mb-4 object-contain"
          />
          <h1
            className="text-3xl font-black tracking-tight"
            style={{ color: "#dc2626" }}
          >
            SIZZLING HUB
          </h1>
          <p className="text-[#6b7280] mt-2 text-sm font-medium tracking-wide">
            {view === "login"
              ? "Welcome back! Log in to continue."
              : view === "register"
              ? "Create your account to get started."
              : "Reset your password"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e7eb] p-8 animate-slide-up">
          {/* Tab switcher */}
          <div className="flex mb-6 bg-[#f3f4f6] rounded-lg p-1">
            {view !== "forgot" && (["login", "register"] as const).map((v) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                  view === v
                    ? "bg-white text-[#0a0a0a] shadow-sm"
                    : "text-[#6b7280] hover:text-[#0a0a0a]"
                }`}
              >
                {v === "login" ? "Log In" : "Register"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-sm font-medium animate-fade-in">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-sm font-medium animate-fade-in">
              {success}
            </div>
          )}

          {/* LOGIN FORM */}
          {view === "login" && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <InputField
                  label="Email"
                  type="email"
                  value={lemail}
                  onChange={setLEmail}
                  placeholder="you@example.com"
                />
                <InputField
                  label="Password"
                  type="password"
                  value={lpass}
                  onChange={setLPass}
                  placeholder="••••••••"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                  style={{
                    backgroundColor: loading ? "#fca5a5" : "#dc2626",
                  }}
                >
                  {loading ? "Logging in…" : "Log In"}
                </button>
              </form>
              <button
                type="button"
                onClick={handleForgotClick}
                className="mt-4 w-full text-center text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors"
              >
                Forgot Password?
              </button>
            </>
          )}

          {/* FORGOT PASSWORD FORM */}
          {view === "forgot" && (
            <>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-[#6b7280] mb-2">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </p>
                <InputField
                  label="Email"
                  type="email"
                  value={lemail}
                  onChange={setLEmail}
                  placeholder="you@example.com"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                  style={{
                    backgroundColor: loading ? "#fca5a5" : "#dc2626",
                  }}
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => switchView("login")}
                className="mt-4 w-full text-center text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors"
              >
                ← Back to Log In
              </button>
            </>
          )}

          {/* REGISTER FORM */}
          {view === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <InputField
                label="Full Name"
                type="text"
                value={rname}
                onChange={setRName}
                placeholder="Charles Marquez"
              />
              <InputField
                label="Email"
                type="email"
                value={remail}
                onChange={setREmail}
                placeholder="you@example.com"
              />
              <InputField
                label="Password"
                type="password"
                value={rpass}
                onChange={setRPass}
                placeholder="Min. 8 characters"
              />
              <InputField
                label="Confirm Password"
                type="password"
                value={rcpass}
                onChange={setRCPass}
                placeholder="Re-enter password"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                style={{
                  backgroundColor: loading ? "#fca5a5" : "#dc2626",
                }}
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="block text-sm font-semibold text-[#0a0a0a] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 rounded-lg border border-[#e5e7eb] text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all duration-150"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6b7280] hover:text-[#dc2626] transition-colors"
            tabIndex={-1}
          >
            {show ? "HIDE" : "SHOW"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Ordering System (Home)
   ─────────────────────────────────────────────── */
function HomePage() {
  const { user, logout, updateProfile } = useAuth();
  const { cart, itemCount, total, addToCart, updateQty, removeFromCart, placeOrder } = useCart();
  const { menuItems, categories, loading: menuLoading } = useMenu();
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Profile edit
  const [editName, setEditName] = useState(user?.fullName || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Set default active category once loaded
  const effectiveCategory = activeCategory || (categories[0]?.name ?? "");
  const filtered = menuItems.filter((m) => m.category === effectiveCategory);

  function onImgError(name: string) {
    setImgErrors((prev) => new Set(prev).add(name));
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="Sizzling Hub"
              className="w-9 h-9 rounded-lg object-contain"
            />
            <h1
              className="text-2xl font-black tracking-tight"
              style={{ color: "#dc2626" }}
            >
              SIZZLING HUB
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setEditName(user?.fullName || "");
                setProfileError("");
                setProfileSuccess("");
                setProfileOpen(true);
              }}
              className="text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors hidden sm:block"
            >
              {user?.fullName}
            </button>

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="relative p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              {itemCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center animate-fade-in"
                  style={{ backgroundColor: "#dc2626" }}
                >
                  {itemCount}
                </span>
              )}
            </button>

            {user?.role === "admin" && (
              <a
                href="/admin"
                className="text-sm font-semibold text-[#dc2626] hover:underline transition-colors hidden sm:block"
              >
                Admin
              </a>
            )}
            <button
              onClick={logout}
              className="text-sm font-medium text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex">
        {/* Menu area */}
        <div className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
          <h2 className="text-2xl font-black text-[#0a0a0a] mb-6">Menu</h2>

          {/* Category tabs */}
          {menuLoading ? (
            <div className="flex gap-2 mb-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-20 h-9 rounded-full bg-[#f3f4f6] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    effectiveCategory === cat.name
                      ? "text-white"
                      : "text-[#6b7280] bg-white border border-[#e5e7eb] hover:border-[#dc2626] hover:text-[#dc2626]"
                  }`}
                  style={
                    effectiveCategory === cat.name
                      ? { backgroundColor: "#dc2626" }
                      : undefined
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Menu grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Image */}
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
                  <h3 className="font-bold text-[#0a0a0a] text-base">
                    {item.name}
                  </h3>
                  <p className="text-[#6b7280] text-sm mb-3">
                    {item.category}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black" style={{ color: "#dc2626" }}>
                      ₱{item.price}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ backgroundColor: "#dc2626" }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Cart sidebar ─── */}
        <div
          className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-[#e5e7eb] shadow-xl z-40 transform transition-transform duration-300 ${
            cartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Cart header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
              <h3 className="font-black text-lg text-[#0a0a0a]">
                Your Order ({itemCount})
              </h3>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#9ca3af] text-sm">
                    Your cart is empty.
                  </p>
                  <p className="text-[#d1d5db] text-xs mt-1">
                    Add items from the menu to get started.
                  </p>
                </div>
              )}

              {menuLoading && cart.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#9ca3af] text-sm">Loading menu…</p>
                </div>
              )}
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#f9fafb] animate-fade-in"
                >
                  <div className="w-12 h-12 rounded-lg bg-[#f3f4f6] overflow-hidden flex-shrink-0">
                    {imgErrors.has(item.imageName) ? (
                      <img
                        src="/images/placeholder.png"
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
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
                    <p className="font-semibold text-sm text-[#0a0a0a] truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#6b7280]">₱{item.price}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-7 h-7 rounded-full border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-[#0a0a0a]">
                      {item.quantity}
                    </span>
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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Cart footer */}
            <div className="border-t border-[#e5e7eb] px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6b7280] font-medium">
                  Total
                </span>
                <span className="text-xl font-black" style={{ color: "#dc2626" }}>
                  ₱{total}
                </span>
              </div>
              <button
                disabled={cart.length === 0}
                className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100"
                style={{ backgroundColor: "#dc2626" }}
                onClick={async () => {
                  const result = await placeOrder();
                  if (result.success) {
                    alert("Order placed successfully!");
                    setCartOpen(false);
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

        {/* Overlay */}
        {cartOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setCartOpen(false)}
          />
        )}

        {/* ─── Profile Modal ─── */}
        {profileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-50"
              onClick={() => setProfileOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-[#e5e7eb] w-full max-w-sm p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-lg text-[#0a0a0a]">
                    Profile
                  </h3>
                  <button
                    onClick={() => setProfileOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Avatar + Email */}
                <div className="flex items-center gap-3 mb-5 p-4 bg-[#f9fafb] rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-[#dc2626] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#0a0a0a] truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-[#6b7280] truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Edit Name */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setProfileError("");
                    setProfileSuccess("");
                    setProfileLoading(true);
                    const err = await updateProfile(editName);
                    setProfileLoading(false);
                    if (err) {
                      setProfileError(err);
                    } else {
                      setProfileSuccess("Name updated successfully!");
                      setTimeout(() => setProfileOpen(false), 1200);
                    }
                  }}
                  className="space-y-3"
                >
                  <label className="block text-sm font-semibold text-[#0a0a0a]">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e5e7eb] text-sm text-[#0a0a0a] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/30 focus:border-[#dc2626] transition-all duration-150"
                  />

                  {profileError && (
                    <p className="text-xs text-[#dc2626] font-medium">
                      {profileError}
                    </p>
                  )}
                  {profileSuccess && (
                    <p className="text-xs text-[#16a34a] font-medium">
                      {profileSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full py-2.5 rounded-lg font-bold text-white text-sm tracking-wide transition-all duration-200"
                    style={{
                      backgroundColor: profileLoading
                        ? "#fca5a5"
                        : "#dc2626",
                    }}
                  >
                    {profileLoading ? "Saving…" : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlaceholderImage({ name }: { name: string }) {
  return (
    <img
      src="/images/placeholder.png"
      alt={name}
      className="w-full h-full object-cover"
    />
  );
}

/* ───────────────────────────────────────────────
   Password Recovery Form
   ─────────────────────────────────────────────── */
function RecoveryForm() {
  const { updatePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const err = await updatePassword(newPassword);
    setLoading(false);
    if (err) setError(err);
    else setSuccess("Password updated successfully! You can now log in.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-fade-in">
          <img
            src="/images/logo.png"
            alt="Sizzling Hub"
            className="w-20 h-20 mx-auto mb-4 object-contain"
          />
          <h1
            className="text-3xl font-black tracking-tight"
            style={{ color: "#dc2626" }}
          >
            SIZZLING HUB
          </h1>
          <p className="text-[#6b7280] mt-2 text-sm font-medium tracking-wide">
            Set your new password
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e7eb] p-8 animate-slide-up">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-sm font-medium animate-fade-in">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-sm font-medium animate-fade-in">
              {success}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 8 characters"
              />
              <InputField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter password"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                style={{
                  backgroundColor: loading ? "#fca5a5" : "#dc2626",
                }}
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}

          {success && (
            <button
              onClick={logout}
              className="w-full py-3 rounded-xl font-bold text-[#dc2626] text-sm tracking-wide transition-all duration-200 border-2 border-[#dc2626] hover:bg-[#fef2f2] mt-2"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Main Page
   ─────────────────────────────────────────────── */
export default function Page() {
  const { user, loading, isRecovery } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div
            className="w-10 h-10 border-4 border-[#e5e7eb] rounded-full animate-spin"
            style={{ borderTopColor: "#dc2626" }}
          />
          <p className="text-sm text-[#9ca3af] font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (isRecovery) return <RecoveryForm />;
  if (!user) return <AuthForms initialView="login" />;
  return <HomePage />;
}
