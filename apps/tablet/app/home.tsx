import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useRef, useState, useEffect, useCallback } from "react";
import { useCart } from "@/lib/cart-context";
import { getImageUrl, getImageCandidates } from "@/lib/storage";
import { useBanners } from "@/lib/banner-context";

const PRIMARY = "#dc2626";
const PLACEHOLDER = getImageUrl("placeholder.png");
const LOGO_URL = getImageUrl("logo.png");
const BANNER_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899",
];

// ═══════════════════════════════════════════════════════════════
//  Storage Image (loads from Supabase, falls back to placeholder)
// ═══════════════════════════════════════════════════════════════
function StorageImg({ imageBase, style, resizeMode }: { imageBase: string; style: any; resizeMode?: "cover" | "contain" }) {
  const [candidates, setCandidates] = useState<string[]>([PLACEHOLDER]);
  const [tryIdx, setTryIdx] = useState(0);

  useEffect(() => {
    setTryIdx(0);
    setCandidates([...getImageCandidates(imageBase), PLACEHOLDER]);
  }, [imageBase]);

  const handleError = () => {
    if (tryIdx < candidates.length - 1) {
      setTryIdx(tryIdx + 1);
    }
  };

  return (
    <Image
      source={{ uri: candidates[tryIdx] }}
      style={style}
      resizeMode={resizeMode || "cover"}
      onError={handleError}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
//  Banner Carousel
// ═══════════════════════════════════════════════════════════════
function BannerCarousel({ banners, onOrderNow }: { banners: { id: string; title: string; subtitle: string; image: string; tag: string | null }[]; onOrderNow: () => void }) {
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  return (
    <View style={styles.bannerSection}>
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
              <View style={[styles.bannerCard, { backgroundColor: accent }]}>
                <View style={styles.bannerText}>
                  {b.tag && (
                    <View style={styles.bannerTag}>
                      <Text style={styles.bannerTagText}>{b.tag}</Text>
                    </View>
                  )}
                  <Text style={styles.bannerTitle}>{b.title}</Text>
                  <Text style={styles.bannerSubtitle} numberOfLines={3}>{b.subtitle}</Text>
                  <TouchableOpacity
                    style={styles.bannerBtn}
                    onPress={onOrderNow}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bannerBtnText, { color: accent }]}>Order Now →</Text>
                  </TouchableOpacity>
                </View>
                <StorageImg imageBase={b.image} style={styles.bannerImg} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
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
                styles.dot,
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

// ═══════════════════════════════════════════════════════════════
//  Top #1 Ordered
// ═══════════════════════════════════════════════════════════════
function TopOrdered({ onOrderNow }: { onOrderNow: () => void }) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top #1 Ordered</Text>
        <View style={styles.titleBar} />
      </View>

      <View style={styles.topCard}>
        <View style={styles.topCardInner}>
          <View style={styles.trophyWrap}>
            <View style={styles.trophyCircle}>
              <Text style={styles.trophyEmoji}>🏆</Text>
              <Text style={styles.trophyLabel}>#1</Text>
            </View>
          </View>

          <View style={styles.topCardContent}>
            <View style={styles.topTag}>
              <Text style={styles.topTagText}>ALL-TIME FAVORITE</Text>
            </View>
            <Text style={styles.topTitle}>Tapsilog</Text>
            <Text style={styles.topSubtitle}>
              The undisputed king of our menu. Tender beef tapa marinated to perfection, served on garlic rice with a perfectly fried egg. The dish that started it all — and the one our customers can't get enough of.
            </Text>
            <View style={styles.topPriceRow}>
              <Text style={styles.topPrice}>₱109</Text>
              <Text style={styles.topPriceOld}>₱129</Text>
              <View style={styles.topSaveBadge}>
                <Text style={styles.topSaveText}>SAVE ₱20</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.topBtn} onPress={onOrderNow} activeOpacity={0.8}>
              <Text style={styles.topBtnText}>Order Now →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Our Story
// ═══════════════════════════════════════════════════════════════
function OurStory() {
  const candidates = getImageCandidates("story_background");
  const [storyIdx, setStoryIdx] = useState(0);
  const [storySrc, setStorySrc] = useState(candidates[0]);

  const handleStoryError = () => {
    if (storyIdx < candidates.length - 1) {
      const next = storyIdx + 1;
      setStoryIdx(next);
      setStorySrc(candidates[next]);
    } else {
      setStorySrc(PLACEHOLDER);
    }
  };

  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Our Story</Text>
        <View style={styles.titleBar} />
      </View>

      <View style={styles.storyCard}>
        <View style={styles.storyImgWrap}>
          <Image source={{ uri: storySrc }} style={styles.storyImg} resizeMode="cover" onError={handleStoryError} />
          <View style={styles.storyImgOverlay}>
            <Text style={styles.storyImgTitle}>Ben's Tapsihan</Text>
            <Text style={styles.storyImgSub}>Since 2003 — Serving comfort, one sizzling plate at a time.</Text>
          </View>
        </View>

        <View style={styles.storyBody}>
          <Text style={styles.storyText}>
            What started as a humble carinderia along the busy streets of Manila has grown into a beloved neighborhood institution. <Text style={styles.storyBold}>Ben's Tapsihan</Text> was born from a simple idea: serve hearty, affordable Filipino comfort food that brings people together.
          </Text>
          <Text style={styles.storyText}>
            Our founder, <Text style={styles.storyBold}>Kuya Ben</Text>, believed that the best meals are the ones shared with family and friends. He perfected the art of sizzling silog — garlic fried rice topped with a runny egg and your choice of tender, flavorful meat — all served on a cast-iron plate that crackles with excitement.
          </Text>
          <Text style={styles.storyText}>
            From our signature <Text style={{ color: PRIMARY, fontWeight: "700" }}>Tapsilog</Text> to the crowd-favorite <Text style={{ color: PRIMARY, fontWeight: "700" }}>Sisilog</Text>, every dish is made fresh to order using time-honored recipes passed down through generations. We source locally, cook with love, and serve with a smile — because that's the Filipino way.
          </Text>
          <Text style={styles.storyText}>
            Today, Ben's Tapsihan continues Kuya Ben's legacy. Whether you're a regular who's been with us since day one or a first-timer looking for your new favorite meal, you're family here. Come for the sizzle, stay for the flavor.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Main Home Screen
// ═══════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const router = useRouter();
  const { itemCount } = useCart();
  const { banners } = useBanners();

  const handleOrderNow = useCallback(() => {
    router.push("/menu");
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: LOGO_URL }} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>BEN'S TAPSIHAN</Text>
        </View>
        <View style={styles.walkInBadge}>
          <Text style={styles.walkInIcon}>🚶</Text>
          <Text style={styles.walkInText}>Walk In Customer</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {banners.length > 0 && <BannerCarousel banners={banners} onOrderNow={handleOrderNow} />}
        <TopOrdered onOrderNow={handleOrderNow} />
        <OurStory />
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Floating Footer ─── */}
      <View style={styles.footer}>
        <View style={styles.footerBtn}>
          <Text style={styles.footerIconActive}>🏠</Text>
          <Text style={styles.footerLabelActive}>Home</Text>
        </View>

        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/menu")}>
          <Text style={styles.footerIcon}>🍽️</Text>
          <Text style={styles.footerLabel}>Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn} onPress={() => router.push("/cart")}>
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
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 34, height: 34, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: PRIMARY, letterSpacing: -0.5 },
  walkInBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#bbf7d0",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  walkInIcon: { fontSize: 13 },
  walkInText: { fontSize: 12, fontWeight: "700", color: "#065f46" },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4 },

  // Banner
  bannerSection: { paddingTop: 10, paddingBottom: 6 },
  bannerCard: {
    flexDirection: "row", borderRadius: 18, padding: 18,
    overflow: "hidden", gap: 12, alignItems: "center",
  },
  bannerText: { flex: 1, gap: 8 },
  bannerTag: {
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  bannerTagText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  bannerTitle: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  bannerSubtitle: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.85)", lineHeight: 18 },
  bannerBtn: {
    alignSelf: "flex-start", paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 12, backgroundColor: "#fff", marginTop: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  bannerBtnText: { fontSize: 13, fontWeight: "700" },
  bannerImg: { width: 100, height: 100, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 12 },
  dot: { borderRadius: 5 },

  // Sections
  sectionWrap: { paddingTop: 8, paddingBottom: 8 },
  sectionHeader: { alignItems: "center", paddingVertical: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#1f2937", letterSpacing: -0.5 },
  titleBar: { width: 48, height: 3, borderRadius: 2, backgroundColor: PRIMARY, marginTop: 8 },

  // Top Ordered
  topCard: {
    marginHorizontal: 16, borderRadius: 18, overflow: "hidden",
    backgroundColor: PRIMARY, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  topCardInner: { flexDirection: "column", padding: 24, gap: 16 },
  trophyWrap: { alignItems: "center" },
  trophyCircle: {
    width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  trophyEmoji: { fontSize: 32 },
  trophyLabel: { color: "#fff", fontSize: 11, fontWeight: "800", marginTop: 2, letterSpacing: 1 },
  topCardContent: { alignItems: "center", gap: 10 },
  topTag: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: "rgba(250,204,21,0.2)", borderWidth: 1, borderColor: "rgba(250,204,21,0.3)",
  },
  topTagText: { color: "#fde047", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  topTitle: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  topSubtitle: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20 },
  topPriceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  topPrice: { fontSize: 24, fontWeight: "900", color: "#fff" },
  topPriceOld: { fontSize: 14, color: "rgba(255,255,255,0.5)", textDecorationLine: "line-through" },
  topSaveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "rgba(250,204,21,0.9)" },
  topSaveText: { fontSize: 10, fontWeight: "800", color: "#0a0a0a" },
  topBtn: {
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12,
    backgroundColor: "#fff", marginTop: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  topBtnText: { fontSize: 14, fontWeight: "700", color: PRIMARY },

  // Our Story
  storyCard: {
    marginHorizontal: 16, borderRadius: 18, overflow: "hidden",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  storyImgWrap: { height: 160, backgroundColor: "#f3f4f6" },
  storyImg: { width: "100%", height: "100%" },
  storyImgOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: "rgba(0,0,0,0.4)",
  },
  storyImgTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  storyImgSub: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  storyBody: { padding: 20, gap: 12 },
  storyText: { fontSize: 14, color: "#4b5563", lineHeight: 22 },
  storyBold: { fontWeight: "700", color: "#0a0a0a" },

  // Footer
  footer: {
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    marginHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#fff", borderRadius: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  footerBtn: { flex: 1, alignItems: "center", paddingVertical: 6, gap: 3 },
  footerIcon: { fontSize: 20 },
  footerIconActive: { fontSize: 20 },
  footerLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280" },
  footerLabelActive: { fontSize: 10, fontWeight: "700", color: PRIMARY },
  footerBadge: {
    position: "absolute", top: -4, right: -10,
    backgroundColor: PRIMARY, borderRadius: 9, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  footerBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});