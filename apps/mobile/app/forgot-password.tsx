import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";

const PRIMARY = "#dc2626";
const PRIMARY_LIGHT = "#fca5a5";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleReset() {
    setError("");
    setSuccess("");
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const err = await resetPassword(email);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(
        "If an account with that email exists, we've sent a password reset link."
      );
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoTitle}>SIZZLING HUB</Text>
            <Text style={styles.logoSubtitle}>Reset your password</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {success ? (
              <View style={styles.form}>
                <View style={styles.alertSuccess}>
                  <Text style={styles.alertTextSuccess}>{success}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={[styles.button, { backgroundColor: PRIMARY }]}
                >
                  <Text style={styles.buttonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.hint}>
                  Enter your email address and we'll send you a link to reset
                  your password.
                </Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {error ? (
                  <View style={styles.alertError}>
                    <Text style={styles.alertText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleReset}
                  disabled={loading}
                  style={[
                    styles.button,
                    { backgroundColor: loading ? PRIMARY_LIGHT : PRIMARY },
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Sending…" : "Send Reset Link"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkText}>← Back to Log In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 8,
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  form: {
    gap: 12,
  },
  hint: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0a0a0a",
    marginBottom: -6,
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
  alertError: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    borderRadius: 8,
  },
  alertText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "500",
  },
  alertSuccess: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 12,
    borderRadius: 8,
  },
  alertTextSuccess: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "500",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  linkBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
});