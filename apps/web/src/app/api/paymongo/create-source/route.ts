import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSource } from "@/lib/paymongo";

export async function POST(request: NextRequest) {
  try {
    const sb = await createClient();
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, type, successUrl, failedUrl, billing } = body;

    if (!amount || !type || !successUrl || !failedUrl) {
      return NextResponse.json(
        { error: "Missing required fields: amount, type, successUrl, failedUrl" },
        { status: 400 },
      );
    }

    const validTypes = ["gcash"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid payment type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    const source = await createSource({
      type,
      amount: Math.round(amount * 100), // Convert PHP to centavos
      currency: "PHP",
      redirect: {
        success: successUrl,
        failed: failedUrl,
      },
      billing: billing || undefined,
    });

    return NextResponse.json({
      sourceId: source.id,
      checkoutUrl: source.attributes.redirect.checkout_url,
    });
  } catch (err: any) {
    console.error("PayMongo create-source error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create payment source" },
      { status: 500 },
    );
  }
}