import { useEffect, useState } from "react";
import { StyleSheet, FlatList, ActivityIndicator } from "react-native";

import { supabase } from "@/lib/supabase";
import { Text, View } from "@/components/Themed";

// ──────────────────────────────────────────────────
//  Fetches profiles from Supabase on mount.
//  Make sure your .env has real EXPO_PUBLIC_SUPABASE_* keys
//  and the "profiles" table exists (see SETUP_GUIDE.md SQL).
// ──────────────────────────────────────────────────

type Profile = {
  id: number;
  role: string;
  full_name: string;
};

export default function TabOneScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name");

    if (error) {
      setError(error.message);
    } else {
      setProfiles(data ?? []);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading from Supabase…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>⚠️ {error}</Text>
        <Text style={styles.hint}>
          Check your .env keys and that the profiles table exists.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 Sizzling Hub</Text>
      <Text style={styles.subtitle}>Profiles from Supabase</Text>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.full_name}</Text>
            <Text style={styles.cardContent}>
              Role: {item.role}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No profiles yet.
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    color: "#888",
  },
  error: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardContent: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  cardDate: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 8,
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
  },
});
