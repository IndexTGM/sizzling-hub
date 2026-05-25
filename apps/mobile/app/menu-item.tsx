import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useMemo } from "react";
import { PRIMARY, MENU_ITEMS, type MenuItem } from "@/lib/menu-data";
import { useCart } from "@/lib/cart-context";

// ─── Static Image Map ───────────────────────────────────────────
const IMAGES: Record<string, ImageSourcePropType> = {
  placeholder: require("../assets/images/placeholder.png"),
};

const getItemImage = (imageKey: string): ImageSourcePropType =>
  IMAGES[imageKey] ?? IMAGES.placeholder;

// ─── Star Renderer ──────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <View style={styles.starsRow}>
      {Array.from({ length: full }).map((_, i) => (
        <Text key={`f-${i}`} style={styles.starFull}>
          ★
        </Text>
      ))}
      {half && <Text style={styles.starHalf}>★</Text>}
      {Array.from({ length: empty }).map((_, i) => (
        <Text key={`e-${i}`} style={styles.starEmpty}>
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────
export default function MenuItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const item: MenuItem | undefined = useMemo(
    () => MENU_ITEMS.find((m) => m.id === id),
    [id]
  );

  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  if (!item) {
    return (
      <SafeAreaView style={styles.container} edges={["top","bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Item Not Found</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundText}>This item no longer exists.</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.replace("/menu")}
          >
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalPrice = item.price * quantity;
  const isSoldOut = item.stock === 0;
  const isLowStock = item.stock > 0 && item.stock <= 5;

  return (
    <SafeAreaView style={styles.container} edges={["top","bottom"]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Image ─── */}
          <View style={styles.imageWrap}>
            <Image
              source={getItemImage(item.image)}
              style={styles.image}
              resizeMode="cover"
            />
            {isSoldOut && (
              <View style={styles.soldOutOverlay}>
                <Text style={styles.soldOutText}>Sold Out</Text>
              </View>
            )}
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>
                  Only {item.stock} left
                </Text>
              </View>
            )}
          </View>

          {/* ─── Info Section ─── */}
          <View style={styles.infoSection}>
            <View style={styles.nameRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            </View>

            <Stars rating={item.rating} />

            <Text style={styles.price}>₱{item.price}</Text>

            <View style={styles.divider} />

            {/* ─── Description ─── */}
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{item.description}</Text>

            <View style={styles.divider} />

            {/* ─── Stock Info ─── */}
            <View style={styles.stockRow}>
              <Text style={styles.sectionLabel}>Availability</Text>
              <View
                style={[
                  styles.stockPill,
                  isSoldOut
                    ? styles.stockPillOut
                    : isLowStock
                      ? styles.stockPillLow
                      : styles.stockPillOk,
                ]}
              >
                <Text
                  style={[
                    styles.stockPillText,
                    isSoldOut
                      ? styles.stockPillTextOut
                      : isLowStock
                        ? styles.stockPillTextLow
                        : styles.stockPillTextOk,
                  ]}
                >
                  {isSoldOut
                    ? "Out of stock"
                    : `${item.stock} in stock`}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ─── Quantity Selector ─── */}
            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={[
                  styles.qtyBtn,
                  quantity <= 1 && styles.qtyBtnDisabled,
                ]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Text
                  style={[
                    styles.qtyBtnText,
                    quantity <= 1 && styles.qtyBtnTextDisabled,
                  ]}
                >
                  −
                </Text>
              </TouchableOpacity>

              <Text style={styles.qtyValue}>{quantity}</Text>

              <TouchableOpacity
                style={[
                  styles.qtyBtn,
                  quantity >= item.stock && styles.qtyBtnDisabled,
                ]}
                onPress={() =>
                  setQuantity((q) => Math.min(item.stock, q + 1))
                }
                disabled={quantity >= item.stock}
              >
                <Text
                  style={[
                    styles.qtyBtnText,
                    quantity >= item.stock && styles.qtyBtnTextDisabled,
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* ─── Order Note ─── */}
            <Text style={styles.sectionLabel}>Order Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="e.g., less ice, no onions, extra spicy..."
              placeholderTextColor="#9ca3af"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.noteCharCount}>{note.length}/200</Text>
          </View>
        </ScrollView>

      </KeyboardAvoidingView>

      {/* ─── Bottom Bar ─── */}
      <View style={styles.bottomBar}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>₱{totalPrice}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, isSoldOut && styles.addToCartBtnDisabled]}
          activeOpacity={0.8}
          disabled={isSoldOut}
          onPress={() => {
            addToCart({
              id: item.id,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity,
              note,
              stock: item.stock,
            });
            router.back();
          }}
        >
          <Text
            style={[
              styles.addToCartText,
              isSoldOut && styles.addToCartTextDisabled,
            ]}
          >
            {isSoldOut ? "Unavailable" : `Add ${quantity} to Cart`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
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
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: -0.5,
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 36,
  },

  // ─── Not Found ───
  notFoundWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  browseBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // ─── Scroll ───
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ─── Image ───
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 260,
    backgroundColor: "#e5e7eb",
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
  },
  lowStockBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },

  // ─── Info Section ───
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingStar: {
    fontSize: 14,
    color: "#f59e0b",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400e",
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  starFull: {
    fontSize: 18,
    color: "#f59e0b",
  },
  starHalf: {
    fontSize: 18,
    color: "#f59e0b",
    opacity: 0.5,
  },
  starEmpty: {
    fontSize: 18,
    color: "#d1d5db",
  },
  price: {
    fontSize: 26,
    fontWeight: "800",
    color: PRIMARY,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockPillOk: {
    backgroundColor: "#ecfdf5",
  },
  stockPillLow: {
    backgroundColor: "#fef2f2",
  },
  stockPillOut: {
    backgroundColor: "#f3f4f6",
  },
  stockPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  stockPillTextOk: {
    color: "#065f46",
  },
  stockPillTextLow: {
    color: "#dc2626",
  },
  stockPillTextOut: {
    color: "#9ca3af",
  },

  // ─── Quantity ───
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  qtyBtnTextDisabled: {
    color: "#9ca3af",
  },
  qtyValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    minWidth: 28,
    textAlign: "center",
  },

  // ─── Bottom Bar ───
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 12,
  },
  totalWrap: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: PRIMARY,
  },
  addToCartBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    flex: 1,
    alignItems: "center",
  },
  addToCartBtnDisabled: {
    backgroundColor: "#e5e7eb",
  },
  addToCartText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  addToCartTextDisabled: {
    color: "#9ca3af",
  },

  // ─── Note Input ───
  noteInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    minHeight: 80,
    lineHeight: 20,
  },
  noteCharCount: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9ca3af",
    textAlign: "right",
    marginTop: -4,
  },
});
