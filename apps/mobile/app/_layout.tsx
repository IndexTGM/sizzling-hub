import { Stack, useSegments, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { BranchProvider } from "@/lib/branch-context";
import { CartProvider } from "@/lib/cart-context";
import { BannerProvider } from "@/lib/banner-context";
import { MenuProvider } from "@/lib/menu-context";
import { BACKGROUND_LOCATION_TASK } from "@/lib/background-location-task";

const PRIMARY = "#dc2626";

// Import the task file to ensure it gets registered at startup
import "@/lib/background-location-task";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const current = segments[0] as string | undefined;
    const inAuthScreen = current === "index" || !current;
    const isPublicScreen = inAuthScreen || current === "terms" || current === "privacy";
    const isAuthenticated = user !== null;

    if (!isAuthenticated && !isPublicScreen) {
      router.replace("/");
    } else if (isAuthenticated && inAuthScreen) {
      router.replace("/menu");
    }
  }, [user, loading, segments]);

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

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <BranchProvider>
      <BannerProvider>
      <MenuProvider>
      <CartProvider>
        <AuthGate>
          <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#fafafa" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="menu" />
          <Stack.Screen name="menu-item" />
          <Stack.Screen name="cart" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="order-detail" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="addresses" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="drivers" />
          </Stack>
        </AuthGate>
      </CartProvider>
      </MenuProvider>
      </BannerProvider>
      </BranchProvider>
    </AuthProvider>
  );
}