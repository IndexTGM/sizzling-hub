import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  ScrollView,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback, useMemo, memo, useRef, useState } from "react";
import { PRIMARY } from "@/lib/menu-data";
import { useAuth } from "@/lib/auth-context";
import { useCart, type CartItem } from "@/lib/cart-context";

// ─── Static Image Map ───────────────────────────────────────────
const IMAGES: Record<string, ImageSourcePropType> = {
  placeholder: require("../assets/images/placeholder.png"),
};

const getItemImage = (imageKey: string): ImageSourcePropType =>
  IMAGES[imageKey] ?? IMAGES.placeholder;

// ─── Card Dimensions ────────────────────────────────────────────
function useGridLayout() {
  const { width } = useWindowDimensions();
  const horizontalPadding = 16;
  const gap = 10;
  const availableWidth = width - horizontalPadding * 2;

  // Responsive columns: phone (2), tablet portrait (3), tablet landscape (4+)
  const numColumns =
    availableWidth < 360
      ? 2
      : availableWidth < 600
        ? 3
        : availableWidth < 900
          ? 4
          : 5;
  const cardWidth = (availableWidth - gap * (numColumns - 1)) / numColumns;

  return { numColumns, cardWidth, gap };
}

// ─── Cart Item Card (grid style: wider, shorter) ─────────────────
interface CartGridCardProps {
  item: CartItem;
  cardWidth: number;
  gap: number;
  onDecrement: (id: string) => void;
  onIncrement: (id: string) => void;
  onDelete: (id: string) => void;
}

const CartGridCard = memo(function CartGridCard({
  item,
  cardWidth,
  gap,
  onDecrement,
  onIncrement,
  onDelete,
}: CartGridCardProps) {
  const imageHeight = cardWidth * 0.65;
  const itemTotal = item.price * item.quantity;
  const atMax = item.quantity >= item.stock;
  const isLowStock = item.stock <= 5;

  const imageSource = IMAGES[item.image] ?? IMAGES.placeholder;

  return (
    <View style={[styles.card, { width: cardWidth, marginBottom: gap }]}>
      <Image
        source={imageSource}
        style={[styles.cardImage, { width: cardWidth, height: imageHeight }]}
        resizeMode="cover"
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.note ? (
          <Text style={styles.cardNote} numberOfLines={1}>
            "{item.note}"
          </Text>
        ) : null}

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.cardUnitPrice}>₱{item.price} each</Text>
            <Text style={styles.cardTotal}>₱{itemTotal}</Text>
          </View>
          <View
            style={[
              styles.stockBadge,
              isLowStock ? styles.stockBadgeLow : styles.stockBadgeOk,
            ]}
          >
            <Text
              style={[
                styles.stockBadgeText,
                isLowStock ? styles.stockBadgeTextLow : styles.stockBadgeTextOk,
              ]}
            >
              {item.stock} left
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.qtyGroup}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => onDecrement(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, atMax && styles.qtyBtnDisabled]}
              onPress={() => onIncrement(item.id)}
              disabled={atMax}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.qtyBtnText,
                  atMax && styles.qtyBtnTextDisabled,
                ]}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// ─── Main Screen ────────────────────────────────────────────────
export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, itemCount, total, updateQuantity, removeFromCart, clearCart } = useCart();
  const { numColumns, cardWidth, gap } = useGridLayout();
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  // Stable refs for callbacks — never change identity, no re-renders cascaded
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const updateRef = useRef(updateQuantity);
  updateRef.current = updateQuantity;
  const removeRef = useRef(removeFromCart);
  removeRef.current = removeFromCart;

  const handleDecrement = useCallback((id: string) => {
    const currentItems = itemsRef.current;
    const item = currentItems.find((i) => i.id === id);
    if (item) updateRef.current(id, item.quantity - 1);
  }, []);

  const handleIncrement = useCallback((id: string) => {
    const currentItems = itemsRef.current;
    const item = currentItems.find((i) => i.id === id);
    if (item && item.quantity < item.stock) {
      updateRef.current(id, item.quantity + 1);
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    removeRef.current(id);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CartItem }) => (
      <CartGridCard
        item={item}
        cardWidth={cardWidth}
        gap={gap}
        onDecrement={handleDecrement}
        onIncrement={handleIncrement}
        onDelete={handleDelete}
      />
    ),
    [cardWidth, gap, handleDecrement, handleIncrement, handleDelete]
  );

  const handleCheckout = useCallback(() => {
    setCheckoutVisible(true);
  }, []);

  const handleConfirmCheckout = useCallback(() => {
    setCheckoutVisible(false);
    clearCart();
    // Placeholder: actual order submission will be added later
  }, []);

  const handleCancelCheckout = useCallback(() => {
    setCheckoutVisible(false);
  }, []);

  const key = useMemo(
    () => `cart-grid-${numColumns}-${cardWidth.toFixed(0)}`,
    [numColumns, cardWidth]
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
        <Text style={styles.headerTitle}>
          Cart ({itemCount})
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.replace("/menu")}
          >
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            key={key}
            data={items}
            renderItem={renderItem}
            keyExtractor={(i) => i.id}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap } : undefined}
            contentContainerStyle={[
              styles.gridContent,
              { paddingHorizontal: 16 },
            ]}
            showsVerticalScrollIndicator={false}
          />

          {/* ─── Bottom Bar ─── */}
          <View style={styles.bottomBar}>
            <View style={styles.totalWrap}>
              <Text style={styles.totalLabel}>
                Total ({itemCount} {itemCount === 1 ? "item" : "items"})
              </Text>
              <Text style={styles.totalPrice}>₱{total}</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutBtn}
              activeOpacity={0.8}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutBtnText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
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

        <TouchableOpacity style={styles.footerBtn}>
          <View>
            <Text style={styles.footerIconActive}>🛒</Text>
            {itemCount > 0 && (
              <View style={styles.footerBadge}>
                <Text style={styles.footerBadgeText}>{itemCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.footerLabelActive}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.replace("/orders")}
        >
          <Text style={styles.footerIcon}>📋</Text>
          <Text style={styles.footerLabel}>Orders</Text>
        </TouchableOpacity>

      </View>

      {/* ─── Checkout Confirmation Modal ─── */}
      <Modal
        visible={checkoutVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelCheckout}
      >
        <SafeAreaView style={styles.modalOverlay} edges={["top", "bottom"]}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Order</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={handleCancelCheckout}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Order Summary */}
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSectionLabel}>Order Summary</Text>

              {items.map((item) => {
                const itemTotal = item.price * item.quantity;
                return (
                  <View key={item.id} style={styles.summaryRow}>
                    <View style={styles.summaryLeft}>
                      <Text style={styles.summaryName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.note ? (
                        <Text style={styles.summaryNote} numberOfLines={1}>
                          "{item.note}"
                        </Text>
                      ) : null}
                      <Text style={styles.summaryQty}>
                        x{item.quantity} · ₱{item.price} each
                      </Text>
                    </View>
                    <Text style={styles.summaryTotal}>₱{itemTotal}</Text>
                  </View>
                );
              })}

              <View style={styles.modalDivider} />

              {/* Totals */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₱{total}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Items ({itemCount})
                </Text>
                <Text style={styles.summaryValueSmall}>
                  {items.reduce((sum, i) => sum + i.quantity, 0)} total qty
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabelBold}>Grand Total</Text>
                <Text style={styles.summaryGrandTotal}>₱{total}</Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
                onPress={handleCancelCheckout}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                activeOpacity={0.8}
                onPress={handleConfirmCheckout}
              >
                <Text style={styles.modalConfirmText}>Place Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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

  // ─── Empty State ───
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#9ca3af",
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

  // ─── Grid ───
  gridContent: {
    paddingVertical: 14,
    paddingBottom: 20,
  },

  // ─── Card ───
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    backgroundColor: "#f3f4f6",
  },
  cardBody: {
    padding: 10,
    gap: 5,
  },
  cardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    letterSpacing: -0.3,
  },
  cardNote: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: -2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  cardUnitPrice: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9ca3af",
  },
  cardTotal: {
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  qtyGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2937",
    minWidth: 18,
    textAlign: "center",
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    fontSize: 14,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyBtnTextDisabled: {
    color: "#9ca3af",
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  stockBadgeOk: {
    backgroundColor: "#ecfdf5",
  },
  stockBadgeLow: {
    backgroundColor: "#fef2f2",
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  stockBadgeTextOk: {
    color: "#065f46",
  },
  stockBadgeTextLow: {
    color: "#dc2626",
  },

  // ─── Bottom Bar ───
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
    gap: 12,
  },
  totalWrap: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: PRIMARY,
  },
  checkoutBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  checkoutBtnText: {
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

  // ─── Checkout Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  modalTitle: {
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
  modalScroll: {
    paddingHorizontal: 20,
    maxHeight: 360,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 12,
  },
  summaryRowLast: {
    paddingTop: 12,
  },
  summaryLeft: {
    flex: 1,
    gap: 2,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  summaryNote: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  summaryQty: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9ca3af",
  },
  summaryTotal: {
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  summaryValueSmall: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9ca3af",
  },
  summaryLabelBold: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
  },
  summaryGrandTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: PRIMARY,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6b7280",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});
