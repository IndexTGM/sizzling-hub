import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSource, createPayment } from "@/lib/paymongo";

export async function GET(request: NextRequest) {
  try {
    const sb = await createClient();
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sourceId = request.nextUrl.searchParams.get("sourceId");
    const orderId = request.nextUrl.searchParams.get("orderId");

    if (!sourceId) {
      return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });
    }

    const source = await getSource(sourceId);
    const status = source.attributes.status;

    // Create a Payment from the chargeable source (so it shows in PayMongo dashboard)
    if (status === "chargeable") {
      try {
        const payment = await createPayment({
          amount: source.attributes.amount,
          currency: "PHP",
          sourceId: source.id,
          description: orderId ? `Order ${orderId}` : undefined,
        });
        // Store payment ID and mark order as paid
        if (orderId) {
          await sb.from("orders").update({
            payment_status: "paid",
            payment_id: payment.id,
          }).eq("id", orderId);
        }
      } catch (paymentErr: any) {
        console.error("PayMongo create-payment error:", paymentErr);
        // Source is chargeable but payment creation failed — mark as failed
        if (orderId) {
          await sb.from("orders").update({ payment_status: "unpaid" }).eq("id", orderId);
        }
        return NextResponse.json({
          sourceId: source.id,
          status: "payment_failed",
          error: paymentErr?.message,
        });
      }
    }

    return NextResponse.json({
      sourceId: source.id,
      status,
    });
  } catch (err: any) {
    console.error("PayMongo check-source error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to check payment source" },
      { status: 500 },
    );
  }
}