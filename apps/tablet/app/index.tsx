import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBranch, type Branch } from "@/lib/branch-context";
import { getImageUrl } from "@/lib/storage";

const PRIMARY = "#dc2626";
const LOGO_URL = getImageUrl("logo.png");

function BranchCard({ branch, onSelect }: { branch: Branch; onSelect: () => void }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onSelect}
    >
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>📍</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{branch.name}</Text>
        {branch.address && (
          <Text style={styles.cardAddress} numberOfLines={2}>
            {branch.address}
          </Text>
        )}
        {branch.phone && (
          <Text style={styles.cardPhone}>📞 {branch.phone}</Text>
        )}
      </View>
      <View style={styles.cardArrow}>
        <Text style={styles.cardArrowText}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function IndexScreen() {
  const { allBranches, setBranchId, loading, error } = useBranch();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>SIZZLING HUB</Text>
        <Text style={styles.subtitle}>Select Branch</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading branches…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={allBranches}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No branches available.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <BranchCard
              branch={item}
              onSelect={() => setBranchId(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  header: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: PRIMARY,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    fontWeight: "500",
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  cardAddress: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  cardPhone: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  cardArrowText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
});