"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AuthForms from "./_components/AuthForms";

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/menu");
    }
  }, [loading, user, router]);

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

  if (!user) return <AuthForms initialView="login" />;
  return null;
}
