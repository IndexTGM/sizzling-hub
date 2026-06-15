import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { BranchProvider, useBranch } from "@/lib/branch-context";
import { BannerProvider } from "@/lib/banner-context";
import { CartProvider } from "@/lib/cart-context";
import { MenuProvider } from "@/lib/menu-context";

const PRIMARY = "#dc2626";

function AuthLoadingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { selected: branchSelected } = useBranch();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const current = segments[0] as string | undefined;
    const isRoot = current === "index" || !current;

    // If branch not selected yet, show the branch picker (index)
    if (!branchSelected && !isRoot) {
      router.replace("/");
      return;
    }

    // If branch selected and on root, go to menu
    if (branchSelected && isRoot) {
      router.replace("/menu");
    }
  }, [loading, branchSelected]);

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
      </MenuProvider>
      </BannerProvider>
      </BranchProvider>
    </AuthProvider>
  );
}