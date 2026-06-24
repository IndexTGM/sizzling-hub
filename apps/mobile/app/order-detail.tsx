import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";
import { STORE_LOCATION } from "@/lib/store-config";
import { getImageCandidates } from "@/lib/storage";

const PRIMARY = "#dc2626";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const PLACEHOLDER = "placeholder.png";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type OrderStatus =
  | "pending" | "confirmed" | "preparing" | "prepared"
  | "ready" | "out_for_delivery" | "delivered" | "cancelled";
type OrderType = "dine_in" | "takeout" | "delivery" | "pickup";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  note: string;
  imageName: string;
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
  paymentMethod: string | null;
  paymentStatus: string | null;
  branchId: string | null;
  branchName: string | null;
}

const PAYMENT_ICON_MAP: Record<string, string> = { gcash: "📱 GCash", cod: "💵 Cash on Delivery" };

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

const ORDER_TYPE_ICON: Record<OrderType, string> = { dine_in: "🍽️", takeout: "🛍️", delivery: "🛵", pickup: "🛍️" };
const ORDER_TYPE_LABEL: Record<OrderType, string> = { dine_in: "Dine In", takeout: "Takeout", delivery: "Delivery", pickup: "Pickup" };

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

const STEP_ORDER_DELIVERY = ["placed", "confirmed", "preparing", "prepared", "out_for_delivery", "delivered"];
const STEP_ORDER_PICKUP = ["placed", "confirmed", "preparing", "ready", "delivered"];

function getStepIndex(status: OrderStatus, orderType?: OrderType): number {
  if (status === "cancelled") return -1;
  const key = status === "pending" ? "placed" : status;
  const steps = orderType === "pickup" ? STEP_ORDER_PICKUP : STEP_ORDER_DELIVERY;
  return steps.indexOf(key);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${mins} ${ampm}`;
}

function StepIcon({ completed, active, icon }: { completed: boolean; active: boolean; icon: string }) {
  return (
    <View style={[styles.stepIcon, completed && styles.stepIconCompleted, active && styles.stepIconActive]}>
      {completed ? <Text style={styles.stepCheck}>✓</Text> : <Text style={styles.stepEmoji}>{icon}</Text>}
    </View>
  );
}

// ─── GCash QR Image Component ──────────────────────────────────
function GcashQrImage({ style }: { style: any }) {
  const [tryIdx, setTryIdx] = useState(0);
  const candidates = useMemo(() => getImageCandidates("gcash_qr", "global"), []);
  return (
    <Image
      source={{ uri: candidates[tryIdx] || PLACEHOLDER }}
      style={style}
      resizeMode="contain"
      onError={() => { if (tryIdx < candidates.length - 1) setTryIdx(tryIdx + 1); }}
    />
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

  // GCash QR states
  const [gcashQrOpen, setGcashQrOpen] = useState(false);
  const [fullscreenQr, setFullscreenQr] = useState(false);

  const fetchOrder = useCallback(async (silent = false) => {
    if (!id || !user) { setLoading(false); return; }
    if (!hasLoadedRef.current && !silent) setLoading(true);

    const { data: row } = await supabase
      .from("orders")
      .select("id, order_type, status, subtotal, delivery_fee, discount, total, notes, placed_at, completed_at, payment_method, payment_status, branch_id, branches(name)")
      .eq("id", id)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (!row) { setOrder(null); setLoading(false); return; }

    const { data: items } = await supabase.from("order_items").select("quantity, unit_price, note, menu_item").eq("order_id", id);

    setOrder({
      id: row.id, orderType: row.order_type as OrderType, status: row.status as OrderStatus,
      subtotal: row.subtotal, deliveryFee: row.delivery_fee, discount: row.discount, total: row.total,
      notes: row.notes,
      items: (items || []).map((it: any) => ({ name: it.menu_item || "Unknown", quantity: it.quantity, price: it.unit_price, note: it.note ?? "", imageName: it.menu_item || "" })),
      placedAt: row.placed_at, completedAt: row.completed_at,
      paymentMethod: row.payment_method ?? null, paymentStatus: row.payment_status ?? null,
      branchId: row.branch_id ?? null,
      branchName: (row.branches as any)?.name || null,
    });
    setLoading(false);
    hasLoadedRef.current = true;
  }, [id, user]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => fetchOrder(true), 1000);
    return () => clearInterval(interval);
  }, [fetchOrder]);


  const handleCancelOrder = useCallback(async () => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      { text: "Yes, Cancel", style: "destructive", onPress: async () => {
        setCancelLoading(true);
        const { data: current } = await supabase.from("orders").select("status").eq("id", id).single();
        if (!current || current.status !== "pending") { setCancelLoading(false); Alert.alert("Cannot Cancel", "This order can no longer be cancelled."); await fetchOrder(); return; }
        const { data: items } = await supabase.from("order_items").select("menu_item, quantity").eq("order_id", id);
        if (items) {
          for (const it of items) {
            const { data: menuItem } = await supabase.from("menu_items").select("id").eq("name", it.menu_item).maybeSingle();
            if (menuItem) await supabase.rpc("restore_stock", { p_menu_item_id: menuItem.id, p_quantity: it.quantity });
          }
        }
        await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
        setCancelLoading(false);
        await fetchOrder();
      }},
    ]);
  }, [id, fetchOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}><TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Text style={styles.backIcon}>←</Text></TouchableOpacity><Text style={styles.headerTitle}>Order Detail</Text><View style={styles.headerSpacer} /></View>
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={PRIMARY} /><Text style={styles.loadingText}>Loading receipt…</Text></View>
      </SafeAreaView>
    );
  }
  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}><TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Text style={styles.backIcon}>←</Text></TouchableOpacity><Text style={styles.headerTitle}>Order Not Found</Text><View style={styles.headerSpacer} /></View>
        <View style={styles.loadingWrap}><Text style={styles.emptyText}>This order could not be found.</Text></View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status];
  const isCancelled = order.status === "cancelled";
  const isFinal = order.status === "delivered" || order.status === "cancelled";
  const isProcessing = !isFinal;
  const isOnline = order.orderType === "delivery" || order.orderType === "pickup";
  const isUnpaidGcash = order.paymentMethod === "gcash" && order.paymentStatus !== "paid" && !isCancelled;
  const isPickup = order.orderType === "pickup";
  const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const stepIdx = getStepIndex(order.status, order.orderType);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{order.id.slice(0, 8).toUpperCase()}</Text>
          <View style={styles.headerTypeRow}><Text style={styles.headerTypeIcon}>{ORDER_TYPE_ICON[order.orderType]}</Text><Text style={styles.headerTypeLabel}>{ORDER_TYPE_LABEL[order.orderType]}</Text></View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Branch name header */}
        {order.branchName && (
          <View style={styles.branchBanner}>
            <Text style={styles.branchBannerText}>🏢 <Text style={styles.branchBannerName}>{order.branchName}</Text></Text>
          </View>
        )}

        <View style={styles.statusCard}>
          <View style={styles.statusLeft}><Text style={styles.statusLabel}>Status</Text><Text style={styles.statusValue}>{isCancelled ? "Order Cancelled" : isProcessing ? "Processing" : "Completed"}</Text></View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}><Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text></View>
        </View>

        {isProcessing && (
          <View style={styles.processingCard}>
            <Text style={styles.processingIcon}>{order.status === "pending" ? "⏳" : order.status === "confirmed" ? "✅" : order.status === "preparing" ? "👨‍🍳" : order.status === "out_for_delivery" ? "🛵" : order.status === "ready" ? "📦" : "⏳"}</Text>
            <View style={styles.processingInfo}>
              <Text style={styles.processingTitle}>{order.status === "pending" ? "Order Received" : order.status === "confirmed" ? "Order Confirmed" : order.status === "preparing" ? "Preparing Your Order" : order.status === "out_for_delivery" ? "Out for Delivery" : order.status === "ready" ? "Ready for Pickup" : "Processing"}</Text>
              <Text style={styles.processingSub}>
                {order.status === "pending" && "Hang tight — the restaurant will confirm your order soon."}
                {order.status === "confirmed" && "The kitchen is getting ready to prepare your food."}
                {order.status === "preparing" && "Our chefs are cooking your meal with care."}
                {order.status === "out_for_delivery" && "Your order is on the way."}
                {order.status === "ready" && "Your order is ready! Come pick it up at the counter."}
              </Text>
            </View>
          </View>
        )}

        {isCancelled && (
          <View style={styles.cancelledCard}><Text style={styles.cancelledTitle}>This order was cancelled</Text><Text style={styles.cancelledSub}>If you have questions, please contact us.</Text></View>
        )}

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
                      {!isLast && <View style={[styles.timelineLine, isCompleted && styles.timelineLineCompleted]} />}
                      <StepIcon completed={isCompleted} active={isActive} icon={step.icon} />
                      {idx !== 0 && <View style={[styles.timelineLineTop, isCompleted && styles.timelineLineCompleted]} />}
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive, isCompleted && !isActive && styles.timelineLabelDone]}>{step.label}</Text>
                      {isActive && <Text style={styles.timelineSub}>Current step</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemLeft}><Text style={styles.itemQty}>x{item.quantity}</Text><View style={styles.itemInfo}><Text style={styles.itemName}>{item.name}</Text>{item.note ? <Text style={styles.itemNote}>"{item.note}"</Text> : null}</View></View>
              <Text style={styles.itemPrice}>₱{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          {order.paymentMethod && (
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Payment</Text><Text style={styles.summaryValue}>{PAYMENT_ICON_MAP[order.paymentMethod] || order.paymentMethod}{order.paymentStatus && <Text style={order.paymentStatus === "paid" ? { color: "#065f46", fontWeight: "700" } : { color: "#dc2626", fontWeight: "700" }}> ({order.paymentStatus})</Text>}</Text></View>
          )}
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>₱{order.subtotal}</Text></View>
          {order.deliveryFee > 0 && <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery Fee</Text><Text style={styles.summaryValue}>₱{order.deliveryFee}</Text></View>}
          {order.discount > 0 && <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: GREEN }]}>Discount</Text><Text style={[styles.summaryValue, { color: GREEN }]}>-₱{order.discount}</Text></View>}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabelBold}>Total</Text><Text style={styles.summaryTotal}>₱{order.total}</Text></View>
          {order.notes && <View style={styles.notesRow}><Text style={styles.notesLabel}>Notes</Text><Text style={styles.notesValue}>{order.notes}</Text></View>}
        </View>

        <View style={styles.timestampCard}>
          <View style={styles.timestampRow}><Text style={styles.timestampLabel}>Placed</Text><Text style={styles.timestampValue}>{formatDateTime(order.placedAt)}</Text></View>
          {order.completedAt && <View style={styles.timestampRow}><Text style={styles.timestampLabel}>Completed</Text><Text style={styles.timestampValue}>{formatDateTime(order.completedAt)}</Text></View>}
        </View>

        {/* GCash QR button for unpaid GCash orders */}
        {isUnpaidGcash && (
          <TouchableOpacity style={styles.chatBtn} onPress={() => setGcashQrOpen(true)} activeOpacity={0.7}>
            <Text style={styles.chatBtnText}>📱 View GCash QR Code</Text>
          </TouchableOpacity>
        )}

        {/* Chat button for online orders */}
        {isOnline && (
          <TouchableOpacity style={styles.chatBtn} onPress={() => router.push({ pathname: "/chat", params: { orderId: order.id, branchName: order.branchName || undefined } })} activeOpacity={0.7}>
            <Text style={styles.chatBtnText}>💬 Chat with {order.branchName || "Branch"}</Text>
          </TouchableOpacity>
        )}

        {order.status === "pending" && (
          <TouchableOpacity style={styles.cancelOrderBtn} onPress={handleCancelOrder} disabled={cancelLoading} activeOpacity={0.7}>
            <Text style={styles.cancelOrderBtnText}>{cancelLoading ? "Cancelling…" : "Cancel Order"}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* GCash QR Modal */}
      <Modal visible={gcashQrOpen} transparent animationType="fade" onRequestClose={() => setGcashQrOpen(false)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrSheet}>
            <View style={styles.confirmHeader}>
              <Text style={styles.confirmTitle}>GCash Payment</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setGcashQrOpen(false)}><Text style={styles.modalCloseIcon}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.qrContent}>
              <Text style={styles.qrAmount}>₱{order.total}</Text>
              <Text style={styles.qrInstructions}>Scan the QR code below with your GCash app to pay.</Text>
              <TouchableOpacity style={styles.qrImageWrap} onPress={() => setFullscreenQr(true)} activeOpacity={0.8}>
                <GcashQrImage style={styles.qrImage} />
              </TouchableOpacity>
              <View style={styles.qrHelp}>
                <Text style={styles.qrHelpTitle}>📋 How to pay:</Text>
                <Text style={styles.qrHelpStep}>1. Open your GCash app</Text>
                <Text style={styles.qrHelpStep}>2. Tap "Scan" and scan the QR code</Text>
                <Text style={styles.qrHelpStep}>3. Enter the amount: ₱{order.total}</Text>
                <Text style={styles.qrHelpStep}>4. Complete the payment and send the proof in the chat</Text>
              </View>
              <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setGcashQrOpen(false)} activeOpacity={0.7}>
                <Text style={styles.qrCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen QR Viewer */}
      <Modal visible={fullscreenQr} transparent animationType="fade" onRequestClose={() => setFullscreenQr(false)}>
        <View style={styles.fullscreenQrOverlay}>
          <TouchableOpacity style={styles.fullscreenQrCloseBtn} onPress={() => setFullscreenQr(false)}><Text style={styles.fullscreenQrCloseIcon}>✕</Text></TouchableOpacity>
          <ScrollView style={styles.fullscreenQrScroll} contentContainerStyle={styles.fullscreenQrScrollContent} maximumZoomScale={5} minimumZoomScale={1} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} bouncesZoom={false} centerContent>
            <GcashQrImage style={styles.fullscreenQrImage} />
          </ScrollView>
          <View style={styles.fullscreenQrActions}>
            <TouchableOpacity style={styles.fullscreenQrActionBtn} onPress={() => setFullscreenQr(false)}><Text style={styles.fullscreenQrActionText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.replace("/menu")}><Text style={styles.footerIcon}>🍽️</Text><Text style={styles.footerLabel}>Menu</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.replace("/cart")}>
          <View><Text style={styles.footerIcon}>🛒</Text>{itemCount > 0 && <View style={styles.footerBadge}><Text style={styles.footerBadgeText}>{itemCount}</Text></View>}</View>
          <Text style={styles.footerLabel}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn}><Text style={styles.footerIconActive}>📋</Text><Text style={styles.footerLabelActive}>Orders</Text></TouchableOpacity>
        {(user?.role === "admin" || user?.role === "dev") && (
          <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/drivers")}>
            <Text style={styles.footerIcon}>🛵</Text>
            <Text style={styles.footerLabel}>Drivers</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/profile")}><Text style={styles.footerIcon}>👤</Text><Text style={styles.footerLabel}>Profile</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 18, fontWeight: "700", color: "#374151" },
  headerCenter: { alignItems: "center", gap: 2 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: PRIMARY, letterSpacing: 0.3 },
  headerTypeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerTypeIcon: { fontSize: 12 }, headerTypeLabel: { fontSize: 11, fontWeight: "600", color: "#6b7280" },
  headerSpacer: { width: 36 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "600", color: "#9ca3af" },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#9ca3af" },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12 },
  branchBanner: { backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  branchBannerText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  branchBannerName: { color: PRIMARY },
  statusCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  statusLeft: { gap: 4 }, statusLabel: { fontSize: 12, fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  statusValue: { fontSize: 20, fontWeight: "800", color: "#1f2937" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusBadgeText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  processingCard: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: "#fde68a", backgroundColor: "#fef3c7", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  processingIcon: { fontSize: 28 }, processingInfo: { flex: 1, gap: 4 },
  processingTitle: { fontSize: 14, fontWeight: "800", color: "#b45309" },
  processingSub: { fontSize: 12, color: "#92400e", fontWeight: "500" },
  cancelledCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#fee2e2", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cancelledTitle: { fontSize: 16, fontWeight: "800", color: "#991b1b" }, cancelledSub: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  timelineCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#1f2937", marginBottom: 14 },
  timeline: { gap: 0 }, timelineRow: { flexDirection: "row", alignItems: "flex-start", minHeight: 52 },
  timelineLeft: { width: 36, alignItems: "center", justifyContent: "flex-start" },
  timelineLine: { position: "absolute", top: 34, left: 17, width: 2, height: 40, backgroundColor: "#e5e7eb" },
  timelineLineTop: { position: "absolute", top: 0, left: 17, width: 2, height: 9, backgroundColor: "#e5e7eb" },
  timelineLineCompleted: { backgroundColor: PRIMARY },
  stepIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", zIndex: 1 },
  stepIconCompleted: { backgroundColor: PRIMARY }, stepIconActive: { backgroundColor: "#fef2f2", borderWidth: 2, borderColor: PRIMARY },
  stepCheck: { fontSize: 13, fontWeight: "800", color: "#fff" }, stepEmoji: { fontSize: 13 },
  timelineRight: { flex: 1, paddingLeft: 12, paddingBottom: 12 },
  timelineLabel: { fontSize: 14, fontWeight: "600", color: "#9ca3af" },
  timelineLabelActive: { color: "#1f2937", fontWeight: "800" }, timelineLabelDone: { color: "#6b7280", fontWeight: "500" },
  timelineSub: { fontSize: 11, fontWeight: "600", color: PRIMARY, marginTop: 2 },
  itemsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 6 },
  itemLeft: { flexDirection: "row", alignItems: "flex-start", gap: 8, flex: 1 },
  itemQty: { fontSize: 13, fontWeight: "700", color: "#9ca3af", width: 28 }, itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#1f2937" }, itemNote: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" },
  itemPrice: { fontSize: 14, fontWeight: "700", color: "#374151" },
  summaryCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  summaryLabel: { fontSize: 14, fontWeight: "500", color: "#6b7280" }, summaryValue: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  summaryDivider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 8 },
  summaryLabelBold: { fontSize: 16, fontWeight: "800", color: "#1f2937" }, summaryTotal: { fontSize: 18, fontWeight: "800", color: PRIMARY },
  notesRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6", marginTop: 8, gap: 12 },
  notesLabel: { fontSize: 12, fontWeight: "600", color: "#9ca3af" }, notesValue: { fontSize: 12, color: "#6b7280", flex: 1, textAlign: "right", fontStyle: "italic" },
  timestampCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, gap: 8 },
  timestampRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timestampLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280" }, timestampValue: { fontSize: 13, fontWeight: "700", color: "#1f2937" },
  trackingCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  trackingWaiting: { fontSize: 13, fontWeight: "600", color: "#9ca3af", textAlign: "center" },
  chatBtn: { backgroundColor: "#eff6ff", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#bfdbfe" },
  chatBtnText: { fontSize: 14, fontWeight: "700", color: "#1d4ed8" },
  cancelOrderBtn: { backgroundColor: "#fef2f2", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#fecaca" },
  cancelOrderBtnText: { fontSize: 15, fontWeight: "700", color: "#dc2626" },
  footer: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderRadius: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: "#f3f4f6" },
  footerBtn: { flex: 1, alignItems: "center", paddingVertical: 6, gap: 3 }, footerIcon: { fontSize: 20 }, footerIconActive: { fontSize: 20 },
  footerLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280" }, footerLabelActive: { fontSize: 10, fontWeight: "700", color: PRIMARY },
  footerBadge: { position: "absolute", top: -4, right: -10, backgroundColor: PRIMARY, borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  footerBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // QR Modal styles
  qrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  qrSheet: { backgroundColor: "#fff", borderRadius: 20, width: "100%", maxHeight: "90%", paddingBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  confirmHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  confirmTitle: { fontSize: 17, fontWeight: "800", color: "#1f2937" },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  modalCloseIcon: { fontSize: 14, fontWeight: "700", color: "#6b7280" },
  qrContent: { paddingHorizontal: 20, paddingTop: 16, alignItems: "center", gap: 12 },
  qrAmount: { fontSize: 28, fontWeight: "900", color: PRIMARY },
  qrInstructions: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  qrImageWrap: { padding: 16, backgroundColor: "#f9fafb", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  qrImage: { width: 200, height: 200 },
  qrHelp: { alignSelf: "stretch", backgroundColor: "#eff6ff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#bfdbfe" },
  qrHelpTitle: { fontSize: 12, fontWeight: "700", color: "#1d4ed8", marginBottom: 6 },
  qrHelpStep: { fontSize: 12, color: "#2563eb", lineHeight: 20 },
  qrCloseBtn: { width: "100%", backgroundColor: "#f3f4f6", paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  qrCloseBtnText: { color: "#6b7280", fontSize: 14, fontWeight: "700" },
  fullscreenQrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)" },
  fullscreenQrCloseBtn: { position: "absolute", top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  fullscreenQrCloseIcon: { color: "#fff", fontSize: 24, fontWeight: "700" },
  fullscreenQrScroll: { flex: 1 },
  fullscreenQrScrollContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  fullscreenQrImage: { width: 320, height: 320, borderRadius: 16 },
  fullscreenQrActions: { position: "absolute", bottom: 50, left: 0, right: 0, alignItems: "center", paddingHorizontal: 40 },
  fullscreenQrActionBtn: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  fullscreenQrActionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});