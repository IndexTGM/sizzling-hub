"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import AuthForms from "./_components/AuthForms";
import HomePage from "./_components/HomePage";
import RecoveryForm from "./_components/RecoveryForm";

export default function Page() {
  const { user, loading, isRecovery, isResetFlow } = useAuth();
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [pkceRecovery, setPkceRecovery] = useState(false);

  // Check hash synchronously on every render — catches recovery before Supabase auto-login
  const hasRecoveryHash =
    typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  // Clean hash and handle PKCE code flow
  useEffect(() => {
    if (hasRecoveryHash) {
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    if (isRecovery) return;

    (async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      if (!code) return;

      setRecoveryLoading(true);
      try {
        const sb = createClient();
        const { data } = await sb.auth.exchangeCodeForSession(code);
        if (data?.session) {
          window.history.replaceState(null, "", window.location.pathname);
          setPkceRecovery(true);
        }
      } catch {
        // ignore
      } finally {
        setRecoveryLoading(false);
      }
    })();
  }, [hasRecoveryHash, isRecovery]);

  if (loading || recoveryLoading) {
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

  // Recovery / OTP reset flow always takes priority
  if (hasRecoveryHash || isRecovery || pkceRecovery || isResetFlow) return <RecoveryForm />;
  if (!user) return <AuthForms initialView="login" />;
  return <HomePage />;
}
