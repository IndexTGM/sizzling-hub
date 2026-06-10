import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#dc2626";

export default function IndexScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <Text style={styles.title}>BEN'S TAPSIHAN</Text>
        <Text style={styles.subtitle}>Tablet Kiosk</Text>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
          style={styles.spinner}
        />
        <Text style={styles.loading}>Loading menu…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: PRIMARY,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 8,
  },
  loading: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "500",
  },
});