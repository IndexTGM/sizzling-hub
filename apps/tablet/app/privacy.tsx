import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const PRIMARY = "#dc2626";

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: May 31, 2026</Text>
        <View style={styles.card}>
          <Section title="1. Information We Collect">
            We collect information you provide directly to us, including your name, email address, phone number, delivery address, and payment information when you create an account or place an order. We also automatically collect certain technical information when you use our Service, such as your IP address, browser type, and device information.
          </Section>
          <Section title="2. How We Use Your Information">
            We use the information we collect to: (a) process and fulfill your orders; (b) communicate with you about your account and orders; (c) improve and personalize our Service; (d) send you marketing communications (with your consent); and (e) comply with legal obligations.
          </Section>
          <Section title="3. Information Sharing">
            We do not sell your personal information. We may share your information with third-party service providers who help us operate our business, such as payment processors, delivery partners, and hosting providers. These providers are contractually bound to protect your information and use it only for the services they provide to us.
          </Section>
          <Section title="4. Data Security">
            We implement reasonable technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </Section>
          <Section title="5. Cookies">
            We use cookies and similar tracking technologies to enhance your experience on our Service. Cookies help us remember your preferences, understand how you use our site, and improve our offerings. You can control cookie preferences through your browser settings at any time.
          </Section>
          <Section title="6. Your Rights">
            Depending on your jurisdiction, you may have the right to access, correct, delete, or port your personal data. You may also have the right to opt out of certain data processing activities. To exercise these rights, please contact us using the information provided below.
          </Section>
          <Section title="7. Data Retention">
            We retain your personal information for as long as necessary to fulfill the purposes described in this policy, unless a longer retention period is required or permitted by law.
          </Section>
          <Section title="8. Children's Privacy">
            Our Service is not directed to individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take steps to delete such information.
          </Section>
          <Section title="9. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after changes are posted constitutes acceptance of the updated policy.
          </Section>
          <Section title="10. Contact Us">
            If you have questions about this Privacy Policy, please contact us at support@sizzlinghub.com.
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