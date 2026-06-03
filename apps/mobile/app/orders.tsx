import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

const PRIMARY = "#dc2626";
const GREEN = "#10b981";

// ─── Order Types ────────────────────────────────────────────────
type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery";
type PaymentMethod = "cash" | "gcash" | "card";
type PaymentStatus = "unpaid" | "paid";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
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
  ready: { label: "Ready", color: "#065f46", bg: "#d1fae5" },
  completed: { label: "Completed", color: "#1e3a5f", bg: "#e0f2fe" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2" },
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine In",
  takeout: "Takeout",
  delivery: "Delivery",
};

const ORDER_TYPE_ICON: Record<OrderType, string> = {
  dine_in: "🍽️",
  takeout: "🛍️",
  delivery: "🛵",
};

// ─── Mock Orders ────────────────────────────────────────────────
const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-1001",
    orderType: "dine_in",
    status: "completed",
    paymentMethod: "cash",
    paymentStatus: "paid",
    subtotal: 245,
    deliveryFee: 0,
    discount: 0,
    total: 245,
    items: [
      { name: "Sisilog", quantity: 1, price: 129 },
      { name: "Iced Tea", quantity: 2, price: 58 },
    ],
    placedAt: "2026-05-25T14:30:00Z",
    completedAt: "2026-05-25T14:55:00Z",
  },
  {
    id: "ORD-1002",
    orderType: "delivery",
    status: "preparing",
    paymentMethod: "gcash",
    paymentStatus: "paid",
    subtotal: 440,
    deliveryFee: 50,
    discount: 20,
    total: 470,
    items: [
      { name: "Tapsilog", quantity: 2, price: 119 },
      { name: "Bangsilog", quantity: 1, price: 139 },
      { name: "Mango Shake", quantity: 1, price: 63 },
    ],
    placedAt: "2026-05-25T15:10:00Z",
  },
  {
    id: "ORD-1003",
    orderType: "takeout",
    status: "pending",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    subtotal: 258,
    deliveryFee: 0,
    discount: 0,
    total: 258,
    items: [
      { name: "Adobosilog", quantity: 1, price: 139 },
      { name: "Chicksilog", quantity: 1, price: 119 },
    ],
    placedAt: "2026-05-25T15:45:00Z",
  },
  {
    id: "ORD-1004",
    orderType: "delivery",
    status: "ready",
    paymentMethod: "card",
    paymentStatus: "paid",
    subtotal: 376,
    deliveryFee: 50,
    discount: 0,
    total: 426,
    items: [
      { name: "Sisilog", quantity: 2, price: 129 },
      { name: "Porksilog", quantity: 1, price: 118 },
    ],
    placedAt: "2026-05-24T18:20:00Z",
  },
  {
    id: "ORD-1005",
    orderType: "dine_in",
    status: "cancelled",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    subtotal: 129,
    deliveryFee: 0,
    discount: 0,
    total: 129,
    items: [{ name: "Sisilog", quantity: 1, price: 129 }],
    placedAt: "2026-05-24T12:00:00Z",
  },
  {
    id: "ORD-1006",
    orderType: "takeout",
    status: "confirmed",
    paymentMethod: "gcash",
    paymentStatus: "paid",
    subtotal: 237,
    deliveryFee: 0,
    discount: 0,
    total: 237,
    items: [
      { name: "Tapsilog", quantity: 1, price: 119 },
      { name: "Iced Tea", quantity: 1, price: 58 },
      { name: "Extra Rice", quantity: 2, price: 30 },
    ],
    placedAt: "2026-05-24T19:05:00Z",
  },
];

// ─── Filter Tabs ────────────────────────────────────────────────
type FilterTab = "all" | OrderStatus;
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
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
function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[order.status];

  return (
    <TouchableOpacity
      style={styles.orderCard}
      activeOpacity={0.85}
      onPress={() =>
        router.push({ pathname: "/order-detail", params: { id: order.id } })
      }
    >
      {/* Card Header */}
      <View style={styles.orderCardHeader}>
        <View style={styles.orderCardHeaderLeft}>
          <Text style={styles.orderId}>{order.id}</Text>
          <View style={styles.orderTypeRow}>
            <Text style={styles.orderTypeIcon}>
              {ORDER_TYPE_ICON[order.orderType]}
            </Text>
            <Text style={styles.orderTypeLabel}>
              {ORDER_TYPE_LABEL[order.orderType]}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.orderItems}>
        {order.items.map((item, idx) => (
          <View key={idx} style={styles.orderItemRow}>
            <Text style={styles.orderItemQty}>x{item.quantity}</Text>
            <Text style={styles.orderItemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.orderItemPrice}>₱{item.price * item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.orderCardFooter}>
        <View style={styles.orderFooterLeft}>
          <Text style={styles.orderDate}>
            {formatDate(order.placedAt)}
          </Text>
          <View style={styles.orderPaymentRow}>
            <View
              style={[
                styles.paymentDot,
                {
                  backgroundColor:
                    order.paymentStatus === "paid" ? GREEN : "#9ca3af",
                },
              ]}
            />
            <Text style={styles.orderPaymentText}>
              {order.paymentStatus === "paid" ? "Paid" : "Unpaid"} ·{" "}
              {order.paymentMethod === "cash"
                ? "Cash"
                : order.paymentMethod === "gcash"
                  ? "GCash"
                  : "Card"}
            </Text>
          </View>
        </View>
        <View style={styles.orderFooterRight}>
          {order.discount > 0 && (
            <Text style={styles.orderDiscount}>-₱{order.discount}</Text>
          )}
          <Text style={styles.orderTotal}>₱{order.total}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────
export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return MOCK_ORDERS;
    return MOCK_ORDERS.filter((o) => o.status === activeFilter);
  }, [activeFilter]);

  const renderOrder = useCallback(
    ({ item }: { item: Order }) => <OrderCard order={item} />,
    []
  );

  const renderFilterTab = useCallback(
    ({ item }: { item: { key: FilterTab; label: string } }) => {
      const isActive = activeFilter === item.key;
      return (
        <TouchableOpacity
          style={[
            styles.filterTab,
            isActive && styles.filterTabActive,
          ]}
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
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
      {filteredOrders.length === 0 ? (
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

        <TouchableOpacity style={styles.footerBtn}>
          <Text style={styles.footerIconActive}>📋</Text>
          <Text style={styles.footerLabelActive}>Orders</Text>
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
    justifyContent: "space-between",
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
  orderPaymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  paymentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  orderPaymentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
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