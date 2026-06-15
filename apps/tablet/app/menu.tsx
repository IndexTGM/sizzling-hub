import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { useMenu } from "@/lib/menu-context";
import { getImageCandidates } from "@/lib/storage";
import { useBanners } from "@/lib/banner-context";

const PRIMARY = "#dc2626";
const AMBER = "#f59e0b";
const PLACEHOLDER = "placeholder.png";

/* ──────────────────────────── Storage Image ───────────────────── */
function StorageImg({ imageBase, style, resizeMode }: { imageBase: string; style: any; resizeMode?: "cover" | "contain" }) {
  const [tryIdx, setTryIdx] = useState(0);
  const candidates = useMemo(() => [...getImageCandidates(imageBase), PLACEHOLDER], [imageBase]);

  return (
    <Image
      source={{ uri: candidates[tryIdx] || PLACEHOLDER }}
      style={style}
      resizeMode={resizeMode || "cover"}
      onError={() => { if (tryIdx < candidates.length - 1) setTryIdx(tryIdx + 1); }}
    />
  );
}

/* ──────────────────────────── Grid Layout ─────────────────────── */
function useGridLayout() {
  const { width } = useWindowDimensions();
  const pad = 16, gap = 10;
  const available = width - pad * 2;
  const cols = available < 360 ? 2 : available < 600 ? 3 : available < 900 ? 4 : 5;
  return { cols, cardW: (available - gap * (cols - 1)) / cols, gap };
}

/* ──────────────────────────── Menu Card ───────────────────────── */
function MenuCard({ item, cardW, gap, onPress }: { item: any; cardW: number; gap: number; onPress: (item: any) => void }) {
  const { addToCart } = useCart();
  const soldOut = (item.stock ?? 0) <= 0;
  const imgH = cardW * 0.85;

  return (
    <TouchableOpacity style={[styles.card, { width: cardW, marginBottom: gap }]} activeOpacity={0.85} onPress={() => onPress(item)}>
      <View>
        <StorageImg imageBase={item.imageName} style={[styles.cardImg, { width: cardW, height: imgH }]} />
        {item.stock <= 5 && item.stock > 0 && (
          <View style={styles.stockBadge}><Text style={styles.stockBadgeText}>{item.stock} left</Text></View>
        )}
        {soldOut && (
          <View style={styles.soldOutOverlay}><Text style={styles.soldOutText}>Sold Out</Text></View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardPrice}>₱{item.price}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingText}>{(item.rating ?? 0).toFixed(1)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, soldOut && styles.addBtnDisabled]}
          activeOpacity={0.7}
          disabled={soldOut}
          onPress={() => addToCart({
            id: item.id, name: item.name, price: item.price,
            image: item.imageName, quantity: 1, note: "", stock: item.stock,
          })}
        >
          <Text style={[styles.addBtnText, soldOut && styles.addBtnTextDisabled]}>{soldOut ? "Sold Out" : "+ Add"}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/* ──────────────────────────── Banner Carousel ──────────────────── */
const BANNER_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899",
];

function BannerCarousel() {
  const { banners } = useBanners();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Banner height: ~12% of screen height, min 100, max 160
  const bannerHeight = Math.min(160, Math.max(100, screenHeight * 0.12));

  useEffect(() => {
    if (banners.length === 0) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screenWidth, banners.length]);

  const onScrollEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setActive(idx);
  }, [screenWidth]);

  if (banners.length === 0) return null;

  return (
    <View style={bannerStyles.section}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
      >
        {banners.map((b, i) => {
          const accent = BANNER_COLORS[i % BANNER_COLORS.length];
          return (
            <View key={b.id} style={{ width: screenWidth, paddingHorizontal: 12 }}>
              <View style={[bannerStyles.card, { backgroundColor: accent, height: bannerHeight }]}>
                <View style={bannerStyles.textWrap}>
                  {b.tag ? (
                    <View style={bannerStyles.tag}>
                      <Text style={bannerStyles.tagText}>{b.tag}</Text>
                    </View>
                  ) : null}
                  <Text style={bannerStyles.title}>{b.title}</Text>
                  <Text style={bannerStyles.subtitle} numberOfLines={3}>{b.subtitle}</Text>
                </View>
                {b.image ? (
                  <StorageImg imageBase={b.image} style={bannerStyles.img} />
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={bannerStyles.dotsRow}>
        {banners.map((_, i) => {
          const dotColor = BANNER_COLORS[i % BANNER_COLORS.length];
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setActive(i);
                scrollRef.current?.scrollTo({ x: i * screenWidth, animated: true });
              }}
              style={[
                bannerStyles.dot,
                i === active
                  ? { width: 32, height: 10, backgroundColor: dotColor }
                  : { width: 10, height: 10, backgroundColor: "#d1d5db" },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  section: { paddingTop: 10, paddingBottom: 6 },
  card: {
    flexDirection: "row", borderRadius: 16, padding: 14,
    overflow: "hidden", gap: 10, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  textWrap: { flex: 1, gap: 3 },
  tag: {
    alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 5, backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  tagText: { color: "#fff", fontSize: 8, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 16, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  subtitle: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.85)", lineHeight: 12 },
  img: { width: 72, height: 72, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 12 },
  dot: { borderRadius: 5 },
});

/* ──────────────────────────── Main Screen ─────────────────────── */
export default function MenuScreen() {
  const router = useRouter();
  const { itemCount } = useCart();
  const { menuItems, categories, loading } = useMenu();
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [showBanners, setShowBanners] = useState(true);
  const { cols, cardW, gap } = useGridLayout();
  const catListRef = useRef<FlatList>(null);
  const catScrollX = useRef(0);

  const displayCats = useMemo(() => [
    { key: "all", label: "All" },
    ...categories.map((c) => ({ key: c.name, label: c.name })),
  ], [categories]);

  const filtered = useMemo(() => {
    let items = activeCat === "all" ? menuItems : menuItems.filter((i) => i.categories?.includes(activeCat));
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, activeCat, search]);

  const handlePress = useCallback((item: any) => {
    router.push({ pathname: "/menu-item", params: { id: item.id } });
  }, [router]);

  const gridKey = useMemo(() => `menu-${cols}-${cardW.toFixed(0)}`, [cols, cardW]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity
          style={styles.bannerToggle}
          onPress={() => setShowBanners((p) => !p)}
          activeOpacity={0.7}
        >
          <Text style={styles.bannerToggleText}>{showBanners ? "📢" : "🔇"}</Text>
          <Text style={styles.bannerToggleLabel}>{showBanners ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      {/* Promotional Banners */}
      {showBanners && <BannerCarousel />}

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <FlatList
          key={gridKey}
          data={filtered}
          renderItem={({ item }) => <MenuCard item={item} cardW={cardW} gap={gap} onPress={handlePress} />}
          keyExtractor={(i) => i.id}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? { gap } : undefined}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search menu items…"
                placeholderTextColor="#9ca3af"
              />
              <FlatList
                ref={catListRef}
                data={displayCats}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(c) => c.key}
                contentContainerStyle={styles.catList}
                onScroll={(e) => { catScrollX.current = e.nativeEvent.contentOffset.x; }}
                scrollEventThrottle={16}
                onLayout={() => {
                  if (catScrollX.current > 0) {
                    catListRef.current?.scrollToOffset({ offset: catScrollX.current, animated: false });
                  }
                }}
                renderItem={({ item: c }) => {
                  const active = activeCat === c.key;
                  return (
                    <TouchableOpacity
                      style={[styles.catBtn, active && styles.catBtnActive]}
                      onPress={() => setActiveCat(c.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.catText, active && styles.catTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
          contentContainerStyle={[styles.gridContent, { paddingHorizontal: 16 }]}
          stickyHeaderIndices={[0]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}><Text style={styles.emptyText}>No items found.</Text></View>
          }
        />
      )}

      {/* Floating Cart Footer */}
      {itemCount > 0 && (
        <View style={styles.floatingFooter}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/cart")} activeOpacity={0.85}>
            <View>
              <Text style={styles.footerIcon}>🛒</Text>
              <View style={styles.footerBadge}>
                <Text style={styles.footerBadgeText}>{itemCount > 99 ? "99+" : itemCount}</Text>
              </View>
            </View>
            <Text style={styles.footerLabel}>Cart</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ──────────────────────────── Styles ──────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 18, fontWeight: "700", color: "#374151" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: PRIMARY, letterSpacing: -0.5 },
  headerSpacer: { width: 36 },
  bannerToggle: { width: 44, alignItems: "center", justifyContent: "center" },
  bannerToggleText: { fontSize: 16 },
  bannerToggleLabel: { fontSize: 8, fontWeight: "700", color: "#6b7280", marginTop: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listHeader: { backgroundColor: "#f5f5f5", paddingTop: 8, paddingBottom: 8 },
  searchInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#0a0a0a", marginBottom: 10 },
  catList: { gap: 8, paddingBottom: 4 },
  catBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e5e7eb" },
  catBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  catTextActive: { color: "#fff" },
  gridContent: { paddingBottom: 100, paddingTop: 0 },
  card: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardImg: { backgroundColor: "#f3f4f6" },
  cardBody: { padding: 10, gap: 6 },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: { fontSize: 13, fontWeight: "700", color: "#1f2937", letterSpacing: -0.3 },
  cardPrice: { fontSize: 14, fontWeight: "800", color: PRIMARY },
  ratingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 3 },
  ratingStar: { fontSize: 10, color: AMBER },
  ratingText: { fontSize: 11, fontWeight: "700", color: "#92400e" },
  stockBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "#fef2f2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  stockBadgeText: { fontSize: 10, fontWeight: "700", color: "#dc2626" },
  soldOutOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  soldOutText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 1 },
  addBtn: { backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 7, alignItems: "center", marginTop: 2 },
  addBtnDisabled: { backgroundColor: "#e5e7eb" },
  addBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  addBtnTextDisabled: { color: "#9ca3af" },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "500" },
  floatingFooter: {
    position: "absolute",
    bottom: 35,
    right: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 22,
    backgroundColor: "#fff",
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    zIndex: 100,
  },
  footerBtn: { alignItems: "center", gap: 3 },
  footerIcon: { fontSize: 20 },
  footerLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280" },
  footerBadge: {
    position: "absolute", top: -4, right: -10,
    backgroundColor: PRIMARY, borderRadius: 9, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  footerBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});