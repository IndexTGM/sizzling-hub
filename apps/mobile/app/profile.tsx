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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";

const PRIMARY = "#dc2626";

function isValidPHPhone(phone: string): boolean {
  const raw = phone.trim().replace(/[\s\-\(\)]/g, "");
  return /^(09\d{9}|\+639\d{9}|639\d{9})$/.test(raw);
}

/* ──────────────────────────── Profile Screen ──────────────────── */
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setEditUsername(user.username || "");
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
      setEditPhone(user.phone || "");
    }
  }, [user]);

  function handlePhoneChange(v: string) {
    const cleaned = v.replace(/[^0-9+]/g, "");
    setEditPhone(cleaned);
    if (cleaned.trim() && !isValidPHPhone(cleaned)) {
      setPhoneError("Enter a valid PH mobile number (e.g. 09171234567 or +639171234567)");
    } else {
      setPhoneError("");
    }
  }

  function startEditing() {
    if (user) {
      setEditUsername(user.username || "");
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
      setEditPhone(user.phone || "");
    }
    setPhoneError("");
    setError("");
    setSaved(false);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setPhoneError("");
    setError("");
    setSaved(false);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const err = await updateProfile(editUsername, editFirstName, editLastName, editPhone || undefined);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setEditing(false);
      }, 1500);
    }
  }

  function roleBadge(role: string) {
    if (role === "admin") return { label: "🛡️ Admin", bg: "#fef2f2", text: PRIMARY };
    if (role === "dev") return { label: "🛠️ Dev", bg: "#f5f3ff", text: "#7c3aed" };
    return { label: "👤 Customer", bg: "#f0fdf4", text: "#16a34a" };
  }

  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User";
  const badge = roleBadge(user?.role || "customer");

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
          {/* Avatar & Info Card */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.firstName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.usernameLabel}>@{user?.username}</Text>
            <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.roleText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>

          {/* ── VIEW MODE ── */}
          {!editing && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Your Information</Text>
                <TouchableOpacity style={styles.editBtn} onPress={startEditing}>
                  <Text style={styles.editBtnText}>✎ Edit Profile</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>@{user?.username}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>First Name</Text>
                <Text style={styles.infoValue}>{user?.firstName || "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Name</Text>
                <Text style={styles.infoValue}>{user?.lastName || "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{user?.phone || "—"}</Text>
              </View>
            </View>
          )}

          {/* ── EDIT MODE ── */}
          {editing && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={cancelEditing}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="yourname"
                autoCapitalize="none"
              />

              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={editFirstName}
                onChangeText={setEditFirstName}
                placeholder="Charles"
              />

              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={editLastName}
                onChangeText={setEditLastName}
                placeholder="Marquez"
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, phoneError && editPhone.trim() ? styles.inputError : null]}
                value={editPhone}
                onChangeText={handlePhoneChange}
                placeholder="09171234567"
                keyboardType="phone-pad"
              />
              {phoneError && editPhone.trim() ? (
                <Text style={styles.fieldError}>{phoneError}</Text>
              ) : null}
              {!phoneError && editPhone.trim() && isValidPHPhone(editPhone) ? (
                <Text style={styles.fieldValid}>✓ Valid PH number</Text>
              ) : null}

              {error ? (
                <View style={styles.alertError}>
                  <Text style={styles.alertErrorText}>{error}</Text>
                </View>
              ) : null}

              {saved && (
                <View style={styles.alertSuccess}>
                  <Text style={styles.alertSuccessText}>✓ Profile updated successfully!</Text>
                </View>
              )}

              <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
                <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save Changes"}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Manage Addresses */}
          <TouchableOpacity onPress={() => router.push("/addresses" as any)} style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>📍 Manage Addresses</Text>
          </TouchableOpacity>

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
  roleText: { fontSize: 13, fontWeight: "600" },

  // Card
  card: {
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1,
    borderColor: "#e5e7eb", padding: 16, gap: 10,
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0a0a0a" },

  // View Mode
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  infoLabel: { fontSize: 12, fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1f2937", maxWidth: "60%", textAlign: "right" },

  editBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: PRIMARY,
  },
  editBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: PRIMARY },

  // Edit Mode
  label: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginTop: 2 },
  input: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0a0a0a", backgroundColor: "#f9fafb",
  },
  inputError: {
    borderColor: PRIMARY,
  },
  fieldError: {
    fontSize: 11, color: PRIMARY, fontWeight: "500", marginTop: -6,
  },
  fieldValid: {
    fontSize: 10, color: "#16a34a", fontWeight: "500", marginTop: -6,
  },
  saveBtn: { backgroundColor: PRIMARY, paddingVertical: 13, borderRadius: 10, alignItems: "center", marginTop: 6 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  alertError: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", padding: 10, borderRadius: 8, marginTop: 4 },
  alertErrorText: { color: PRIMARY, fontSize: 12, fontWeight: "500" },
  alertSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", padding: 10, borderRadius: 8, marginTop: 4 },
  alertSuccessText: { color: "#16a34a", fontSize: 12, fontWeight: "500" },

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