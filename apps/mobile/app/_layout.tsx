import { Stack, useSegments, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";

const PRIMARY = "#dc2626";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const current = segments[0] as string | undefined;
    const inAuthScreen = current === "index" || !current;
    const inForgotScreen = current === "forgot-password";
    const isAuthenticated = user !== null;

    if (!isAuthenticated && !inAuthScreen && !inForgotScreen) {
      router.replace("/");
    } else if (isAuthenticated && (inAuthScreen || inForgotScreen)) {
      router.replace("/home");
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
      <CartProvider>
        <AuthGate>
          <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#fafafa" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="home" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="menu" />
          <Stack.Screen name="menu-item" />
          <Stack.Screen name="cart" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="order-detail" />
          <Stack.Screen name="admin" />
          </Stack>
        </AuthGate>
      </CartProvider>
    </AuthProvider>
  );
}