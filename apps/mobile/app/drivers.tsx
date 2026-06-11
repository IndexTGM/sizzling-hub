import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";

const PRIMARY = "#dc2626";

interface DriverOrder {
  id: string;
  customerName: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  placedAt: string;
  notes: string | null;
  paymentMethod: string | null;
}

export default function DriversPanel() {
  const router = useRouter();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const { data: rows } = await supabase
      .from("orders")
      .select(
        "id, status, total, notes, placed_at, payment_method, customer:profiles(full_name)"
      )
      .eq("order_type", "delivery")
      .in("status", ["prepared", "out_for_delivery"])
      .order("placed_at", { ascending: true });

    if (!rows) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ids = rows.map((r: any) => r.id);
    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, quantity, unit_price, menu_item:menu_items(name)")
      .in("order_id", ids);

    const itemsByOrder = new Map<
      string,
      { name: string; quantity: number; price: number }[]
    >();
    if (items) {
      for (const it of items) {
        const arr = itemsByOrder.get(it.order_id) || [];
        arr.push({
          name: (it.menu_item as any)?.name || "Unknown",
          quantity: it.quantity,
          price: it.unit_price,
        });
        itemsByOrder.set(it.order_id, arr);
      }
    }

    setOrders(
      rows.map((r: any) => ({
        id: r.id,
        status: r.status,
        customerName: (r.customer as any)?.full_name || "N/A",
        total: r.total,
        items: itemsByOrder.get(r.id) || [],
        placedAt: r.placed_at,
        notes: r.notes,
        paymentMethod: r.payment_method,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/home");
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [user, router, fetchOrders]);

  const handleAcceptDelivery = async (orderId: string) => {
    setActionLoading(orderId);
    await supabase
      .from("orders")
      .update({ status: "out_for_delivery" })
      .eq("id", orderId);
    await fetchOrders();
    setActionLoading(null);
  };

  const handleMarkDelivered = async (orderId: string) => {
    Alert.alert(
      "Mark as Delivered",
      "Confirm this order has been delivered?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delivered",
          onPress: async () => {
            setActionLoading(orderId);
            await supabase
              .from("orders")
              .update({
                status: "delivered",
                completed_at: new Date().toISOString(),
                payment_status: "paid",
              })
              .eq("id", orderId);
            await fetchOrders();
            setActionLoading(null);
          },
        },
      ]
    );
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const m = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const h = d.getHours();
    const mi = d.getMinutes().toString().padStart(2, "0");
    const a = h >= 12 ? "PM" : "AM";
    return `${m[d.getMonth()]} ${d.getDate()}, ${
      h % 12 || 12
    }:${mi} ${a}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛵 Drivers Panel</Text>
        <TouchableOpacity onPress={fetchOrders} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🛵</Text>
          <Text style={styles.emptyTitle}>No Active Deliveries</Text>
          <Text style={styles.emptySub}>
            Orders that are ready for delivery will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.countText}>{orders.length} order{orders.length !== 1 ? "s" : ""} to deliver</Text>
          {orders.map((o: any) => {
            const isPrepared = o.status === "prepared";
            const isOutForDelivery = o.status === "out_for_delivery";
            return (
              <View key={o.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderId}>
                      #{o.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.orderCustomer}>{o.customerName}</Text>
                  </View>
                  <View style={styles.orderHeaderRight}>
                    <Text style={styles.orderTotal}>₱{o.total}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        isPrepared ? styles.statusPrepared : styles.statusOutForDelivery,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isPrepared ? styles.statusPreparedText : styles.statusOutForDeliveryText,
                        ]}
                      >
                        {isPrepared ? "Prepared" : "Out for Delivery"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.orderItems}>
                  {o.items.map((item: any, i: number) => (
                    <View key={i} style={styles.orderItemRow}>
                      <Text style={styles.itemQty}>x{item.quantity}</Text>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>
                        ₱{item.price * item.quantity}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderPlaced}>
                    🕐 {formatDate(o.placedAt)}
                  </Text>
                  {o.paymentMethod && (
                    <Text style={styles.orderPayment}>
                      {o.paymentMethod === "cod" ? "💵 COD" : "📱 GCash"}
                    </Text>
                  )}
                </View>

                {o.notes && (
                  <View style={styles.orderNotes}>
                    <Text style={styles.notesText}>📝 {o.notes}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {isPrepared && (
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptDelivery(o.id)}
                      disabled={actionLoading === o.id}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.acceptBtnText}>
                        {actionLoading === o.id ? "Accepting…" : "🛵 Accept Delivery"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {isOutForDelivery && (
                    <TouchableOpacity
                      style={styles.deliverBtn}
                      onPress={() => handleMarkDelivered(o.id)}
                      disabled={actionLoading === o.id}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deliverBtnText}>
                        {actionLoading === o.id ? "Updating…" : "✅ Mark as Delivered"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.footerIcon}>🏠</Text>
          <Text style={styles.footerLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.replace("/menu")}
        >
          <Text style={styles.footerIcon}>🍽️</Text>
          <Text style={styles.footerLabel}>Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.replace("/cart")}
        >
          <View>
            <Text style={styles.footerIcon}>🛒</Text>
            {itemCount > 0 && (
              <View style={styles.footerBadge}>
                <Text style={styles.footerBadgeText}>{itemCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.footerLabel}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.replace("/orders")}
        >
          <Text style={styles.footerIcon}>📋</Text>
          <Text style={styles.footerLabel}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn}>
          <Text style={styles.footerIconActive}>🛵</Text>
          <Text style={styles.footerLabelActive}>Drivers</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backBtnText: { fontSize: 15, fontWeight: "700", color: PRIMARY },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtnText: { fontSize: 20, color: PRIMARY, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  countText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 4,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  orderHeaderLeft: { gap: 2, flex: 1 },
  orderHeaderRight: { alignItems: "flex-end", gap: 6 },
  orderId: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ca3af",
    fontFamily: "monospace",
  },
  orderCustomer: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: "900",
    color: PRIMARY,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPrepared: { backgroundColor: "#e0e7ff" },
  statusOutForDelivery: { backgroundColor: "#ffedd5" },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  statusPreparedText: { color: "#3730a3" },
  statusOutForDeliveryText: { color: "#c2410c" },
  orderItems: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: "700",
    color: "#d1d5db",
    width: 28,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  orderPlaced: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  orderPayment: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  orderNotes: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  notesText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9ca3af",
    fontStyle: "italic",
  },
  actionRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  deliverBtn: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deliverBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  // Floating Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  footerBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    gap: 3,
  },
  footerIcon: { fontSize: 20 },
  footerIconActive: { fontSize: 20 },
  footerLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280" },
  footerLabelActive: { fontSize: 10, fontWeight: "700", color: PRIMARY },
  footerBadge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: PRIMARY,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  footerBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});