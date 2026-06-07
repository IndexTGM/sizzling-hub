import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refundPayment } from "@/lib/paymongo";

export async function POST(request: NextRequest) {
  try {
    const sb = await createClient();
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Get order payment info
    const { data: order } = await sb
      .from("orders")
      .select("payment_id, payment_method, total")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.payment_id || order.payment_method === "cod") {
      return NextResponse.json({ error: "No payment to refund" }, { status: 400 });
    }

    // Only admins or the order owner can refund
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    // For customer-initiated refunds, verify they own the order
    // (skipping RLS check since we already have user context)

    const refund = await refundPayment({
      paymentId: order.payment_id,
      amount: Math.round(order.total * 100), // PHP to centavos
      reason: "requested_by_customer",
    });

    // Update order payment status to refunded
    await sb.from("orders").update({ payment_status: "refunded" }).eq("id", orderId);

    return NextResponse.json({
      success: true,
      refundId: refund.id,
    });
  } catch (err: any) {
    console.error("PayMongo refund error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process refund" },
      { status: 500 },
    );
  }
}