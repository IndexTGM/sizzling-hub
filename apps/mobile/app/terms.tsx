import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const PRIMARY = "#dc2626";

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: May 31, 2026</Text>
        <View style={styles.card}>
          <Section title="1. Acceptance of Terms">
            By accessing or using Sizzling Hub's website, mobile application, or any related services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
          </Section>
          <Section title="2. Description of Service">
            Sizzling Hub provides an online food ordering platform that allows users to browse menus, place orders, and manage their accounts. We reserve the right to modify, suspend, or discontinue any part of the Service at any time without prior notice.
          </Section>
          <Section title="3. User Accounts">
            To access certain features of the Service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information promptly.
          </Section>
          <Section title="4. Orders and Payments">
            All orders placed through the Service are subject to acceptance and availability. Prices are subject to change without notice. You agree to pay all charges incurred in connection with your account, including applicable taxes and delivery fees.
          </Section>
          <Section title="5. Prohibited Conduct">
            You agree not to: (a) use the Service for any unlawful purpose; (b) interfere with or disrupt the Service or servers; (c) impersonate any person or entity; (d) engage in any activity that could damage, disable, or impair the Service.
          </Section>
          <Section title="6. Intellectual Property">
            All content, trademarks, and intellectual property on the Service are owned by Sizzling Hub or its licensors. You may not reproduce, distribute, or create derivative works without express written permission.
          </Section>
          <Section title="7. Limitation of Liability">
            To the fullest extent permitted by law, Sizzling Hub shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
          </Section>
          <Section title="8. Changes to Terms">
            We reserve the right to update these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service after any modifications constitutes acceptance of the updated Terms.
          </Section>
          <Section title="9. Contact">
            For questions about these Terms, please contact us at support@sizzlinghub.com.
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { fontSize: 15, fontWeight: "600", color: PRIMARY },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0a0a0a" },
  content: { padding: 16, paddingBottom: 40 },
  updated: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0a0a0a", marginBottom: 6 },
  sectionBody: { fontSize: 13, color: "#374151", lineHeight: 20 },
});