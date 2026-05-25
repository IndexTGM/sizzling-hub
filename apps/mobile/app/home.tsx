import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useRef, useState, useCallback, useMemo, memo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

const PRIMARY = "#dc2626";
const AMBER = "#f59e0b";
const GREEN = "#10b981";

// ─── Static Image Map ───────────────────────────────────────────
const IMAGES: Record<string, ImageSourcePropType> = {
  placeholder: require("../assets/images/placeholder.png"),
  logo: require("../assets/images/logo.png"),
};
const getImage = (key: string) => IMAGES[key] ?? IMAGES.placeholder;

// ─── Banner Data ────────────────────────────────────────────────
interface Banner {
  id: string;
  type: "featured" | "discount" | "announcement";
  title: string;
  subtitle: string;
  image: string;
  tag?: string;
  color: string;
  accentColor: string;
}

const BANNERS: Banner[] = [
  {
    id: "1",
    type: "featured",
    title: "Sisilog",
    subtitle: "Our #1 Best Seller — sizzling pork sisig on garlic rice with a runny egg",
    image: "sisilog",
    tag: "BEST SELLER",
    color: "#fef2f2",
    accentColor: PRIMARY,
  },
  {
    id: "2",
    type: "discount",
    title: "20% OFF",
    subtitle: "On all Silog meals every Monday! Start your week right.",
    image: "tapsilog",
    tag: "MONDAY MADNESS",
    color: "#fffbeb",
    accentColor: AMBER,
  },
  {
    id: "3",
    type: "discount",
    title: "Buy 1 Get 1",
    subtitle: "Iced Tea — every Friday from 2PM to 5PM. Stay refreshed!",
    image: "icedtea",
    tag: "HAPPY HOUR",
    color: "#eff6ff",
    accentColor: "#3b82f6",
  },
];

// ─── Must Try / Most Ordered ────────────────────────────────────
const MUST_TRY = ["1","8","4","10","5","26"]; // Tapsilog, Sisilog, Bangsilog, Adobosilog, Chicksilog, Mango Shake

// ─── Menu Data Quick Access ─────────────────────────────────────
import { MENU_ITEMS } from "@/lib/menu-data";

// ─── Dot Indicator ──────────────────────────────────────────────
function Dots({ total, active }: { total: number; active: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Responsive Grid Layout ─────────────────────────────────────
function useItemGrid() {
  const { width } = useWindowDimensions();
  const horizontalPadding = 16;
  const gap = 10;
  const availableWidth = width - horizontalPadding * 2;

  const numColumns =
    availableWidth < 360 ? 2 : availableWidth < 600 ? 3 : availableWidth < 900 ? 4 : 5;
  const cardWidth = (availableWidth - gap * (numColumns - 1)) / numColumns;

  return { numColumns, cardWidth, gap };
}

// ─── Item Card (responsive grid) ────────────────────────────────
const ItemCard = memo(function ItemCard({
  id,
  cardWidth,
  gap,
}: {
  id: string;
  cardWidth: number;
  gap: number;
}) {
  const router = useRouter();
  const item = useMemo(() => MENU_ITEMS.find((m) => m.id === id), [id]);
  if (!item) return null;

  const imgHeight = cardWidth * 0.85;

  return (
    <TouchableOpacity
      style={[styles.itemCard, { width: cardWidth, marginBottom: gap }]}
      activeOpacity={0.85}
      onPress={() =>
        router.push({ pathname: "/menu-item", params: { id: item.id } })
      }
    >
      <Image
        source={getImage(item.image)}
        style={[styles.itemCardImg, { width: cardWidth, height: imgHeight }]}
        resizeMode="cover"
      />
      <View style={styles.itemCardBody}>
        <Text style={styles.itemCardName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.itemCardRow}>
          <Text style={styles.itemCardPrice}>₱{item.price}</Text>
          <View style={styles.itemCardRating}>
            <Text style={styles.itemCardStar}>★</Text>
            <Text style={styles.itemCardRatingNum}>{item.rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main Screen ────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { width: screenWidth } = useWindowDimensions();
  const { numColumns: itemCols, cardWidth: itemCardW, gap: itemGap } = useItemGrid();
  const itemGridKey = useMemo(
    () => `home-items-${itemCols}-${itemCardW.toFixed(0)}`,
    [itemCols, itemCardW]
  );
  const bannerRef = useRef<FlatList<Banner>>(null);
  const [activeBanner, setActiveBanner] = useState(0);

  const ItemGrid = useCallback(
    () => (
      <FlatList
        key={itemGridKey}
        data={MUST_TRY}
        numColumns={itemCols}
        keyExtractor={(id) => id}
        columnWrapperStyle={itemCols > 1 ? { gap: itemGap } : undefined}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        scrollEnabled={false}
        renderItem={({ item: id }) => (
          <ItemCard id={id} cardWidth={itemCardW} gap={itemGap} />
        )}
      />
    ),
    [itemGridKey, itemCols, itemCardW, itemGap]
  );

  const onBannerScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
      setActiveBanner(idx);
    },
    [screenWidth]
  );

  const renderBannerItem = useCallback(
    ({ item }: { item: Banner }) => (
      <View style={{ width: screenWidth, paddingHorizontal: 14 }}>
        <View style={[styles.bannerCard, { backgroundColor: item.color }]}>
          <View style={styles.bannerText}>
            {item.tag && (
              <View
                style={[styles.bannerTag, { backgroundColor: item.accentColor }]}
              >
                <Text style={styles.bannerTagText}>{item.tag}</Text>
              </View>
            )}
            <Text style={styles.bannerTitle}>{item.title}</Text>
            <Text style={styles.bannerSubtitle} numberOfLines={3}>
              {item.subtitle}
            </Text>
            <TouchableOpacity
              style={[styles.bannerBtn, { backgroundColor: item.accentColor }]}
              onPress={() => router.push("/menu")}
              activeOpacity={0.8}
            >
              <Text style={styles.bannerBtnText}>Order Now</Text>
            </TouchableOpacity>
          </View>
          <Image
            source={getImage(item.image)}
            style={styles.bannerImg}
            resizeMode="cover"
          />
        </View>
      </View>
    ),
    [screenWidth, router]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={IMAGES.logo}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>SIZZLING HUB</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push("/profile")}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── Scrollable Content ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Swipeable Banner Carousel ─── */}
        <View style={styles.bannerSection}>
          <FlatList
            ref={bannerRef}
            data={BANNERS}
            horizontal
            snapToInterval={screenWidth}
            snapToAlignment="center"
            decelerationRate="fast"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            keyExtractor={(b) => b.id}
            renderItem={renderBannerItem}
            onScroll={onBannerScroll}
            scrollEventThrottle={16}
          />
          <Dots total={BANNERS.length} active={activeBanner} />
        </View>

        {/* ─── Quick Categories ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoryRow}>
            {(
              [
                { icon: "🍳", label: "Silog", route: "/menu" as const },
                { icon: "🥤", label: "Drinks", route: "/menu" as const },
                { icon: "🍚", label: "Add-ons", route: "/menu" as const },
                { icon: "🔥", label: "Best Seller", route: "/menu" as const },
              ] as const
            ).map((cat) => (
              <TouchableOpacity
                key={cat.label}
                style={styles.categoryBtn}
                activeOpacity={0.7}
                onPress={() => router.push(cat.route)}
              >
                <View style={styles.categoryIconWrap}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Most Ordered Grid ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleNoPad}>Most Ordered</Text>
            <TouchableOpacity onPress={() => router.push("/menu")}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ItemGrid />
        </View>

        {/* ─── Bottom Spacer for Footer ─── */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Floating Footer ─── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn}>
          <Text style={styles.footerIconActive}>🏠</Text>
          <Text style={styles.footerLabelActive}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.push("/menu")}
        >
          <Text style={styles.footerIcon}>🍽️</Text>
          <Text style={styles.footerLabel}>Menu</Text>
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

        {user?.role === "admin" && (
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: -0.5,
  },
  profileBtn: {
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // ─── Scroll ───
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },

  // ─── Banner Carousel ───
  bannerSection: {
    paddingTop: 10,
    paddingBottom: 6,
  },
  bannerCard: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    gap: 12,
    alignItems: "center",
  },
  bannerText: {
    flex: 1,
    gap: 8,
  },
  bannerTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bannerTagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1f2937",
    letterSpacing: -0.5,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4b5563",
    lineHeight: 18,
  },
  bannerBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  bannerBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  bannerImg: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: PRIMARY,
    width: 20,
  },
  dotInactive: {
    backgroundColor: "#d1d5db",
  },

  // ─── Section ───
  section: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1f2937",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleNoPad: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1f2937",
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },

  // ─── Categories ───
  categoryRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 10,
  },
  categoryBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },

  // ─── Item Card ───
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  itemCardImg: {
    backgroundColor: "#f3f4f6",
  },
  itemCardBody: {
    padding: 10,
    gap: 5,
  },
  itemCardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    letterSpacing: -0.3,
  },
  itemCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemCardPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
  },
  itemCardRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  itemCardStar: {
    fontSize: 9,
    color: AMBER,
  },
  itemCardRatingNum: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
  },

  // ─── Announcement Card ───
  announceCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  announceIcon: {
    fontSize: 36,
  },
  announceTextWrap: {
    flex: 1,
    gap: 2,
  },
  announceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
  },
  announceSub: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
    lineHeight: 17,
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