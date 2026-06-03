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
const PRIMARY_LIGHT = "#fca5a5";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [editName, setEditName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) setEditName(user.fullName || "");
  }, [user]);

  const hasChanges = editName.trim() !== (user?.fullName || "");

  function handleSave() {
    // TODO: Backend call
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >

        <ScrollView contentContainerStyle={styles.content}>
            {/* ─── Avatar + Role ─── */}
            <View style={styles.avatarSection}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
            </View>
            <Text style={styles.displayName}>{user?.fullName}</Text>
            <View style={[styles.roleBadge, styles.roleBadgeCustomer]}>
                <Text style={[styles.roleText, styles.roleTextCustomer]}>
                    👤 Customer
                </Text>
            </View>
            </View>

            {/* ─── Edit Form ─── */}
            <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Information</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
            />

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputDisabled}>
                <Text style={styles.inputDisabledText}>{user?.email}</Text>
            </View>

            {/* Save button */}
            {hasChanges && (
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
            )}

            {saved && (
                <View style={styles.alertSuccess}>
                <Text style={styles.alertTextSuccess}>
                    ✓ Profile updated successfully!
                </Text>
                </View>
            )}
            </View>

            {/* ─── Logout ─── */}
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </ScrollView>
                
      </KeyboardAvoidingView>

      
    </SafeAreaView>
  );
}

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
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0a0a0a",
  },

  // ─── Content ───
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // ─── Avatar Section ───
  avatarSection: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0a0a0a",
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
  },
  roleBadgeCustomer: {
    backgroundColor: "#f0fdf4",
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  roleTextCustomer: {
    color: "#16a34a",
  },

  // ─── Form Card ───
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0a0a0a",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0a0a0a",
    backgroundColor: "#f9fafb",
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  inputDisabledText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  alertSuccess: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  alertTextSuccess: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "500",
  },

  // ─── Logout ───
  logoutBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  logoutText: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "600",
  },
});