import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { MenuProvider } from "@/lib/menu-context";

const PRIMARY = "#dc2626";

function AuthLoadingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const current = segments[0] as string | undefined;
    const isRoot = current === "index" || !current;

    if (isRoot) {
      router.replace("/menu");
    }
  }, [loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
        }}
      >
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <MenuProvider>
      {children}
    </MenuProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <AuthLoadingGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#fafafa" },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="menu" />
            <Stack.Screen name="menu-item" />
            <Stack.Screen name="cart" />
          </Stack>
        </AuthLoadingGate>
      </CartProvider>
    </AuthProvider>
  );
}