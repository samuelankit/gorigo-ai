import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { View, AppState } from "react-native";
import { Colors } from "../constants/theme";
import { isAuthenticated, logout as apiLogout, setOnAuthExpired } from "../lib/api";
import { BrandingProvider } from "../lib/branding-context";
import { BiometricProvider } from "../lib/biometric-lock";
import { useNetworkState } from "../lib/use-network";
import ConnectionBanner from "../components/ConnectionBanner";

interface AuthContextType {
  loggedIn: boolean | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  loggedIn: null,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function useProtectedRoute(isLoggedIn: boolean | null) {
  const segments = useSegments();

  useEffect(() => {
    if (isLoggedIn === null) return;

    const inAuthGroup = segments[0] === "login";

    if (!isLoggedIn && !inAuthGroup) {
      router.replace("/login");
    } else if (isLoggedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoggedIn, segments]);
}

export default function RootLayout() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const { isOnline } = useNetworkState();

  const refreshAuth = useCallback(async () => {
    const result = await isAuthenticated();
    setLoggedIn(result);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setLoggedIn(false);
  }, []);

  useEffect(() => {
    refreshAuth();
    setOnAuthExpired(() => {
      setLoggedIn(false);
    });
  }, [refreshAuth]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshAuth();
      }
    });
    return () => subscription.remove();
  }, [refreshAuth]);

  useProtectedRoute(loggedIn);

  return (
    <BrandingProvider>
      <BiometricProvider>
        <AuthContext.Provider value={{ loggedIn, signOut, refreshAuth }}>
          <StatusBar style="dark" />
          <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <ConnectionBanner isOnline={isOnline} />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: Colors.background },
                headerTintColor: Colors.text,
                headerTitleStyle: { fontWeight: "600" },
                contentStyle: { backgroundColor: Colors.background },
                headerShadowVisible: false,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="call-detail" options={{ title: "Call Details" }} />
              <Stack.Screen name="wallet" options={{ title: "Wallet" }} />
              <Stack.Screen name="business-switcher" options={{ title: "Switch Business" }} />
            </Stack>
          </View>
        </AuthContext.Provider>
      </BiometricProvider>
    </BrandingProvider>
  );
}
