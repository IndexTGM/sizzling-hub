"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import InputField from "./InputField";

type View = "login" | "register" | "otp-signin" | "otp-verify";

export default function AuthForms({ initialView }: { initialView: View }) {
  const { login, register, signInWithOtp, verifySignInOtp } = useAuth();
  const [view, setView] = useState<View>(initialView);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [lusername, setLUsername] = useState("");
  const [lpass, setLPass] = useState("");

  const [rusername, setRUsername] = useState("");
  const [rname, setRName] = useState("");
  const [remail, setREmail] = useState("");
  const [rpass, setRPass] = useState("");
  const [rcpass, setRCPass] = useState("");
  const [loginTosAgreed, setLoginTosAgreed] = useState(false);
  const [registerTosAgreed, setRegisterTosAgreed] = useState(false);

  // OTP sign-in state
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  function switchView(v: View) {
    setView(v);
    setError("");
    setSuccess("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!loginTosAgreed) {
      setError("You must agree to the Terms of Service to log in.");
      return;
    }
    setLoading(true);
    const err = await login(lusername, lpass);
    setLoading(false);
    if (err) setError(err);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!registerTosAgreed) {
      setError("You must agree to the Terms of Service to create an account.");
      return;
    }
    setLoading(true);
    const err = await register(rusername, rname, remail, rpass, rcpass);
    setLoading(false);
    if (err === "check-email") {
      setSuccess("Account created! Check your email for a confirmation link. (If email confirmation is disabled in Supabase, you can log in immediately.)");
    } else if (err) {
      setError(err);
    }
  }

  function handleOtpSignInClick() {
    setOtpEmail("");
    setOtp("");
    switchView("otp-signin");
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!otpEmail || !otpEmail.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    const err = await signInWithOtp(otpEmail);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess("Check your email for a 6-digit sign-in code.");
      switchView("otp-verify");
    }
  }

  async function handleVerifySignInOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!otp || otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setLoading(true);
    const err = await verifySignInOtp(otpEmail, otp);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-fade-in">
          <img src="/images/logo.png" alt="Ben's Tapsihan" className="w-20 h-20 mx-auto mb-4 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder.png"; }} />
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "#dc2626" }}>BEN'S TAPIHAN</h1>
          <p className="text-[#6b7280] mt-2 text-sm font-medium tracking-wide">
            {view === "login" ? "Welcome back! Log in to continue." : view === "register" ? "Create your account to get started." : view === "otp-signin" ? "Sign in without a password." : "Enter your verification code"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e7eb] p-8 animate-slide-up">
          {(view === "login" || view === "register") && (
            <div className="flex mb-6 bg-[#f3f4f6] rounded-lg p-1">
              {(["login", "register"] as const).map((v) => (
                <button key={v} onClick={() => switchView(v)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${view === v ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#6b7280] hover:text-[#0a0a0a]"}`}>
                  {v === "login" ? "Log In" : "Register"}
                </button>
              ))}
            </div>
          )}

          {error && <div className="mb-4 p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-sm font-medium animate-fade-in">{error}</div>}
          {success && <div className="mb-4 p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-sm font-medium animate-fade-in">{success}</div>}

          {view === "login" && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <InputField label="Username" type="text" value={lusername} onChange={setLUsername} placeholder="yourname" />
                <InputField label="Password" type="password" value={lpass} onChange={setLPass} placeholder="••••••••" />
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={loginTosAgreed} onChange={(e) => setLoginTosAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[#d1d5db] text-[#dc2626] focus:ring-[#dc2626]/30 accent-[#dc2626]" />
                  <span className="text-xs text-[#6b7280] leading-relaxed">By continuing you agree to our <Link href="/terms" className="font-semibold text-[#0a0a0a] hover:text-[#dc2626] transition-colors">Terms of Service</Link> and <Link href="/privacy" className="font-semibold text-[#0a0a0a] hover:text-[#dc2626] transition-colors">Privacy Policy</Link>.</span>
                </label>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                  style={{ backgroundColor: loading ? "#fca5a5" : "#dc2626" }}>{loading ? "Logging in…" : "Log In"}</button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#e5e7eb]">
                <button type="button" onClick={handleOtpSignInClick} className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 border-2 border-[#dc2626] text-[#dc2626] hover:bg-[#fef2f2]">
                  Sign In with OTP
                </button>
              </div>
            </>
          )}

          {view === "otp-signin" && (
            <>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-sm text-[#6b7280] mb-2">Enter your email address and we'll send you a 6-digit code to sign in instantly.</p>
                <InputField label="Email" type="email" value={otpEmail} onChange={setOtpEmail} placeholder="you@example.com" />
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                  style={{ backgroundColor: loading ? "#fca5a5" : "#dc2626" }}>{loading ? "Sending…" : "Send Code"}</button>
              </form>
              <button type="button" onClick={() => switchView("login")} className="mt-4 w-full text-center text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors">← Back to Log In</button>
            </>
          )}

          {view === "otp-verify" && (
            <>
              <form onSubmit={handleVerifySignInOtp} className="space-y-4">
                <p className="text-sm text-[#6b7280] mb-2">
                  We sent a 6-digit code to <span className="font-semibold text-[#0a0a0a]">{otpEmail}</span>. Enter it below to sign in.
                </p>
                <InputField label="Verification Code" type="text" value={otp} onChange={(v: string) => setOtp(v.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                  style={{ backgroundColor: loading ? "#fca5a5" : "#dc2626" }}>{loading ? "Verifying…" : "Verify & Sign In"}</button>
              </form>
              <button type="button" onClick={handleOtpSignInClick} className="mt-4 w-full text-center text-sm font-medium text-[#6b7280] hover:text-[#dc2626] transition-colors">← Back</button>
            </>
          )}

          {view === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <InputField label="Username" type="text" value={rusername} onChange={setRUsername} placeholder="yourname" />
              <InputField label="Full Name" type="text" value={rname} onChange={setRName} placeholder="Charles Marquez" />
              <InputField label="Email" type="email" value={remail} onChange={setREmail} placeholder="you@example.com" />
              <InputField label="Password" type="password" value={rpass} onChange={setRPass} placeholder="Min. 8 characters" />
              <InputField label="Confirm Password" type="password" value={rcpass} onChange={setRCPass} placeholder="Re-enter password" />
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={registerTosAgreed} onChange={(e) => setRegisterTosAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#d1d5db] text-[#dc2626] focus:ring-[#dc2626]/30 accent-[#dc2626]" />
                <span className="text-xs text-[#6b7280] leading-relaxed">By continuing you agree to our <Link href="/terms" className="font-semibold text-[#0a0a0a] hover:text-[#dc2626] transition-colors">Terms of Service</Link> and <Link href="/privacy" className="font-semibold text-[#0a0a0a] hover:text-[#dc2626] transition-colors">Privacy Policy</Link>.</span>
              </label>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-200"
                style={{ backgroundColor: loading ? "#fca5a5" : "#dc2626" }}>{loading ? "Creating account…" : "Create Account"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}