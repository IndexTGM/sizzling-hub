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
  ActivityIndicator,
  Alert,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback, useMemo, memo, useRef, useState, useEffect } from "react";
import { PRIMARY } from "@/lib/menu-data";
import { useAuth } from "@/lib/auth-context";
import { useCart, type CartItem } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";
import {
  haversineDistance,
  STORE_LOCATION,
  MAX_DELIVERY_RADIUS_KM,
} from "@/lib/store-config";
import { getImageCandidates } from "@/lib/storage";

const PLACEHOLDER = "placeholder.png";

type OrderMethod = "delivery" | "pickup";

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  zip: string | null;
  is_default: boolean;
  lat: number;
  lng: number;
}

// ─── Card Dimensions ────────────────────────────────────────────
function useGridLayout() {
  const { width } = useWindowDimensions();
  const horizontalPadding = 16;
  const gap = 10;
  const availableWidth = width - horizontalPadding * 2;

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

function StorageImg({ imageBase, style }: { imageBase: string; style: any }) {
  const [tryIdx, setTryIdx] = useState(0);
  const candidates = useMemo(() => [...getImageCandidates(imageBase), PLACEHOLDER], [imageBase]);
  return (
    <Image
      source={{ uri: candidates[tryIdx] || PLACEHOLDER }}
      style={style}
      resizeMode="cover"
      onError={() => { if (tryIdx < candidates.length - 1) setTryIdx(tryIdx + 1); }}
    />
  );
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

  return (
    <View style={[styles.card, { width: cardWidth, marginBottom: gap }]}>
      <StorageImg imageBase={item.image} style={[styles.cardImage, { width: cardWidth, height: imageHeight }]} />
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
  const { items, itemCount, total, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const { numColumns, cardWidth, gap } = useGridLayout();

  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [orderMethod, setOrderMethod] = useState<OrderMethod>("delivery");
  const [placing, setPlacing] = useState(false);

  // Address state
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(
    null
  );
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressDistance, setAddressDistance] = useState<number | null>(null);

  // Fetch default address when checkout modal opens and method is delivery
  useEffect(() => {
    if (!user) {
      setDefaultAddress(null);
      setAddressDistance(null);
      return;
    }
    if (orderMethod !== "delivery" || !checkoutVisible) {
      setDefaultAddress(null);
      setAddressDistance(null);
      return;
    }
    const fetchDefaultAddress = async () => {
      setAddressLoading(true);
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();
      if (data) {
        const addr = data as SavedAddress;
        setDefaultAddress(addr);
        const dist = haversineDistance(
          STORE_LOCATION.lat,
          STORE_LOCATION.lng,
          addr.lat,
          addr.lng
        );
        setAddressDistance(dist);
      } else {
        setDefaultAddress(null);
        setAddressDistance(null);
      }
      setAddressLoading(false);
    };
    fetchDefaultAddress();
  }, [user, orderMethod, checkoutVisible]);

  const withinRange =
    addressDistance !== null && addressDistance <= MAX_DELIVERY_RADIUS_KM;
  const hasDeliveryAddress = orderMethod === "delivery" && defaultAddress !== null;
  const needsAddress =
    orderMethod === "delivery" && !addressLoading && defaultAddress === null;
  const outOfRange = orderMethod === "delivery" && hasDeliveryAddress && !withinRange;

  // Stable refs for callbacks
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
    setOrderMethod("delivery");
  }, []);

  const handleCancelCheckout = useCallback(() => {
    setCheckoutVisible(false);
  }, []);

  const handleConfirmOrder = useCallback(() => {
    setConfirmVisible(true);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setConfirmVisible(false);
  }, []);

  // Place the actual order
  const handlePlaceOrder = useCallback(async () => {
    setConfirmVisible(false);
    setPlacing(true);
    try {
      if (items.length === 0) {
        setPlacing(false);
        return;
      }

      // Validate delivery address
      if (orderMethod === "delivery") {
        if (!defaultAddress) {
          Alert.alert(
            "No Address",
            "Please set a default delivery address before placing your order.",
            [{ text: "OK" }]
          );
          setPlacing(false);
          return;
        }
        const dist = haversineDistance(
          STORE_LOCATION.lat,
          STORE_LOCATION.lng,
          defaultAddress.lat,
          defaultAddress.lng
        );
        if (dist > MAX_DELIVERY_RADIUS_KM) {
          Alert.alert(
            "Outside Delivery Zone",
            `Your address is ${dist.toFixed(1)} km away. Our delivery range is ${MAX_DELIVERY_RADIUS_KM} km.`,
            [{ text: "OK" }]
          );
          setPlacing(false);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert("Error", "You must be logged in to place an order.");
        setPlacing(false);
        return;
      }

      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      // Validate stock
      for (const item of items) {
        const { data: current } = await supabase
          .from("menu_items")
          .select("stock, name")
          .eq("id", item.id)
          .single();
        if (!current) {
          Alert.alert(
            "Item Unavailable",
            `"${item.name}" is no longer available.`
          );
          setPlacing(false);
          return;
        }
        if (current.stock < item.quantity) {
          Alert.alert(
            "Insufficient Stock",
            `Not enough stock for "${current.name}". Only ${current.stock} left, but you have ${item.quantity} in cart.`
          );
          setPlacing(false);
          return;
        }
      }

      // Build address string for notes
      const addressStr =
        orderMethod === "delivery" && defaultAddress
          ? `${defaultAddress.street}, ${defaultAddress.city}, ${defaultAddress.province}${defaultAddress.zip ? ` ${defaultAddress.zip}` : ""}`
          : null;

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: session.user.id,
          order_type: orderMethod,
          status: "pending",
          subtotal,
          delivery_fee: 0,
          discount: 0,
          total: subtotal,
          notes: addressStr ? `Address: ${addressStr}` : null,
        })
        .select("id")
        .single();

      if (orderErr || !order) {
        Alert.alert("Error", orderErr?.message || "Failed to create order.");
        setPlacing(false);
        return;
      }

      const orderItems = items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        note: item.note ?? "",
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsErr) {
        Alert.alert("Error", itemsErr.message);
        setPlacing(false);
        return;
      }

      // Decrement stock
      for (const item of items) {
        await supabase.rpc("decrement_stock", {
          p_menu_item_id: item.id,
          p_quantity: item.quantity,
        });
      }

      clearCart();
      setCheckoutVisible(false);
      setPlacing(false);
      Alert.alert(
        "Order Placed!",
        "Your order has been submitted and is now pending. We're preparing your food! 🍳",
        [{ text: "OK", onPress: () => router.replace("/orders") }]
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Something went wrong.");
      setPlacing(false);
    }
  }, [items, orderMethod, defaultAddress, clearCart, router]);

  const canPlaceOrder =
    items.length > 0 &&
    !placing &&
    !needsAddress &&
    !outOfRange &&
    !addressLoading;

  const key = useMemo(
    () => `cart-grid-${numColumns}-${cardWidth.toFixed(0)}`,
    [numColumns, cardWidth]
  );

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

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
        <Text style={styles.headerTitle}>Cart ({itemCount})</Text>
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

        {user?.role === "admin" && (
          <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/drivers")}>
            <Text style={styles.footerIcon}>🛵</Text>
            <Text style={styles.footerLabel}>Drivers</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Checkout Modal (Order Method + Summary) ─── */}
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
              <Text style={styles.modalTitle}>Checkout</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={handleCancelCheckout}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Pickup / Delivery Toggle */}
            <View style={styles.methodRow}>
              <TouchableOpacity
                onPress={() => setOrderMethod("delivery")}
                style={[
                  styles.methodBtn,
                  orderMethod === "delivery" && styles.methodBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.methodBtnText,
                    orderMethod === "delivery" && styles.methodBtnTextActive,
                  ]}
                >
                  🛵 Delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOrderMethod("pickup")}
                style={[
                  styles.methodBtn,
                  orderMethod === "pickup" && styles.methodBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.methodBtnText,
                    orderMethod === "pickup" && styles.methodBtnTextActive,
                  ]}
                >
                  🛍️ Pickup
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Address Section for Delivery */}
              {orderMethod === "delivery" && (
                <View style={styles.addressSection}>
                  {addressLoading ? (
                    <View style={styles.addressLoadingWrap}>
                      <ActivityIndicator size="small" color={PRIMARY} />
                      <Text style={styles.addressLoadingText}>
                        Checking address…
                      </Text>
                    </View>
                  ) : needsAddress ? (
                    <View style={styles.addressWarning}>
                      <Text style={styles.addressWarningTitle}>
                        ⚠️ No default address set
                      </Text>
                      <Text style={styles.addressWarningText}>
                        Please add your delivery address to place a delivery
                        order.
                      </Text>
                      <TouchableOpacity
                        style={styles.setAddressBtn}
                        onPress={() => {
                          setCheckoutVisible(false);
                          router.push("/addresses");
                        }}
                      >
                        <Text style={styles.setAddressBtnText}>
                          Set Delivery Address
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : outOfRange ? (
                    <View style={styles.addressWarning}>
                      <Text style={styles.addressWarningTitle}>
                        ⚠️ Outside Delivery Zone
                      </Text>
                      <Text style={styles.addressWarningText}>
                        This address is {addressDistance?.toFixed(1)} km away — our
                        maximum range is {MAX_DELIVERY_RADIUS_KM} km.
                      </Text>
                      <Text style={styles.addressWarningSubtext}>
                        Please choose a closer address or switch to pickup.
                      </Text>
                      <TouchableOpacity
                        style={styles.setAddressBtn}
                        onPress={() => {
                          setCheckoutVisible(false);
                          router.push("/addresses");
                        }}
                      >
                        <Text style={styles.setAddressBtnText}>
                          Change Address
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : hasDeliveryAddress && withinRange ? (
                    <View style={styles.addressOk}>
                      <Text style={styles.addressOkTitle}>
                        📍 Delivering to:
                      </Text>
                      <Text style={styles.addressOkStreet}>
                        {defaultAddress.street}
                      </Text>
                      <Text style={styles.addressOkDetail}>
                        {defaultAddress.city}, {defaultAddress.province}
                        {addressDistance !== null &&
                          ` • ${addressDistance.toFixed(1)} km away`}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCheckoutVisible(false);
                          router.push("/addresses");
                        }}
                      >
                        <Text style={styles.changeAddrLink}>
                          Change Address
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}

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
                        <Text style={styles.summaryNote} numberOfLines={2}>
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
                  {totalQty} total qty
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
                style={[
                  styles.modalConfirmBtn,
                  !canPlaceOrder && styles.modalConfirmBtnDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleConfirmOrder}
                disabled={!canPlaceOrder}
              >
                <Text
                  style={[
                    styles.modalConfirmText,
                    !canPlaceOrder && styles.modalConfirmTextDisabled,
                  ]}
                >
                  Place Order
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ─── Confirmation Prompt Modal ─── */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelConfirm}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmSheet}>
            <View style={styles.confirmHeader}>
              <Text style={styles.confirmTitle}>Confirm Your Order</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={handleCancelConfirm}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Order type badge */}
            <View style={styles.confirmBadgeRow}>
              <View
                style={[
                  styles.confirmBadge,
                  orderMethod === "delivery"
                    ? styles.confirmBadgeDelivery
                    : styles.confirmBadgePickup,
                ]}
              >
                <Text style={styles.confirmBadgeText}>
                  {orderMethod === "delivery" ? "🛵 Delivery" : "🛍️ Pickup"}
                </Text>
              </View>
            </View>

            {/* Address if delivery */}
            {orderMethod === "delivery" && defaultAddress && (
              <View style={styles.confirmAddressWrap}>
                <Text style={styles.confirmAddressLabel}>
                  📍 Delivery Address
                </Text>
                <Text style={styles.confirmAddressStreet}>
                  {defaultAddress.street}
                </Text>
                <Text style={styles.confirmAddressDetail}>
                  {defaultAddress.city}, {defaultAddress.province}
                  {defaultAddress.zip ? ` ${defaultAddress.zip}` : ""}
                  {addressDistance !== null &&
                    ` • ${addressDistance.toFixed(1)} km`}
                </Text>
              </View>
            )}

            {/* Items list */}
            <ScrollView
              style={styles.confirmItemsScroll}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item, idx) => (
                <View key={idx} style={styles.confirmItemRow}>
                  <View style={styles.confirmItemLeft}>
                    <View style={styles.confirmItemNameRow}>
                      <Text style={styles.confirmItemQty}>
                        {item.quantity}x
                      </Text>
                      <Text
                        style={styles.confirmItemName}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </View>
                    {item.note ? (
                      <Text style={styles.confirmItemNote} numberOfLines={2}>
                        "{item.note}"
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.confirmItemPrice}>
                    ₱{item.price * item.quantity}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Total */}
            <View style={styles.confirmTotalRow}>
              <Text style={styles.confirmTotalLabel}>Total</Text>
              <Text style={styles.confirmTotalValue}>₱{total}</Text>
            </View>

            {/* Actions */}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelConfirm}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handlePlaceOrder}
                disabled={placing}
              >
                <Text style={styles.modalConfirmText}>
                  {placing ? "Placing…" : "Place Order"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    maxHeight: "85%",
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

  // ─── Order Method Toggle ───
  methodRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  methodBtnActive: {
    backgroundColor: PRIMARY,
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  methodBtnTextActive: {
    color: "#fff",
  },

  // ─── Address Section ───
  addressSection: {
    marginBottom: 14,
  },
  addressLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  addressLoadingText: {
    fontSize: 13,
    color: "#6b7280",
  },
  addressWarning: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  addressWarningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },
  addressWarningText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
  },
  addressWarningSubtext: {
    fontSize: 11,
    color: "#f87171",
  },
  setAddressBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  setAddressBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  addressOk: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  addressOkTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 2,
  },
  addressOkStreet: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065f46",
  },
  addressOkDetail: {
    fontSize: 12,
    color: "#047857",
  },
  changeAddrLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065f46",
    textDecorationLine: "underline",
    marginTop: 4,
  },

  modalScroll: {
    paddingHorizontal: 20,
    maxHeight: 320,
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
  modalConfirmBtnDisabled: {
    opacity: 0.4,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  modalConfirmTextDisabled: {
    color: "#fff",
  },

  // ─── Confirmation Prompt Modal ───
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmSheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxHeight: "80%",
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1f2937",
  },
  confirmBadgeRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  confirmBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmBadgeDelivery: {
    backgroundColor: "#fff7ed",
  },
  confirmBadgePickup: {
    backgroundColor: "#ecfdf5",
  },
  confirmBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  confirmAddressWrap: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  confirmAddressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    marginBottom: 2,
  },
  confirmAddressStreet: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  confirmAddressDetail: {
    fontSize: 12,
    color: "#6b7280",
  },
  confirmItemsScroll: {
    maxHeight: 240,
    paddingHorizontal: 20,
  },
  confirmItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 8,
  },
  confirmItemLeft: {
    flex: 1,
  },
  confirmItemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confirmItemQty: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ca3af",
    minWidth: 24,
  },
  confirmItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
  },
  confirmItemNote: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginLeft: 30,
    marginTop: 2,
  },
  confirmItemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },
  confirmTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginTop: 4,
  },
  confirmTotalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0a0a0a",
  },
  confirmTotalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: PRIMARY,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
});