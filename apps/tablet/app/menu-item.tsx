import {
  StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, TextInput,
  useWindowDimensions, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart-context";
import { getImageCandidates } from "@/lib/storage";

const PRIMARY = "#dc2626";
const AMBER = "#f59e0b";
const PLACEHOLDER = "placeholder.png";

/* ──────────────────────────── Storage Image ───────────────────── */
function StorageImg({ imageBase, style, resizeMode }: { imageBase: string; style: any; resizeMode?: "cover" | "contain" }) {
  const [tryIdx, setTryIdx] = useState(0);
  const candidates = useMemo(() => [...getImageCandidates(imageBase), PLACEHOLDER], [imageBase]);
  return (
    <Image source={{ uri: candidates[tryIdx] || PLACEHOLDER }} style={style} resizeMode={resizeMode || "cover"}
      onError={() => { if (tryIdx < candidates.length - 1) setTryIdx(tryIdx + 1); }} />
  );
}

/* ──────────────────────────── Stars ───────────────────────────── */
function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: full }).map((_, i) => <Text key={`f${i}`} style={styles.starFull}>★</Text>)}
      {half && <Text style={styles.starHalf}>★</Text>}
      {Array.from({ length: empty }).map((_, i) => <Text key={`e${i}`} style={styles.starEmpty}>★</Text>)}
    </View>
  );
}

/* ──────────────────────────── Review Item ─────────────────────── */
function ReviewRow({ review }: { review: { id: string; customerName: string; rating: number; comment: string | null; createdAt: string } }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewName}>{review.customerName}</Text>
        <View style={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Text key={s} style={{ fontSize: 12, color: s <= review.rating ? AMBER : "#d1d5db" }}>★</Text>
          ))}
        </View>
      </View>
      {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
      <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
    </View>
  );
}

/* ──────────────────────────── Main Screen ─────────────────────── */
export default function MenuItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart } = useCart();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [item, setItem] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [fullImg, setFullImg] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase.from("menu_items").select("id, name, price, image_url, stock, description, menu_item_categories(categories(name))").eq("id", id).maybeSingle();
      if (row) {
        const junction = (row as any).menu_item_categories;
        const catNames: string[] = Array.isArray(junction)
          ? junction.map((j: any) => j.categories?.name || "Uncategorized")
          : ["Uncategorized"];
        setItem({
          id: row.id, name: row.name, price: row.price, imageName: row.image_url || "",
          stock: row.stock ?? 0, description: row.description || "",
          category: catNames[0] || "Uncategorized",
          categories: catNames,
        });

        // Fetch reviews
        const { data: revData } = await supabase.from("reviews").select("id, rating, comment, created_at, profiles:customer_id(full_name)").eq("menu_item_id", row.id).order("created_at", { ascending: false }).limit(20);
        if (revData) {
          setReviews(revData.map((r: any) => ({
            id: r.id, customerName: r.profiles?.full_name || "Anonymous",
            rating: r.rating, comment: r.comment, createdAt: r.created_at,
          })));
          if (revData.length > 0) setAvgRating(revData.reduce((s: number, r: any) => s + r.rating, 0) / revData.length);
        }
        // Also get rating from RPC
        try {
          const { data: rpcRating } = await supabase.rpc("recalc_menu_item_rating", { p_menu_item_id: row.id });
          if (rpcRating != null) setAvgRating(Number(rpcRating));
        } catch {}
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Loading…</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.loadingWrap}><ActivityIndicator size="large" color={PRIMARY} /></View>
    </SafeAreaView>
  );

  if (!item) return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Not Found</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.notFoundWrap}>
        <Text style={styles.notFoundText}>Item not found.</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace("/menu")}><Text style={styles.browseBtnText}>Browse Menu</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const soldOut = item.stock <= 0;
  const lowStock = item.stock > 0 && item.stock <= 5;
  const totalPrice = item.price * qty;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Text style={styles.backIcon}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Image */}
          <TouchableOpacity style={styles.imageWrap} onPress={() => setFullImg(true)} activeOpacity={0.9}>
            <StorageImg imageBase={item.imageName} style={styles.image} />
            {soldOut && <View style={styles.soldOutOverlay}><Text style={styles.soldOutText}>Sold Out</Text></View>}
            {lowStock && <View style={styles.lowStockBadge}><Text style={styles.lowStockText}>Only {item.stock} left</Text></View>}
            <View style={styles.imageHint}><Text style={styles.imageHintText}>Tap to view full</Text></View>
          </TouchableOpacity>

          <View style={styles.infoSection}>
            {/* Name + Rating */}
            <View style={styles.nameRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
              </View>
            </View>
            <Stars rating={avgRating} />
            <Text style={styles.price}>₱{item.price}</Text>

            <View style={styles.divider} />

            {/* Description */}
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{item.description || "No description available."}</Text>

            <View style={styles.divider} />

            {/* Stock */}
            <View style={styles.stockRow}>
              <Text style={styles.sectionLabel}>Availability</Text>
              <View style={[styles.stockPill, soldOut ? styles.stockPillOut : lowStock ? styles.stockPillLow : styles.stockPillOk]}>
                <Text style={[styles.stockPillText, soldOut ? styles.stockPillTextOut : lowStock ? styles.stockPillTextLow : styles.stockPillTextOk]}>
                  {soldOut ? "Out of stock" : `${item.stock} in stock`}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Quantity */}
            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={[styles.qtyBtn, qty <= 1 && styles.qtyBtnDisabled]} onPress={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                <Text style={[styles.qtyBtnText, qty <= 1 && styles.qtyBtnTextDisabled]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity style={[styles.qtyBtn, qty >= item.stock && styles.qtyBtnDisabled]} onPress={() => setQty((q) => Math.min(item.stock, q + 1))} disabled={qty >= item.stock}>
                <Text style={[styles.qtyBtnText, qty >= item.stock && styles.qtyBtnTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Note */}
            <Text style={styles.sectionLabel}>Order Note (optional)</Text>
            <TextInput style={styles.noteInput} placeholder="e.g., less ice, no onions…" placeholderTextColor="#9ca3af"
              value={note} onChangeText={setNote} multiline maxLength={200} textAlignVertical="top" />
            <Text style={styles.noteCount}>{note.length}/200</Text>

            <View style={styles.divider} />

            {/* Reviews */}
            <Text style={styles.sectionLabel}>Reviews ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet.</Text>
            ) : (
              reviews.map((r) => <ReviewRow key={r.id} review={r} />)
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>₱{totalPrice}</Text>
        </View>
        <TouchableOpacity style={[styles.addToCartBtn, soldOut && styles.addToCartBtnDisabled]} activeOpacity={0.8} disabled={soldOut}
          onPress={() => {
            addToCart({ id: item.id, name: item.name, price: item.price, image: item.imageName, quantity: qty, note, stock: item.stock });
            router.back();
          }}>
          <Text style={[styles.addToCartText, soldOut && styles.addToCartTextDisabled]}>
            {soldOut ? "Unavailable" : `Add ${qty} to Cart`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen Image Modal */}
      <Modal visible={fullImg} transparent animationType="fade" onRequestClose={() => setFullImg(false)}>
        <TouchableOpacity style={styles.fullImgOverlay} activeOpacity={1} onPress={() => setFullImg(false)}>
          <StorageImg imageBase={item.imageName} style={{ width: screenW * 0.95, height: screenH * 0.7, borderRadius: 16 }} resizeMode="contain" />
          <Text style={styles.fullImgClose}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

/* ──────────────────────────── Styles ──────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 18, fontWeight: "700", color: "#374151" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: PRIMARY, letterSpacing: -0.5, marginHorizontal: 8 },
  headerSpacer: { width: 36 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  notFoundText: { fontSize: 16, color: "#9ca3af" },
  browseBtn: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  imageWrap: { position: "relative" },
  image: { width: "100%", height: 260, backgroundColor: "#e5e7eb" },
  imageHint: { position: "absolute", bottom: 8, right: 12, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  imageHintText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  soldOutOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  soldOutText: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: 2 },
  lowStockBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "#fef2f2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  lowStockText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  infoSection: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  itemName: { flex: 1, fontSize: 22, fontWeight: "800", color: "#1f2937" },
  ratingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  ratingStar: { fontSize: 14, color: AMBER },
  ratingText: { fontSize: 14, fontWeight: "800", color: "#92400e" },
  starsRow: { flexDirection: "row", gap: 2 },
  starFull: { fontSize: 18, color: AMBER },
  starHalf: { fontSize: 18, color: AMBER, opacity: 0.5 },
  starEmpty: { fontSize: 18, color: "#d1d5db" },
  price: { fontSize: 26, fontWeight: "800", color: PRIMARY },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 4 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  description: { fontSize: 15, color: "#4b5563", lineHeight: 22 },
  stockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stockPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  stockPillOk: { backgroundColor: "#ecfdf5" },
  stockPillLow: { backgroundColor: "#fef2f2" },
  stockPillOut: { backgroundColor: "#f3f4f6" },
  stockPillText: { fontSize: 12, fontWeight: "700" },
  stockPillTextOk: { color: "#065f46" },
  stockPillTextLow: { color: "#dc2626" },
  stockPillTextOut: { color: "#9ca3af" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyBtnText: { fontSize: 20, fontWeight: "700", color: "#1f2937" },
  qtyBtnTextDisabled: { color: "#9ca3af" },
  qtyValue: { fontSize: 20, fontWeight: "800", color: "#1f2937", minWidth: 28, textAlign: "center" },
  noteInput: { backgroundColor: "#f9fafb", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: "500", color: "#1f2937", minHeight: 70, lineHeight: 20 },
  noteCount: { fontSize: 11, fontWeight: "500", color: "#9ca3af", textAlign: "right", marginTop: -4 },
  noReviews: { fontSize: 14, color: "#9ca3af", textAlign: "center", paddingVertical: 12 },
  reviewCard: { backgroundColor: "#f9fafb", borderRadius: 10, padding: 12, gap: 6 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewName: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  reviewStars: { flexDirection: "row", gap: 1 },
  reviewComment: { fontSize: 13, color: "#4b5563", lineHeight: 19 },
  reviewDate: { fontSize: 11, color: "#9ca3af" },
  bottomBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingBottom: 30, gap: 12 },
  totalWrap: { flex: 1 },
  totalLabel: { fontSize: 12, fontWeight: "600", color: "#9ca3af", textTransform: "uppercase" },
  totalPrice: { fontSize: 22, fontWeight: "800", color: PRIMARY },
  addToCartBtn: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, flex: 1, alignItems: "center" },
  addToCartBtnDisabled: { backgroundColor: "#e5e7eb" },
  addToCartText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  addToCartTextDisabled: { color: "#9ca3af" },
  fullImgOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", gap: 16 },
  fullImgClose: { color: "#fff", fontSize: 13, fontWeight: "600", opacity: 0.6 },
});