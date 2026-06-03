import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useMemo, useCallback } from "react";
import {
  PRIMARY,
  MENU_ITEMS,
  type Category,
  type MenuItem,
} from "@/lib/menu-data";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

// ─── Static Image Map ───────────────────────────────────────────
const IMAGES: Record<string, ImageSourcePropType> = {
  placeholder: require("../assets/images/placeholder.png"),
};

const getItemImage = (imageKey: string): ImageSourcePropType =>
  IMAGES[imageKey] ?? IMAGES.placeholder;

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "silog", label: "Silog" },
  { key: "drinks", label: "Drinks" },
  { key: "addons", label: "Add-ons" },
];

// ─── Card Dimensions ────────────────────────────────────────────
function useGridLayout() {
  const { width } = useWindowDimensions();
  const horizontalPadding = 16;
  const gap = 10;
  const availableWidth = width - horizontalPadding * 2;

  // Responsive columns: phone (2), tablet portrait (3), tablet landscape (4+)
  const numColumns = availableWidth < 360 ? 2 : availableWidth < 600 ? 3 : availableWidth < 900 ? 4 : 5;
  const cardWidth = (availableWidth - gap * (numColumns - 1)) / numColumns;

  return { numColumns, cardWidth, gap };
}

// ─── Menu Item Card ─────────────────────────────────────────────
const MenuCard = ({
  item,
  cardWidth,
  gap,
  onPress,
}: {
  item: MenuItem;
  cardWidth: number;
  gap: number;
  onPress: (item: MenuItem) => void;
}) => {
  const imageHeight = cardWidth * 0.85;
  const { addToCart } = useCart();

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth, marginBottom: gap }]}
      activeOpacity={0.85}
      onPress={() => onPress(item)}
    >
      <View>
        <Image
          source={getItemImage(item.image)}
          style={[styles.cardImage, { width: cardWidth, height: imageHeight }]}
          resizeMode="cover"
        />
        {item.stock <= 5 && item.stock > 0 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>
              {item.stock} left
            </Text>
          </View>
        )}
        {item.stock === 0 && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>Sold Out</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardPrice}>₱{item.price}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} 
          activeOpacity={0.7} 
          onPress={() => addToCart({
              id: item.id,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: 1,
              note: "",
              stock: item.stock,
          })
          }>
          <Text style={styles.addBtnText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ────────────────────────────────────────────────
export default function MenuScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const { numColumns, cardWidth, gap } = useGridLayout();

  const filteredItems = useMemo(
    () =>
      activeCategory === "all"
        ? MENU_ITEMS
        : MENU_ITEMS.filter((item) => item.category === activeCategory),
    [activeCategory]
  );

  const handleItemPress = useCallback(
    (item: MenuItem) => {
      router.push({ pathname: "/menu-item", params: { id: item.id } });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: MenuItem }) => (
      <MenuCard
        item={item}
        cardWidth={cardWidth}
        gap={gap}
        onPress={handleItemPress}
      />
    ),
    [cardWidth, gap, handleItemPress]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.categoriesWrap}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(cat) => cat.key}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item: cat }) => {
            const active = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryBtn, active && styles.categoryBtnActive]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    active && styles.categoryBtnTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    ),
    [activeCategory]
  );

  const key = useMemo(
    () => `grid-${numColumns}-${cardWidth.toFixed(0)}`,
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
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ─── Menu Grid ─── */}
      <FlatList
        key={key}
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.gridContent,
          { paddingHorizontal: 16 },
        ]}
        columnWrapperStyle={numColumns > 1 ? { gap } : undefined}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No items in this category yet.</Text>
          </View>
        }
      />

      {/* ─── Floating Footer ─── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.footerIcon}>🏠</Text>
          <Text style={styles.footerLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn}>
          <Text style={styles.footerIconActive}>🍽️</Text>
          <Text style={styles.footerLabelActive}>Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.push("/cart")}
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
          onPress={() => router.push("/orders")}
        >
          <Text style={styles.footerIcon}>📋</Text>
          <Text style={styles.footerLabel}>Orders</Text>
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

  // ─── Categories ───
  categoriesWrap: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
  },
  categoriesList: {
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  categoryBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  categoryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  categoryBtnTextActive: {
    color: "#fff",
  },

  // ─── Grid ───
  gridContent: {
    paddingBottom: 100,
    paddingTop: 4,
  },
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
    gap: 6,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    letterSpacing: -0.3,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  ratingStar: {
    fontSize: 10,
    color: "#f59e0b",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
  },
  stockBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#dc2626",
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  addBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    marginTop: 2,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // ─── Empty State ───
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: "#9ca3af",
    fontWeight: "500",
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
