"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface StoredPayment {
  sourceId: string | null;
  orderType: string;
  address: Record<string, unknown> | null;
  paymentMethod: string;
  branchId: string | null;
}

function readStoredPayment(): StoredPayment | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem("paymongo_payment");
    if (stored) {
      const data = JSON.parse(stored);
      sessionStorage.removeItem("paymongo_payment");
      return {
        sourceId: data.sourceId || null,
        orderType: data.orderType || "delivery",
        address: data.address || null,
        paymentMethod: data.paymentMethod || "gcash",
        branchId: data.branchId || null,
      };
    }
  } catch { /* ignore */ }
  return null;
}

export default function PaymentSuccessPage() {
  const storedRef = useRef<StoredPayment | null>(readStoredPayment());
  const stored = storedRef.current;

  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<"paid" | "failed" | "pending">("pending");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!stored?.sourceId) {
      setChecking(false);
      setStatus("failed");
      return;
    }

    let cancelled = false;
    let retries = 0;

    async function check() {
      try {
        const res = await fetch(
          `/api/paymongo/check-source?sourceId=${stored?.sourceId}`,
        );
        const data = await res.json();
        if (cancelled) return;

        if (data.status === "chargeable") {
          // Payment confirmed — create the order now
          try {
            const orderRes = await fetch("/api/paymongo/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderType: stored?.orderType,
                address: stored?.address,
                paymentMethod: stored?.paymentMethod,
                paymentSourceId: stored?.sourceId,
                branchId: stored?.branchId || null,
              }),
            });
            const orderData = await orderRes.json();
            if (orderData.success && orderData.orderId) {
              setOrderId(orderData.orderId);
            }
          } catch { /* best-effort */ }
          setStatus("paid");
        } else if (
          data.status === "failed" ||
          data.status === "cancelled" ||
          data.status === "expired" ||
          data.status === "payment_failed"
        ) {
          setStatus("failed");
        } else {
          // Still pending, retry (max 10 times = ~30s)
          retries++;
          if (retries < 10) {
            setTimeout(check, 3000);
            return;
          }
          setStatus("failed");
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
      setChecking(false);
    }
    check();
    return () => { cancelled = true; };
  }, [stored]);

  if (checking && status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#e5e7eb] rounded-full animate-spin mx-auto" style={{ borderTopColor: "#dc2626" }} />
          <p className="text-sm font-semibold text-gray-600">Confirming your payment…</p>
          <p className="text-xs text-gray-400">Please don't close this page.</p>
        </div>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center max-w-sm px-4 space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Payment Successful!</h1>
            <p className="text-sm text-gray-500 mt-2">
              Your payment has been confirmed. Your order is now being processed.
            </p>
            {orderId && (
              <p className="text-xs font-mono text-gray-400 mt-3">
                Order #{orderId.slice(0, 8).toUpperCase()}
              </p>
            )}
          </div>
          <Link
            href="/orders"
            className="inline-block w-full py-3 rounded-xl bg-[#dc2626] text-white font-bold text-sm hover:bg-red-700 transition-colors"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  // failed / expired / cancelled
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="text-center max-w-sm px-4 space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Payment Failed</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your payment could not be processed. Your cart has been preserved — you can try again.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/menu"
            className="inline-block w-full py-3 rounded-xl bg-[#dc2626] text-white font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Back to Menu
          </Link>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}