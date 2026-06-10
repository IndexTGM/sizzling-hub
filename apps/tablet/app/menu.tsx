import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useMemo, useCallback } from "react";
import { useCart } from "@/lib/cart-context";
import { useMenu } from "@/lib/menu-context";
import { getImageCandidates } from "@/lib/storage";

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

/* ──────────────────────────── Main Screen ─────────────────────── */
export default function MenuScreen() {
  const router = useRouter();
  const { menuItems, categories, loading } = useMenu();
  const { itemCount } = useCart();
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const { cols, cardW, gap } = useGridLayout();

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
        <View style={styles.headerSpacer} />
      </View>

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
                data={displayCats}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(c) => c.key}
                contentContainerStyle={styles.catList}
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

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn}>
          <Text style={styles.footerIconActive}>🍽️</Text><Text style={styles.footerLabelActive}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/cart")}>
          <View>
            <Text style={styles.footerIcon}>🛒</Text>
            {itemCount > 0 && <View style={styles.footerBadge}><Text style={styles.footerBadgeText}>{itemCount}</Text></View>}
          </View>
          <Text style={styles.footerLabel}>Cart</Text>
        </TouchableOpacity>
      </View>
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listHeader: { backgroundColor: "#f5f5f5", paddingTop: 12, paddingBottom: 8 },
  searchInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#0a0a0a", marginBottom: 10 },
  catList: { gap: 8, paddingBottom: 4 },
  catBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e5e7eb" },
  catBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  catTextActive: { color: "#fff" },
  gridContent: { paddingBottom: 100, paddingTop: 4 },
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
  footer: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderRadius: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: "#f3f4f6" },
  footerBtn: { flex: 1, alignItems: "center", paddingVertical: 6, gap: 3 },
  footerIcon: { fontSize: 20 },
  footerIconActive: { fontSize: 20 },
  footerLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280" },
  footerLabelActive: { fontSize: 10, fontWeight: "700", color: PRIMARY },
  footerBadge: { position: "absolute", top: -4, right: -10, backgroundColor: PRIMARY, borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  footerBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});