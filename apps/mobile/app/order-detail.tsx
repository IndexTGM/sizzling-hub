import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

const PRIMARY = "#dc2626";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const BLUE = "#3b82f6";

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

// ─── Constants ──────────────────────────────────────────────────
const ORDER_TYPE_ICON: Record<OrderType, string> = {
  dine_in: "🍽️",
  takeout: "🛍️",
  delivery: "🛵",
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine In",
  takeout: "Takeout",
  delivery: "Delivery",
};

// ─── Status Stepper ─────────────────────────────────────────────
const STEPS: { key: OrderStatus | "placed"; label: string; icon: string }[] = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "ready", label: "Ready", icon: "📦" },
  { key: "completed", label: "Completed", icon: "✨" },
];

const DELIVERY_STEPS: {
  key: OrderStatus | "placed" | "driver_assigned" | "on_the_way";
  label: string;
  icon: string;
}[] = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "ready", label: "Ready", icon: "📦" },
  { key: "driver_assigned", label: "Driver Assigned", icon: "🛵" },
  { key: "on_the_way", label: "On the Way", icon: "📍" },
  { key: "completed", label: "Delivered", icon: "🏠" },
];

const STATUS_INDEX: Record<string, number> = {
  placed: 0,
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  driver_assigned: 4,
  on_the_way: 5,
  completed: 6,
};

// ─── Mock Orders (same as orders.tsx) ───────────────────────────
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

// ─── Status Config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  pending: { color: "#92400e", bg: "#fef3c7" },
  confirmed: { color: "#1e40af", bg: "#dbeafe" },
  preparing: { color: "#6b21a8", bg: "#f3e8ff" },
  ready: { color: "#065f46", bg: "#d1fae5" },
  completed: { color: "#1e3a5f", bg: "#e0f2fe" },
  cancelled: { color: "#991b1b", bg: "#fee2e2" },
};

// ─── Format Helpers ─────────────────────────────────────────────
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${mins} ${ampm}`;
}

function getETA(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "~20-30 mins";
    case "confirmed":
      return "~15-25 mins";
    case "preparing":
      return "~10-15 mins";
    case "ready":
      return "Almost ready!";
    case "completed":
      return "Delivered";
    default:
      return "";
  }
}

function getStepKey(status: OrderStatus, orderType: OrderType): string {
  if (status === "cancelled") return "placed";
  if (status === "pending") return "placed";
  if (orderType === "delivery" && (status === "ready" || status === "completed")) {
    // For delivery orders that are ready or completed, show driver steps
    if (status === "completed") return "completed";
    return "on_the_way"; // ready = on the way for delivery
  }
  return status;
}

// ─── Step Icon ───────────────────────────────────────────────────
function StepIcon({
  completed,
  active,
  icon,
}: {
  completed: boolean;
  active: boolean;
  icon: string;
}) {
  return (
    <View
      style={[
        styles.stepIcon,
        completed && styles.stepIconCompleted,
        active && styles.stepIconActive,
      ]}
    >
      {completed ? (
        <Text style={styles.stepCheck}>✓</Text>
      ) : (
        <Text style={styles.stepEmoji}>{icon}</Text>
      )}
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { id } = useLocalSearchParams<{ id: string }>();

  const order = useMemo(
    () => MOCK_ORDERS.find((o) => o.id === id),
    [id]
  );

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Not Found</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>This order could not be found.</Text>
        </View>
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
            <Text style={styles.footerIconActive}>📋</Text>
            <Text style={styles.footerLabelActive}>Orders</Text>
          </TouchableOpacity>
          {user?.role === "Admin" && (
            <TouchableOpacity
              style={styles.footerBtn}
              onPress={() => router.push("/admin")}
            >
              <Text style={styles.footerIcon}>⚙️</Text>
              <Text style={styles.footerLabel}>Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const isDelivery = order.orderType === "delivery";
  const isCancelled = order.status === "cancelled";
  const steps = isDelivery ? DELIVERY_STEPS : STEPS;
  const currentStepKey = isCancelled ? "placed" : getStepKey(order.status, order.orderType);
  const currentStepIdx = STATUS_INDEX[currentStepKey] ?? 0;
  const statusCfg = STATUS_CONFIG[order.status];

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{order.id}</Text>
          <View style={styles.headerTypeRow}>
            <Text style={styles.headerTypeIcon}>
              {ORDER_TYPE_ICON[order.orderType]}
            </Text>
            <Text style={styles.headerTypeLabel}>
              {ORDER_TYPE_LABEL[order.orderType]}
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Status Badge + ETA ─── */}
        {!isCancelled && (
          <View style={styles.etaCard}>
            <View style={styles.etaLeft}>
              <Text style={styles.etaLabel}>Estimated Delivery</Text>
              <Text style={styles.etaTime}>
                {isDelivery ? getETA(order.status) : getETA(order.status)}
              </Text>
            </View>
            <View
              style={[styles.etaBadge, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.etaBadgeText, { color: statusCfg.color }]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>
        )}

        {isCancelled && (
          <View style={styles.etaCard}>
            <View style={styles.etaLeft}>
              <Text style={styles.etaLabel}>Order Status</Text>
              <Text style={[styles.etaTime, { color: "#991b1b" }]}>
                This order was cancelled
              </Text>
            </View>
            <View
              style={[styles.etaBadge, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.etaBadgeText, { color: statusCfg.color }]}>
                Cancelled
              </Text>
            </View>
          </View>
        )}

        {/* ─── Status Timeline ─── */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <View style={styles.timeline}>
            {steps.map((step, idx) => {
              const isCompleted = idx <= currentStepIdx && !isCancelled;
              const isActive = idx === currentStepIdx && !isCancelled;
              const isLast = idx === steps.length - 1;

              return (
                <View key={step.key} style={styles.timelineRow}>
                  {/* Connector line + icon */}
                  <View style={styles.timelineLeft}>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          isCompleted && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                    <StepIcon
                      completed={isCompleted}
                      active={isActive}
                      icon={step.icon}
                    />
                    {idx !== 0 && (
                      <View
                        style={[
                          styles.timelineLineTop,
                          isCompleted && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  {/* Label + subtext */}
                  <View style={styles.timelineRight}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isActive && styles.timelineLabelActive,
                        isCompleted && !isActive && styles.timelineLabelDone,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {isActive && !isCancelled && (
                      <Text style={styles.timelineSub}>Current step</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ─── Order Items ─── */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={styles.itemPrice}>
                ₱{item.price * item.quantity}
              </Text>
            </View>
          ))}
        </View>

        {/* ─── Order Summary ─── */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₱{order.subtotal}</Text>
          </View>
          {order.deliveryFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₱{order.deliveryFee}</Text>
            </View>
          )}
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: GREEN }]}>
                Discount
              </Text>
              <Text style={[styles.summaryValue, { color: GREEN }]}>
                -₱{order.discount}
              </Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Total</Text>
            <Text style={styles.summaryTotal}>₱{order.total}</Text>
          </View>
          <View style={styles.paymentRow}>
            <View
              style={[
                styles.paymentDot,
                {
                  backgroundColor:
                    order.paymentStatus === "paid" ? GREEN : "#9ca3af",
                },
              ]}
            />
            <Text style={styles.paymentMethod}>
              {order.paymentStatus === "paid" ? "Paid" : "Unpaid"} via{" "}
              {order.paymentMethod === "cash"
                ? "Cash"
                : order.paymentMethod === "gcash"
                  ? "GCash"
                  : "Card"}
            </Text>
          </View>
        </View>

        {/* ─── Timestamps ─── */}
        <View style={styles.timestampCard}>
          <View style={styles.timestampRow}>
            <Text style={styles.timestampLabel}>Placed</Text>
            <Text style={styles.timestampValue}>
              {formatDateTime(order.placedAt)}
            </Text>
          </View>
          {order.completedAt && (
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Completed</Text>
              <Text style={styles.timestampValue}>
                {formatDateTime(order.completedAt)}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

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

        {user?.role === "Admin" && (
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => router.push("/admin")}
          >
            <Text style={styles.footerIcon}>⚙️</Text>
            <Text style={styles.footerLabel}>Admin</Text>
          </TouchableOpacity>
        )}
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
  headerCenter: {
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: 0.3,
  },
  headerTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerTypeIcon: {
    fontSize: 12,
  },
  headerTypeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  headerSpacer: {
    width: 36,
  },

  // ─── Scroll ───
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },

  // ─── Empty State ───
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9ca3af",
  },

  // ─── ETA Card ───
  etaCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  etaLeft: {
    gap: 4,
  },
  etaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  etaTime: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  etaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  etaBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ─── Timeline Card ───
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 14,
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 52,
  },
  timelineLeft: {
    width: 36,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  timelineLine: {
    position: "absolute",
    top: 34,
    left: 17,
    width: 2,
    height: 40,
    backgroundColor: "#e5e7eb",
  },
  timelineLineTop: {
    position: "absolute",
    top: 0,
    left: 17,
    width: 2,
    height: 9,
    backgroundColor: "#e5e7eb",
  },
  timelineLineCompleted: {
    backgroundColor: PRIMARY,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepIconCompleted: {
    backgroundColor: PRIMARY,
  },
  stepIconActive: {
    backgroundColor: "#fef2f2",
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  stepCheck: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  stepEmoji: {
    fontSize: 13,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 12,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  timelineLabelActive: {
    color: "#1f2937",
    fontWeight: "800",
  },
  timelineLabelDone: {
    color: "#6b7280",
    fontWeight: "500",
  },
  timelineSub: {
    fontSize: 11,
    fontWeight: "600",
    color: PRIMARY,
    marginTop: 2,
  },

  // ─── Driver Card ───
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  driverVehicle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  callIcon: {
    fontSize: 18,
  },

  // ─── Items Card ───
  itemsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
    width: 28,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  // ─── Summary Card ───
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 8,
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  paymentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  paymentMethod: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },

  // ─── Timestamp Card ───
  timestampCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  timestampRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timestampLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
  timestampValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
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
    fontSize: 16,
  },
  footerIconActive: {
    fontSize: 16,
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