import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const sb = await createClient();
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderType, address, paymentMethod, paymentSourceId } = body;

    if (!orderType || !paymentMethod || !paymentSourceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Fetch cart items
    const { data: cartRows } = await sb
      .from("cart_items")
      .select("menu_item_id, quantity, note")
      .eq("customer_id", user.id);

    if (!cartRows || cartRows.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Fetch menu item details
    const menuIds = [...new Set(cartRows.map((r: any) => r.menu_item_id))];
    const { data: menuRows } = await sb
      .from("menu_items")
      .select("id, name, price, stock")
      .in("id", menuIds);

    if (!menuRows) {
      return NextResponse.json({ error: "Menu items not found" }, { status: 400 });
    }

    const menuMap = new Map(menuRows.map((m: any) => [m.id, m]));

    // Validate stock
    for (const row of cartRows) {
      const menu = menuMap.get(row.menu_item_id);
      if (!menu) {
        return NextResponse.json(
          { error: `Menu item not found` },
          { status: 400 },
        );
      }
      if (menu.stock < row.quantity) {
        return NextResponse.json(
          {
            error: `Not enough stock for "${menu.name}". Only ${menu.stock} left.`,
          },
          { status: 400 },
        );
      }
    }

    // Calculate total
    const subtotal = cartRows.reduce(
      (sum: number, row: any) =>
        sum + (menuMap.get(row.menu_item_id)?.price || 0) * row.quantity,
      0,
    );

    const addressStr = address
      ? `${address.street}, ${address.city}, ${address.province}${address.zip ? ` ${address.zip}` : ""}`
      : null;

    // Create order
    const { data: order, error: orderErr } = await sb
      .from("orders")
      .insert({
        customer_id: user.id,
        order_type: orderType,
        status: "pending",
        subtotal,
        delivery_fee: 0,
        discount: 0,
        total: subtotal,
        notes: addressStr ? `Address: ${addressStr}` : null,
        payment_method: paymentMethod,
        payment_source_id: paymentSourceId,
        payment_status: "paid",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: orderErr?.message || "Failed to create order" },
        { status: 500 },
      );
    }

    // Create order items
    const orderItems = cartRows.map((row: any) => ({
      order_id: order.id,
      menu_item_id: row.menu_item_id,
      quantity: row.quantity,
      unit_price: menuMap.get(row.menu_item_id)?.price || 0,
      subtotal:
        (menuMap.get(row.menu_item_id)?.price || 0) * row.quantity,
      note: row.note ?? "",
    }));

    const { error: itemsErr } = await sb.from("order_items").insert(orderItems);
    if (itemsErr) {
      return NextResponse.json(
        { error: itemsErr.message },
        { status: 500 },
      );
    }

    // Clear cart
    await sb.from("cart_items").delete().eq("customer_id", user.id);

    // Decrement stock
    for (const row of cartRows) {
      await sb.rpc("decrement_stock", {
        p_menu_item_id: row.menu_item_id,
        p_quantity: row.quantity,
      });
    }

    // Audit log
    logAudit({
      source: "customer",
      action: "place_order",
      entity_type: "order",
      entity_id: order.id,
      details: {
        order_type: orderType,
        total: subtotal,
        payment_method: paymentMethod,
        items: cartRows.map((row: any) => ({
          name: menuMap.get(row.menu_item_id)?.name || "Unknown",
          quantity: row.quantity,
          price: menuMap.get(row.menu_item_id)?.price || 0,
          note: row.note ?? "",
        })),
      },
    }).catch(() => { /* best-effort */ });

    return NextResponse.json({
      success: true,
      orderId: order.id,
    });
  } catch (err: any) {
    console.error("PayMongo create-order error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create order" },
      { status: 500 },
    );
  }
}