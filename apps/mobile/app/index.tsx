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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { useAuth } from "@/lib/auth-context";

const PRIMARY = "#dc2626";
const PRIMARY_LIGHT = "#fca5a5";

type ViewName = "login" | "register" | "otp-signin" | "otp-verify";

export default function AuthScreen() {
  const router = useRouter();
  const { login, register, signInWithOtp, verifySignInOtp } = useAuth();
  const [view, setView] = useState<ViewName>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Login
  const [lusername, setLUsername] = useState("");
  const [lpass, setLPass] = useState("");
  const [showLPass, setShowLPass] = useState(false);
  const [loginTosAgreed, setLoginTosAgreed] = useState(false);

  // Register
  const [rusername, setRUsername] = useState("");
  const [rname, setRName] = useState("");
  const [remail, setREmail] = useState("");
  const [rpass, setRPass] = useState("");
  const [showRPass, setShowRPass] = useState(false);
  const [rcpass, setRCPass] = useState("");
  const [showRCPass, setShowRCPass] = useState(false);
  const [rphone, setRPhone] = useState("");
  const [registerTosAgreed, setRegisterTosAgreed] = useState(false);

  // OTP
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");

  function switchView(v: ViewName) {
    setView(v);
    setError("");
    setSuccess("");
    setOtp("");
  }

  async function handleLogin() {
    setError("");
    if (!loginTosAgreed) {
      setError("You must agree to the Terms of Service to log in.");
      return;
    }
    setLoading(true);
    const err = await login(lusername, lpass);
    setLoading(false);
    if (err) setError(err);
  }

  async function handleRegister() {
    setError("");
    setSuccess("");
    if (!registerTosAgreed) {
      setError("You must agree to the Terms of Service to create an account.");
      return;
    }
    setLoading(true);
    const phoneValue = rphone.trim() ? `+63${rphone.trim()}` : undefined;
    const result = await register(rusername, rname, remail, rpass, rcpass, phoneValue);
    setLoading(false);
    if (result === "check-email") {
      setSuccess(
        "Account created! Check your email for a confirmation link. (If email confirmation is disabled in Supabase, you can log in immediately.)"
      );
    } else if (result) {
      setError(result);
    }
  }

  async function handleSendOtp() {
    setError("");
    setSuccess("");
    if (!otpEmail || !otpEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const err = await signInWithOtp(otpEmail);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess("Check your email for a 6-digit sign-in code.");
      switchView("otp-verify");
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setSuccess("");
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    const err = await verifySignInOtp(otpEmail, otp);
    setLoading(false);
    if (err) setError(err);
  }

  const subtitle =
    view === "login"
      ? "Welcome back! Log in to continue."
      : view === "register"
      ? "Create your account to get started."
      : view === "otp-signin"
      ? "Sign in without a password."
      : "Enter your verification code";

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
            <Text style={styles.logoTitle}>BEN'S TAPSIHAN</Text>
            <Text style={styles.logoSubtitle}>{subtitle}</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab switcher (only on login/register) */}
            {(view === "login" || view === "register") && (
              <View style={styles.tabRow}>
                <TouchableOpacity
                  onPress={() => switchView("login")}
                  style={[styles.tab, view === "login" && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      view === "login" && styles.tabTextActive,
                    ]}
                  >
                    Log In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => switchView("register")}
                  style={[styles.tab, view === "register" && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      view === "register" && styles.tabTextActive,
                    ]}
                  >
                    Register
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Alerts */}
            {error ? (
              <View style={styles.alertError}>
                <Text style={styles.alertTextError}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={styles.alertSuccess}>
                <Text style={styles.alertTextSuccess}>{success}</Text>
              </View>
            ) : null}

            {/* ── LOGIN ── */}
            {view === "login" && (
              <View style={styles.form}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={lusername}
                  onChangeText={setLUsername}
                  placeholder="yourname"
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

                {/* TOS checkbox */}
                <View style={styles.tosRow}>
                  <Switch
                    value={loginTosAgreed}
                    onValueChange={setLoginTosAgreed}
                    trackColor={{ false: "#d1d5db", true: "#fca5a5" }}
                    thumbColor={loginTosAgreed ? PRIMARY : "#f4f3f4"}
                  />
                  <Text style={styles.tosText}>
                    By continuing you agree to our{" "}
                    <Link href="/terms" style={styles.tosLink}>Terms of Service</Link> and{" "}
                    <Link href="/privacy" style={styles.tosLink}>Privacy Policy</Link>.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading || !loginTosAgreed}
                  style={[
                    styles.button,
                    { backgroundColor: loading ? PRIMARY_LIGHT : PRIMARY },
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Logging in…" : "Log In"}
                  </Text>
                </TouchableOpacity>

                {/* OTP divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={() => { setOtpEmail(""); switchView("otp-signin"); }}
                  style={styles.otpButton}
                >
                  <Text style={styles.otpButtonText}>Sign In with OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── REGISTER ── */}
            {view === "register" && (
              <View style={styles.form}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={rusername}
                  onChangeText={setRUsername}
                  placeholder="yourname"
                  autoCapitalize="none"
                />

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

                {/* Phone Number — Philippines only (+63 prefix) */}
                <Text style={styles.label}>Phone Number (optional)</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+63</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={rphone}
                    onChangeText={(v) => setRPhone(v.replace(/[^0-9]/g, ""))}
                    placeholder="912 345 6789"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

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

                {/* TOS checkbox */}
                <View style={styles.tosRow}>
                  <Switch
                    value={registerTosAgreed}
                    onValueChange={setRegisterTosAgreed}
                    trackColor={{ false: "#d1d5db", true: "#fca5a5" }}
                    thumbColor={registerTosAgreed ? PRIMARY : "#f4f3f4"}
                  />
                  <Text style={styles.tosText}>
                    By continuing you agree to our{" "}
                    <Link href="/terms" style={styles.tosLink}>Terms of Service</Link> and{" "}
                    <Link href="/privacy" style={styles.tosLink}>Privacy Policy</Link>.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={loading || !registerTosAgreed}
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

            {/* ── OTP SIGN-IN ── */}
            {view === "otp-signin" && (
              <View style={styles.form}>
                <Text style={styles.hint}>
                  Enter your email address and we'll send you a 6-digit code to
                  sign in instantly.
                </Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={otpEmail}
                  onChangeText={setOtpEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={loading}
                  style={[
                    styles.button,
                    { backgroundColor: loading ? PRIMARY_LIGHT : PRIMARY },
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Sending…" : "Send Code"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => switchView("login")}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkText}>← Back to Log In</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── OTP VERIFY ── */}
            {view === "otp-verify" && (
              <View style={styles.form}>
                <Text style={styles.hint}>
                  We sent a 6-digit code to{" "}
                  <Text style={{ fontWeight: "700", color: "#0a0a0a" }}>
                    {otpEmail}
                  </Text>
                  . Enter it below to sign in.
                </Text>

                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  style={[
                    styles.button,
                    { backgroundColor: loading ? PRIMARY_LIGHT : PRIMARY },
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Verifying…" : "Verify & Sign In"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setOtpEmail(""); setOtp(""); switchView("login"); }}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkText}>← Back</Text>
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
    fontSize: 24,
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
    paddingHorizontal: 20,
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
  alertTextError: {
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
  hint: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
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
  otpInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
    paddingVertical: 14,
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
  otpButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  otpButtonText: {
    color: PRIMARY,
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
  },
  tosRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  tosText: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
  },
  tosLink: {
    color: "#0a0a0a",
    fontWeight: "700",
  },

  // Phone Input (Philippines only)
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  phonePrefix: {
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0a0a0a",
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
});