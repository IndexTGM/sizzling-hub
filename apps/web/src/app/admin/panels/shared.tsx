"use client";

import React from "react";

export const RED = "#dc2626";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "prepared" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
export type OrderType = "dine_in" | "takeout" | "delivery" | "pickup";

export const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" }, { value: "confirmed", label: "Confirmed" }, { value: "preparing", label: "Preparing" },
  { value: "prepared", label: "Prepared" }, { value: "ready", label: "Ready" }, { value: "out_for_delivery", label: "Out for Delivery" }, { value: "delivered", label: "Delivered" }, { value: "cancelled", label: "Cancelled" },
];
export const STATUS_BG: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-600", confirmed: "bg-blue-50 text-blue-600", preparing: "bg-purple-50 text-purple-600",
  prepared: "bg-indigo-50 text-indigo-600", ready: "bg-emerald-50 text-emerald-600", out_for_delivery: "bg-orange-50 text-orange-600", delivered: "bg-cyan-50 text-cyan-600", cancelled: "bg-red-50 text-red-600",
};

export function getNextStatuses(current: OrderStatus, orderType?: OrderType): OrderStatus[] {
  const isWalkIn = orderType === "dine_in" || orderType === "takeout";
  if (isWalkIn) {
    // Simplified flow for walk-in: Pending → Confirm → Complete
    switch (current) {
      case "pending": return ["confirmed", "cancelled"];
      case "confirmed": return ["delivered", "cancelled"];
      case "delivered": case "cancelled": return [];
      default: return [];
    }
  }
  // Full flow for online (delivery / pickup)
  switch (current) {
    case "pending": return ["confirmed", "cancelled"];
    case "confirmed": return ["preparing", "cancelled"];
    case "preparing": return orderType === "pickup" ? ["ready", "cancelled"] : ["prepared", "cancelled"];
    case "prepared": return ["out_for_delivery", "cancelled"];
    case "ready": return ["delivered", "cancelled"];
    case "out_for_delivery": return ["delivered", "cancelled"];
    case "delivered": case "cancelled": return [];
    default: return [];
  }
}

export const OT_ICON: Record<OrderType, string> = { dine_in: "🍽️", takeout: "🛍️", delivery: "🛵", pickup: "🛍️" };
export const OT_LABEL: Record<OrderType, string> = { dine_in: "Dine In", takeout: "Takeout", delivery: "Delivery", pickup: "Pickup" };

export interface AdminOrder {
  id: string; customerName: string; customerEmail: string; customerPhone: string | null; orderType: OrderType; status: OrderStatus;
  subtotal: number; deliveryFee: number; discount: number; total: number; notes: string | null;
  items: { name: string; quantity: number; price: number }[]; placedAt: string; completedAt: string | null;
  paymentMethod: string | null; paymentStatus: string | null;
  seniorPwdDiscount: boolean;
}

export const PAYMENT_LABEL: Record<string, string> = {
  gcash: "GCash",
  cod: "COD",
};

export const PAYMENT_ICON: Record<string, string> = {
  gcash: "📱",
  cod: "💵",
};

export type OrderSource = "walk_in" | "online";

export const SOURCE_OPTIONS: { value: OrderSource; label: string; icon: string }[] = [
  { value: "walk_in", label: "Walk-in", icon: "🚶" },
  { value: "online", label: "Online", icon: "🌐" },
];

export const SOURCE_FILTER: Record<OrderType, OrderSource | "walk_in"> = {
  dine_in: "walk_in",
  takeout: "walk_in",
  delivery: "online",
  pickup: "online",
};

export const SOURCE_BG: Record<string, string> = {
  walk_in: "bg-indigo-50 text-indigo-600",
  online: "bg-teal-50 text-teal-600",
};

export const PAYMENT_STATUS_BG: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-600",
  unpaid: "bg-amber-50 text-amber-600",
  failed: "bg-red-50 text-red-600",
  refunded: "bg-gray-50 text-gray-600",
};

export function LoadingSkeleton() {
  return (<div className="bg-white rounded-xl border border-gray-200 p-8 space-y-3">{[1, 2, 3, 4].map((i) => (<div key={i} className="flex gap-4"><div className="h-5 w-1/4 rounded bg-gray-100 animate-pulse" /><div className="h-5 w-1/3 rounded bg-gray-100 animate-pulse" /><div className="h-5 w-1/6 rounded bg-gray-100 animate-pulse" /></div>))}</div>);
}
export function EmptyState({ message }: { message: string }) {
  return (<div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><p className="text-gray-300 text-sm">{message}</p></div>);
}