import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";

const PRIMARY = "#dc2626";
const GREEN = "#10b981";
const AMBER = "#f59e0b";

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
  imageName: string;
  menuItemId: string;
}

interface Order {
  id: string;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  notes: string | null;
  items: OrderItem[];
  placedAt: string;
  completedAt: string | null;
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
  out_for_delivery: {
    label: "Out for Delivery",
    color: "#c2410c",
    bg: "#ffedd5",
  },
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

/* ─── Progress tracker steps ─── */
const DELIVERY_STEPS = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "prepared", label: "Prepared", icon: "📦" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "🛵" },
  { key: "delivered", label: "Delivered", icon: "🏠" },
];

const PICKUP_STEPS = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "ready", label: "Ready for Pickup", icon: "📦" },
  { key: "delivered", label: "Picked Up", icon: "✅" },
];

const STEP_ORDER_DELIVERY = [
  "placed",
  "confirmed",
  "preparing",
  "prepared",
  "out_for_delivery",
  "delivered",
];
const STEP_ORDER_PICKUP = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
];

function getStepIndex(
  status: OrderStatus,
  orderType?: OrderType
): number {
  if (status === "cancelled") return -1;
  const key = status === "pending" ? "placed" : status;
  const steps =
    orderType === "pickup" ? STEP_ORDER_PICKUP : STEP_ORDER_DELIVERY;
  return steps.indexOf(key);
}

// ─── Format Helpers ─────────────────────────────────────────────
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${mins} ${ampm}`;
}

// ─── Step Icon Component ────────────────────────────────────────
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

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  // Review states
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [existingReviews, setExistingReviews] = useState<Set<string>>(new Set());

  const fetchOrder = useCallback(
    async (silent = false) => {
      if (!id || !user) {
        setLoading(false);
        return;
      }
      if (!hasLoadedRef.current && !silent) setLoading(true);

      const { data: row } = await supabase
        .from("orders")
        .select(
          "id, order_type, status, subtotal, delivery_fee, discount, total, notes, placed_at, completed_at"
        )
        .eq("id", id)
        .eq("customer_id", user.id)
        .maybeSingle();

      if (!row) {
        setOrder(null);
        setLoading(false);
        return;
      }

      const { data: items } = await supabase
        .from("order_items")
        .select(
          "quantity, unit_price, note, menu_item_id, menu_item:menu_items(name, image_url)"
        )
        .eq("order_id", id);

      // Fetch existing reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("menu_item_id")
        .eq("order_id", id)
        .eq("customer_id", user.id);

      if (reviews) {
        setExistingReviews(
          new Set(reviews.map((r: any) => r.menu_item_id))
        );
      }

      setOrder({
        id: row.id,
        orderType: row.order_type as OrderType,
        status: row.status as OrderStatus,
        subtotal: row.subtotal,
        deliveryFee: row.delivery_fee,
        discount: row.discount,
        total: row.total,
        notes: row.notes,
        items: (items || []).map((it: any) => ({
          name: it.menu_item?.name || "Unknown",
          quantity: it.quantity,
          price: it.unit_price,
          note: it.note ?? "",
          imageName: it.menu_item?.image_url || "",
          menuItemId: it.menu_item_id || "",
        })),
        placedAt: row.placed_at,
        completedAt: row.completed_at,
      });
      setLoading(false);
      hasLoadedRef.current = true;
    },
    [id, user]
  );

  // Initial fetch + silent refresh every second
  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => fetchOrder(true), 1000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  // ─── Cancel Order ───────────────────────────────────────────
  const handleCancelOrder = useCallback(async () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelLoading(true);

            const { data: current } = await supabase
              .from("orders")
              .select("status")
              .eq("id", id)
              .single();
            if (!current || current.status !== "pending") {
              setCancelLoading(false);
              Alert.alert(
                "Cannot Cancel",
                "This order can no longer be cancelled."
              );
              await fetchOrder();
              return;
            }

            const { data: items } = await supabase
              .from("order_items")
              .select("menu_item_id, quantity")
              .eq("order_id", id);
            if (items) {
              for (const it of items) {
                await supabase.rpc("restore_stock", {
                  p_menu_item_id: it.menu_item_id,
                  p_quantity: it.quantity,
                });
              }
            }

            await supabase
              .from("orders")
              .update({ status: "cancelled" })
              .eq("id", id);

            setCancelLoading(false);
            await fetchOrder();
          },
        },
      ]
    );
  }, [id, fetchOrder]);

  // ─── Review ─────────────────────────────────────────────────
  function openReview(item: OrderItem) {
    setReviewItem(item);
    setReviewRating(5);
    setReviewComment("");
    setReviewError("");
    setReviewSuccess(false);
    setReviewVisible(true);
  }

  async function handleSubmitReview() {
    if (!user || !order || !reviewItem) return;
    setReviewSubmitting(true);
    setReviewError("");
    setReviewSuccess(false);
    try {
      const { error } = await supabase.rpc("insert_review", {
        p_customer_id: user.id,
        p_order_id: order.id,
        p_menu_item_id: reviewItem.menuItemId,
        p_rating: reviewRating,
        p_comment: reviewComment.trim() || null,
      });
      if (error) {
        setReviewError(error.message);
      } else {
        setReviewSuccess(true);
        setExistingReviews((prev) =>
          new Set(prev).add(reviewItem.menuItemId)
        );
        setTimeout(() => {
          setReviewVisible(false);
          setReviewSuccess(false);
          setReviewComment("");
          setReviewRating(5);
        }, 1500);
      }
    } catch (err: any) {
      setReviewError(err.message || "Failed to submit review.");
    }
    setReviewSubmitting(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Detail</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading receipt…</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>This order could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status];
  const isCancelled = order.status === "cancelled";
  const isFinal =
    order.status === "delivered" || order.status === "cancelled";
  const isProcessing = !isFinal;
  const isPickup = order.orderType === "pickup";
  const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const stepIdx = getStepIndex(order.status, order.orderType);

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
          <Text style={styles.headerTitle}>
            {order.id.slice(0, 8).toUpperCase()}
          </Text>
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
        {/* ─── Status Badge ─── */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>
              {isCancelled
                ? "Order Cancelled"
                : isProcessing
                  ? "Processing"
                  : "Completed"}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusCfg.bg },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* ─── Processing Indicator ─── */}
        {isProcessing && (
          <View style={styles.processingCard}>
            <Text style={styles.processingIcon}>
              {order.status === "pending"
                ? "⏳"
                : order.status === "confirmed"
                  ? "✅"
                  : order.status === "preparing"
                    ? "👨‍🍳"
                    : order.status === "out_for_delivery"
                      ? "🛵"
                      : order.status === "ready"
                        ? "📦"
                        : "⏳"}
            </Text>
            <View style={styles.processingInfo}>
              <Text style={styles.processingTitle}>
                {order.status === "pending"
                  ? "Order Received"
                  : order.status === "confirmed"
                    ? "Order Confirmed"
                    : order.status === "preparing"
                      ? "Preparing Your Order"
                      : order.status === "out_for_delivery"
                        ? "Out for Delivery"
                        : order.status === "ready"
                          ? "Ready for Pickup"
                          : "Processing"}
              </Text>
              <Text style={styles.processingSub}>
                {order.status === "pending" &&
                  "Hang tight — the restaurant will confirm your order soon."}
                {order.status === "confirmed" &&
                  "The kitchen is getting ready to prepare your food."}
                {order.status === "preparing" &&
                  "Our chefs are cooking your meal with care."}
                {order.status === "out_for_delivery" &&
                  "Your order is on the way. Almost there!"}
                {order.status === "ready" &&
                  "Your order is ready! Come pick it up at the counter."}
              </Text>
            </View>
          </View>
        )}

        {/* Cancelled message */}
        {isCancelled && (
          <View style={styles.cancelledCard}>
            <Text style={styles.cancelledTitle}>
              This order was cancelled
            </Text>
            <Text style={styles.cancelledSub}>
              If you have questions, please contact us.
            </Text>
          </View>
        )}

        {/* ─── Status Timeline ─── */}
        {!isCancelled && (
          <View style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Order Progress</Text>
            <View style={styles.timeline}>
              {steps.map((step, idx) => {
                const isCompleted = idx <= stepIdx;
                const isActive = idx === stepIdx;
                const isLast = idx === steps.length - 1;

                return (
                  <View key={step.key} style={styles.timelineRow}>
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
                    <View style={styles.timelineRight}>
                      <Text
                        style={[
                          styles.timelineLabel,
                          isActive && styles.timelineLabelActive,
                          isCompleted &&
                            !isActive &&
                            styles.timelineLabelDone,
                        ]}
                      >
                        {step.label}
                      </Text>
                      {isActive && (
                        <Text style={styles.timelineSub}>Current step</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── Order Items ─── */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.note ? (
                    <Text style={styles.itemNote}>"{item.note}"</Text>
                  ) : null}
                </View>
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
              <Text style={styles.summaryValue}>
                ₱{order.deliveryFee}
              </Text>
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
          {order.notes && (
            <View style={styles.notesRow}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesValue}>{order.notes}</Text>
            </View>
          )}
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

        {/* ─── Cancel Button ─── */}
        {order.status === "pending" && (
          <TouchableOpacity
            style={styles.cancelOrderBtn}
            onPress={handleCancelOrder}
            disabled={cancelLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelOrderBtnText}>
              {cancelLoading ? "Cancelling…" : "Cancel Order"}
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── Review Section (delivered orders) ─── */}
        {order.status === "delivered" &&
          order.items.some((it) => it.menuItemId) && (
            <View style={styles.reviewCard}>
              <Text style={styles.sectionTitle}>Review Your Items</Text>
              {order.items.map((item, idx) => {
                const hasReviewed = existingReviews.has(item.menuItemId);
                if (!item.menuItemId) return null;
                return (
                  <View key={idx} style={styles.reviewItemRow}>
                    <View style={styles.reviewItemInfo}>
                      <Text style={styles.reviewItemName}>{item.name}</Text>
                      <Text style={styles.reviewItemQty}>
                        x{item.quantity}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.reviewBtn,
                        hasReviewed && styles.reviewBtnDone,
                      ]}
                      onPress={() => openReview(item)}
                      disabled={hasReviewed}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.reviewBtnText,
                          hasReviewed && styles.reviewBtnTextDone,
                        ]}
                      >
                        {hasReviewed ? "Reviewed ✓" : "Rate"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Review Modal ─── */}
      <Modal
        visible={reviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !reviewSubmitting && setReviewVisible(false)}
      >
        <View
          style={styles.reviewOverlay}
          // onPress={() => !reviewSubmitting && setReviewVisible(false)}
        >
          <View style={styles.reviewSheet}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewTitle}>Review</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setReviewVisible(false)}
                disabled={reviewSubmitting}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {reviewItem && (
              <>
                <Text style={styles.reviewItemTitle}>
                  {reviewItem.name}
                </Text>

                {/* Star selector */}
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setReviewRating(star)}
                      style={styles.starBtn}
                    >
                      <Text
                        style={[
                          styles.starIcon,
                          {
                            color:
                              star <= reviewRating ? AMBER : "#d1d5db",
                          },
                        ]}
                      >
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingLabel}>
                  {reviewRating === 1
                    ? "Poor"
                    : reviewRating === 2
                      ? "Fair"
                      : reviewRating === 3
                        ? "Good"
                        : reviewRating === 4
                          ? "Very Good"
                          : "Excellent!"}
                </Text>

                <TextInput
                  style={styles.reviewInput}
                  value={reviewComment}
                  onChangeText={(t) => setReviewComment(t.slice(0, 300))}
                  placeholder="Share your thoughts (optional)..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={300}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {reviewComment.length}/300
                </Text>

                {reviewError ? (
                  <Text style={styles.reviewErrorText}>
                    {reviewError}
                  </Text>
                ) : null}
                {reviewSuccess ? (
                  <Text style={styles.reviewSuccessText}>
                    Review submitted! 🎉
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.submitReviewBtn,
                    reviewSuccess && { backgroundColor: "#16a34a" },
                  ]}
                  onPress={handleSubmitReview}
                  disabled={reviewSubmitting || reviewSuccess}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submitReviewBtnText}>
                    {reviewSubmitting
                      ? "Submitting…"
                      : reviewSuccess
                        ? "Submitted!"
                        : "Submit Review"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

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
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9ca3af",
  },

  // ─── Scroll ───
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },

  // ─── Status Card ───
  statusCard: {
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
  statusLeft: {
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ─── Processing Card ───
  processingCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fef3c7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  processingIcon: {
    fontSize: 28,
  },
  processingInfo: {
    flex: 1,
    gap: 4,
  },
  processingTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#b45309",
  },
  processingSub: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
  },

  // ─── Cancelled Card ───
  cancelledCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fee2e2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991b1b",
  },
  cancelledSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
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
    alignItems: "flex-start",
    paddingVertical: 6,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
    width: 28,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  itemNote: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
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
  notesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginTop: 8,
    gap: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  notesValue: {
    fontSize: 12,
    color: "#6b7280",
    flex: 1,
    textAlign: "right",
    fontStyle: "italic",
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
    color: "#6b7280",
  },
  timestampValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
  },

  // ─── Cancel Order Button ───
  cancelOrderBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  cancelOrderBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#dc2626",
  },

  // ─── Review Section ───
  reviewCard: {
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
  reviewItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  reviewItemInfo: {
    flex: 1,
    gap: 2,
  },
  reviewItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  reviewItemQty: {
    fontSize: 12,
    color: "#9ca3af",
  },
  reviewBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reviewBtnDone: {
    backgroundColor: "#ecfdf5",
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  reviewBtnTextDone: {
    color: "#065f46",
  },

  // ─── Review Modal ───
  reviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reviewSheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseIcon: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
  },
  reviewItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0a0a0a",
    marginBottom: 12,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  starIcon: {
    fontSize: 34,
  },
  ratingLabel: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 14,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    minHeight: 80,
  },
  charCount: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 8,
  },
  reviewErrorText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "500",
    marginBottom: 8,
  },
  reviewSuccessText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "500",
    marginBottom: 8,
  },
  submitReviewBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitReviewBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
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