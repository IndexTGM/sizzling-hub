import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const PRIMARY = "#dc2626";
const AMBER = "#f59e0b";

/* ──────────────────────────── Profile Screen ──────────────────── */
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const [editUsername, setEditUsername] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // My Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditUsername(user.username || "");
      setEditFullName(user.fullName || "");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setReviewsLoading(true);
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, menu_item_id, menu_item:menu_items(name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setReviews(data.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        menuItemId: r.menu_item_id,
        menuItemName: r.menu_item?.name || "Unknown Item",
      })));
      setReviewsLoading(false);
    })();
  }, [user]);

  const hasChanges =
    editUsername.trim() !== (user?.username || "") ||
    editFullName.trim() !== (user?.fullName || "");

  async function handleSave() {
    setError("");
    setSaving(true);
    const err = await updateProfile(editUsername, editFullName);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    setDeletingId(reviewId);
    await supabase.from("reviews").delete().eq("id", reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setDeletingId(null);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <Text style={styles.displayName}>{user?.fullName}</Text>
            <Text style={styles.usernameLabel}>@{user?.username}</Text>
            <View style={[styles.roleBadge, styles.roleBadgeCustomer]}>
              <Text style={[styles.roleText, styles.roleTextCustomer]}>👤 Customer</Text>
            </View>
          </View>

          {/* Edit Form */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Information</Text>

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="yourname"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Charles Marquez"
            />

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputDisabled}>
              <Text style={styles.inputDisabledText}>{user?.email}</Text>
            </View>

            {error ? (
              <View style={styles.alertError}>
                <Text style={styles.alertErrorText}>{error}</Text>
              </View>
            ) : null}

            {hasChanges && (
              <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
                <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save Changes"}</Text>
              </TouchableOpacity>
            )}

            {saved && (
              <View style={styles.alertSuccess}>
                <Text style={styles.alertSuccessText}>✓ Profile updated successfully!</Text>
              </View>
            )}
          </View>

          {/* Manage Addresses */}
          <TouchableOpacity onPress={() => router.push("/addresses" as any)} style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>📍 Manage Addresses</Text>
          </TouchableOpacity>

          {/* My Reviews */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>My Reviews ({reviews.length})</Text>
            {reviewsLoading ? (
              <ActivityIndicator size="small" color={PRIMARY} style={{ paddingVertical: 20 }} />
            ) : reviews.length === 0 ? (
              <Text style={styles.noReviews}>You haven't written any reviews yet.</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewItemName}>{r.menuItemName}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Text key={s} style={{ fontSize: 13, color: s <= r.rating ? AMBER : "#d1d5db" }}>★</Text>
                        ))}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.deleteBtn, deletingId === r.id && { opacity: 0.5 }]}
                      disabled={deletingId === r.id}
                      onPress={() => handleDeleteReview(r.id)}
                    >
                      <Text style={styles.deleteBtnText}>{deletingId === r.id ? "…" : "✕"}</Text>
                    </TouchableOpacity>
                  </View>
                  {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                  <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
              ))
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ──────────────────────────── Styles ──────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  backBtn: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0a0a0a" },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  // Avatar
  avatarSection: { alignItems: "center", paddingVertical: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  displayName: { fontSize: 20, fontWeight: "700", color: "#0a0a0a", marginBottom: 2 },
  usernameLabel: { fontSize: 14, fontWeight: "600", color: "#6b7280", marginBottom: 10 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14 },
  roleBadgeCustomer: { backgroundColor: "#f0fdf4" },
  roleText: { fontSize: 13, fontWeight: "600" },
  roleTextCustomer: { color: "#16a34a" },

  // Card
  card: {
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1,
    borderColor: "#e5e7eb", padding: 16, gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0a0a0a", marginBottom: 2 },
  label: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginTop: 2 },
  input: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0a0a0a", backgroundColor: "#f9fafb",
  },
  inputDisabled: {
    borderWidth: 1, borderColor: "#f3f4f6", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#f9fafb",
  },
  inputDisabledText: { fontSize: 14, color: "#9ca3af" },
  saveBtn: { backgroundColor: PRIMARY, paddingVertical: 13, borderRadius: 10, alignItems: "center", marginTop: 6 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  alertError: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", padding: 10, borderRadius: 8, marginTop: 4 },
  alertErrorText: { color: PRIMARY, fontSize: 12, fontWeight: "500" },
  alertSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", padding: 10, borderRadius: 8, marginTop: 4 },
  alertSuccessText: { color: "#16a34a", fontSize: 12, fontWeight: "500" },
  noReviews: { fontSize: 14, color: "#9ca3af", textAlign: "center", paddingVertical: 12 },

  // Reviews
  reviewCard: {
    backgroundColor: "#f9fafb", borderRadius: 10, padding: 12, gap: 6,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  reviewItemName: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  reviewStars: { flexDirection: "row", gap: 1, marginTop: 3 },
  reviewComment: { fontSize: 13, color: "#4b5563", lineHeight: 19 },
  reviewDate: { fontSize: 11, color: "#9ca3af" },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#fef2f2" },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: PRIMARY },

  // Manage Addresses
  manageBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
  },
  manageBtnText: { fontSize: 14, color: PRIMARY, fontWeight: "600" },

  // Logout
  logoutBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
  },
  logoutText: { fontSize: 14, color: PRIMARY, fontWeight: "600" },
});