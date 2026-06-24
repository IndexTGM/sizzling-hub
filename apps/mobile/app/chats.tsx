import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";

const PRIMARY = "#dc2626";

type OrderStatus =
  | "pending" | "confirmed" | "preparing" | "prepared"
  | "ready" | "out_for_delivery" | "delivered" | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery" | "pickup";

interface ChatOrder {
  id: string;
  orderType: OrderType;
  status: OrderStatus;
  branchName: string | null;
  branchId: string | null;
}

const ORDER_TYPE_ICON: Record<OrderType, string> = {
  dine_in: "🍽️", takeout: "🛍️", delivery: "🛵", pickup: "🛍️",
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#1e40af", bg: "#dbeafe" },
  preparing: { label: "Preparing", color: "#6b21a8", bg: "#f3e8ff" },
  prepared: { label: "Prepared", color: "#3730a3", bg: "#e0e7ff" },
  ready: { label: "Ready", color: "#065f46", bg: "#d1fae5" },
  out_for_delivery: { label: "Out for Delivery", color: "#c2410c", bg: "#ffedd5" },
  delivered: { label: "Delivered", color: "#1e3a5f", bg: "#e0f2fe" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2" },
};

export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [orders, setOrders] = useState<ChatOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) { setOrders([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, order_type, status, branch_id, branches(name)")
      .eq("customer_id", user.id)
      .in("order_type", ["delivery", "pickup"])
      .not("status", "eq", "cancelled")
      .order("placed_at", { ascending: false });
    setOrders((data || []).map((o: any) => ({
      id: o.id,
      orderType: o.order_type as OrderType,
      status: o.status as OrderStatus,
      branchName: o.branches?.name || null,
      branchId: o.branch_id || null,
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💬 My Chats</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>No active chats</Text>
          <Text style={styles.emptySub}>
            Place an online order to start chatting with the branch.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: o }) => {
            const sc = STATUS_CONFIG[o.status];
            return (
              <TouchableOpacity
                style={styles.chatCard}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: "/chat", params: { orderId: o.id, branchName: o.branchName || undefined } })}
              >
                <View style={styles.chatLeft}>
                  <Text style={styles.chatOrderId}>#{o.id.slice(0, 8).toUpperCase()}…</Text>
                  <Text style={styles.chatType}>
                    {ORDER_TYPE_ICON[o.orderType]} {o.orderType}
                  </Text>
                  {o.branchName && (
                    <Text style={styles.chatBranch}>🏢 {o.branchName}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.color }]}>
                    {sc.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.replace("/menu")}>
          <Text style={styles.footerIcon}>🍽️</Text>
          <Text style={styles.footerLabel}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.replace("/cart")}>
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
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.replace("/orders")}>
          <Text style={styles.footerIcon}>📋</Text>
          <Text style={styles.footerLabel}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn}>
          <Text style={styles.footerIconActive}>💬</Text>
          <Text style={styles.footerLabelActive}>Chats</Text>
        </TouchableOpacity>
        {(user?.role === "admin" || user?.role === "dev") && (
            <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/drivers")}>
            <Text style={styles.footerIcon}>🛵</Text>
            <Text style={styles.footerLabel}>Drivers</Text>
            </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/profile")}>
          <Text style={styles.footerIcon}>👤</Text>
          <Text style={styles.footerLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 18, fontWeight: "700", color: "#374151" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: PRIMARY, letterSpacing: -0.5 },
  headerSpacer: { width: 36 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#9ca3af" },
  emptySub: { fontSize: 13, color: "#d1d5db", textAlign: "center", paddingHorizontal: 40 },

  listContent: { padding: 14, gap: 10, paddingBottom: 90 },

  chatCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  chatLeft: { gap: 3 },
  chatOrderId: { fontSize: 12, fontWeight: "800", color: "#9ca3af", fontFamily: "monospace" },
  chatType: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  chatBranch: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },

  footer: {
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    marginHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff",
    borderRadius: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: "#f3f4f6",
  },
  footerBtn: { flex: 1, alignItems: "center", paddingVertical: 6, gap: 3 },
  footerIcon: { fontSize: 20 },
  footerIconActive: { fontSize: 20 },
  footerLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280" },
  footerLabelActive: { fontSize: 10, fontWeight: "700", color: PRIMARY },
  footerBadge: {
    position: "absolute", top: -4, right: -10, backgroundColor: PRIMARY,
    borderRadius: 9, minWidth: 18, height: 18, alignItems: "center",
    justifyContent: "center", paddingHorizontal: 4,
  },
  footerBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});