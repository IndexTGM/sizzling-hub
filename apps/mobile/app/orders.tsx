import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";

const PRIMARY = "#dc2626";
const GREEN = "#10b981";

// ─── Order Types ────────────────────────────────────────────────
type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "prepared"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery" | "pickup";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  note: string;
}

interface Order {
  id: string;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  items: OrderItem[];
  placedAt: string;
  completedAt?: string;
}

// ─── Status Config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#1e40af", bg: "#dbeafe" },
  preparing: { label: "Preparing", color: "#6b21a8", bg: "#f3e8ff" },
  prepared: { label: "Prepared", color: "#3730a3", bg: "#e0e7ff" },
  ready: { label: "Ready", color: "#065f46", bg: "#d1fae5" },
  out_for_delivery: { label: "Out for Delivery", color: "#c2410c", bg: "#ffedd5" },
  delivered: { label: "Delivered", color: "#1e3a5f", bg: "#e0f2fe" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2" },
};

const ORDER_TYPE_ICON: Record<OrderType, string> = {
  dine_in: "🍽️",
  takeout: "🛍️",
  delivery: "🛵",
  pickup: "🛍️",
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine In",
  takeout: "Takeout",
  delivery: "Delivery",
  pickup: "Pickup",
};

// ─── Filter Tabs ────────────────────────────────────────────────
type FilterTab = "all" | OrderStatus;
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "prepared", label: "Prepared" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

// ─── Format Helpers ─────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ─── Order Card ─────────────────────────────────────────────────
function OrderCard({
  order,
  onCancel,
  cancelLoading,
}: {
  order: Order;
  onCancel: (id: string) => void;
  cancelLoading: boolean;
}) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[order.status];
  const canCancel = order.status === "pending";

  return (
    <TouchableOpacity
      style={styles.orderCard}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/order-detail",
          params: { id: order.id },
        })
      }
    >
      {/* Card Header */}
      <View style={styles.orderCardHeader}>
        <View style={styles.orderCardHeaderLeft}>
          <Text style={styles.orderId}>
            {order.id.slice(0, 8).toUpperCase()}…
          </Text>
          <View style={styles.orderTypeRow}>
            <Text style={styles.orderTypeIcon}>
              {ORDER_TYPE_ICON[order.orderType]}
            </Text>
            <Text style={styles.orderTypeLabel}>
              {ORDER_TYPE_LABEL[order.orderType]}
            </Text>
          </View>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}
        >
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.orderItems}>
        {order.items.map((item, idx) => (
          <View key={idx}>
            <View style={styles.orderItemRow}>
              <Text style={styles.orderItemQty}>x{item.quantity}</Text>
              <Text style={styles.orderItemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.orderItemPrice}>
                ₱{item.price * item.quantity}
              </Text>
            </View>
            {item.note ? (
              <Text style={styles.orderItemNote}>"{item.note}"</Text>
            ) : null}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.orderCardFooter}>
        <View style={styles.orderFooterLeft}>
          <Text style={styles.orderDate}>{formatDate(order.placedAt)}</Text>
        </View>
        <View style={styles.orderFooterRight}>
          {order.discount > 0 && (
            <Text style={styles.orderDiscount}>-₱{order.discount}</Text>
          )}
          <Text style={styles.orderTotal}>₱{order.total}</Text>
        </View>
      </View>

      {/* Cancel button */}
      {canCancel && (
        <View style={styles.cancelRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onCancel(order.id);
            }}
            disabled={cancelLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>
              {cancelLoading ? "Cancelling…" : "Cancel Order"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────
export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { itemCount } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const hasLoadedRef = useRef(false);

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (!hasLoadedRef.current && !silent) setLoading(true);

      const { data: orderRows } = await supabase
        .from("orders")
        .select(
          "id, order_type, status, subtotal, delivery_fee, discount, total, placed_at, completed_at"
        )
        .eq("customer_id", user.id)
        .order("placed_at", { ascending: false });

      if (!orderRows) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = orderRows.map((o) => o.id);
      const { data: itemRows } = await supabase
        .from("order_items")
        .select("order_id, quantity, unit_price, note, menu_item")
        .in("order_id", orderIds);

      const itemsByOrder = new Map<string, OrderItem[]>();
      if (itemRows) {
        for (const row of itemRows) {
          const arr = itemsByOrder.get(row.order_id) || [];
          arr.push({
            name: row.menu_item || "Unknown",
            quantity: row.quantity,
            price: row.unit_price,
            note: row.note ?? "",
          });
          itemsByOrder.set(row.order_id, arr);
        }
      }

      setOrders(
        orderRows.map((o) => ({
          id: o.id,
          orderType: o.order_type as OrderType,
          status: o.status as OrderStatus,
          subtotal: o.subtotal,
          deliveryFee: o.delivery_fee,
          discount: o.discount,
          total: o.total,
          items: itemsByOrder.get(o.id) || [],
          placedAt: o.placed_at,
          completedAt: o.completed_at ?? undefined,
        }))
      );
      setLoading(false);
      hasLoadedRef.current = true;
    },
    [user]
  );

  // Initial fetch + silent refresh every second
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 1000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelLoading(true);

            // Check if still pending
            const { data: current } = await supabase
              .from("orders")
              .select("status")
              .eq("id", orderId)
              .single();
            if (!current || current.status !== "pending") {
              setCancelLoading(false);
              Alert.alert(
                "Cannot Cancel",
                "This order can no longer be cancelled. It has already been processed by the restaurant."
              );
              await fetchOrders();
              return;
            }

            // Restore stock — look up menu item id by name since order_items now stores text
            const { data: items } = await supabase
              .from("order_items")
              .select("menu_item, quantity")
              .eq("order_id", orderId);
            if (items) {
              for (const it of items) {
                const { data: menuItem } = await supabase
                  .from("menu_items")
                  .select("id")
                  .eq("name", it.menu_item)
                  .maybeSingle();
                if (menuItem) {
                  await supabase.rpc("restore_stock", {
                    p_menu_item_id: menuItem.id,
                    p_quantity: it.quantity,
                  });
                }
              }
            }

            await supabase
              .from("orders")
              .update({ status: "cancelled" })
              .eq("id", orderId);

            setCancelLoading(false);
            await fetchOrders();
          },
        },
      ]);
    },
    [fetchOrders]
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  const renderOrder = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard
        order={item}
        onCancel={handleCancelOrder}
        cancelLoading={cancelLoading}
      />
    ),
    [handleCancelOrder, cancelLoading]
  );

  const renderFilterTab = useCallback(
    ({ item }: { item: { key: FilterTab; label: string } }) => {
      const isActive = activeFilter === item.key;
      return (
        <TouchableOpacity
          style={[styles.filterTab, isActive && styles.filterTabActive]}
          onPress={() => setActiveFilter(item.key)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterTabText,
              isActive && styles.filterTabTextActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [activeFilter]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ─── Filter Tabs ─── */}
      <View style={styles.filterBar}>
        <FlatList
          data={FILTER_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          renderItem={renderFilterTab}
          contentContainerStyle={styles.filterContent}
        />
      </View>

      {/* ─── Order List ─── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No orders found</Text>
          <Text style={styles.emptySub}>
            {activeFilter === "all"
              ? "You haven't placed any orders yet."
              : `No ${activeFilter} orders.`}
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/menu")}
          >
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ─── Floating Footer ─── */}
      <View style={styles.footer}>
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

        <TouchableOpacity style={styles.footerBtn}>
          <Text style={styles.footerIconActive}>📋</Text>
          <Text style={styles.footerLabelActive}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/chats")}>
          <Text style={styles.footerIcon}>💬</Text>
          <Text style={styles.footerLabel}>Chats</Text>
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

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  // ─── Header ───
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 36,
  },

  // ─── Loading ───
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },

  // ─── Filter Tabs ───
  filterBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  filterContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterTabActive: {
    backgroundColor: PRIMARY,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // ─── Empty State ───
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9ca3af",
  },
  emptySub: {
    fontSize: 14,
    fontWeight: "500",
    color: "#d1d5db",
  },
  browseBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  browseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // ─── Order List ───
  listContent: {
    padding: 14,
    paddingBottom: 90,
    gap: 12,
  },

  // ─── Order Card ───
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderCardHeaderLeft: {
    gap: 4,
  },
  orderId: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    letterSpacing: 0.3,
  },
  orderTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderTypeIcon: {
    fontSize: 14,
  },
  orderTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ─── Order Items ───
  orderItems: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 10,
    gap: 6,
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderItemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    width: 28,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  orderItemNote: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginLeft: 36,
    marginTop: 2,
  },

  // ─── Order Card Footer ───
  orderCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 10,
  },
  orderFooterLeft: {
    gap: 4,
  },
  orderDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  orderFooterRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  orderDiscount: {
    fontSize: 12,
    fontWeight: "600",
    color: GREEN,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY,
  },

  // ─── Cancel ───
  cancelRow: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 10,
  },
  cancelBtn: {
    backgroundColor: "#fef2f2",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },

  // ─── Floating Footer ───
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
  footerIcon: {
    fontSize: 20,
  },
  footerIconActive: {
    fontSize: 20,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
  },
  footerLabelActive: {
    fontSize: 10,
    fontWeight: "700",
    color: PRIMARY,
  },
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
  footerBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});