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

export default function AuthScreen() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Login
  const [lemail, setLEmail] = useState("");
  const [lpass, setLPass] = useState("");
  const [showLPass, setShowLPass] = useState(false);

  // Register
  const [rname, setRName] = useState("");
  const [remail, setREmail] = useState("");
  const [rpass, setRPass] = useState("");
  const [showRPass, setShowRPass] = useState(false);
  const [rcpass, setRCPass] = useState("");
  const [showRCPass, setShowRCPass] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    const err = await login(lemail, lpass);
    setLoading(false);
    if (err) setError(err);
  }

  async function handleRegister() {
    setError("");
    setSuccess("");
    setLoading(true);
    const result = await register(rname, remail, rpass, rcpass);
    setLoading(false);
    if (result === "check-email") {
      setSuccess("Account created! An email has been sent to verify your address. Please check and confirm it before logging in.");
    } else if (result) {
      setError(result);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
            <Text style={styles.logoSubtitle}>
              {tab === "login"
                ? "Welcome back! Log in to continue."
                : "Create your account to get started."}
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => {
                  setTab("login");
                  setError("");
                  setSuccess("");
                }}
                style={[styles.tab, tab === "login" && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "login" && styles.tabTextActive,
                  ]}
                >
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setTab("register");
                  setError("");
                  setSuccess("");
                }}
                style={[styles.tab, tab === "register" && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "register" && styles.tabTextActive,
                  ]}
                >
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.alertError}>
                <Text style={styles.alertText}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={styles.alertSuccess}>
                <Text style={styles.alertTextSuccess}>{success}</Text>
              </View>
            ) : null}

            {/* LOGIN FORM */}
            {tab === "login" && (
              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={lemail}
                  onChangeText={setLEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Password</Text>
                <View style={styles.passRow}>
                  <TextInput
                    style={[styles.input, styles.passInput]}
                    value={lpass}
                    onChangeText={setLPass}
                    placeholder="••••••••"
                    secureTextEntry={!showLPass}
                  />
                  <TouchableOpacity
                    onPress={() => setShowLPass(!showLPass)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeText}>
                      {showLPass ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  style={[
                    styles.button,
                    { backgroundColor: loading ? PRIMARY_LIGHT : PRIMARY },
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Logging in…" : "Log In"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/forgot-password" as any)}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* REGISTER FORM */}
            {tab === "register" && (
              <View style={styles.form}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={rname}
                  onChangeText={setRName}
                  placeholder="Charles Marquez"
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={remail}
                  onChangeText={setREmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Password</Text>
                <View style={styles.passRow}>
                  <TextInput
                    style={[styles.input, styles.passInput]}
                    value={rpass}
                    onChangeText={setRPass}
                    placeholder="Min. 8 characters"
                    secureTextEntry={!showRPass}
                  />
                  <TouchableOpacity
                    onPress={() => setShowRPass(!showRPass)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeText}>
                      {showRPass ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passRow}>
                  <TextInput
                    style={[styles.input, styles.passInput]}
                    value={rcpass}
                    onChangeText={setRCPass}
                    placeholder="Re-enter password"
                    secureTextEntry={!showRCPass}
                  />
                  <TouchableOpacity
                    onPress={() => setShowRCPass(!showRCPass)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeText}>
                      {showRCPass ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={loading}
                  style={[
                    styles.button,
                    { backgroundColor: loading ? PRIMARY_LIGHT : PRIMARY },
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Creating account…" : "Create Account"}
                  </Text>
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
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#0a0a0a",
  },
  alertError: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  alertTextSuccess: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "500",
  },
  form: {
    gap: 12,
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
  passRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passInput: {
    flex: 1,
    paddingRight: 44,
  },
  eyeBtn: {
    position: "absolute",
    right: 4,
    padding: 8,
  },
  eyeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
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