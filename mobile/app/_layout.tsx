import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef, createContext, useContext, useCallback } from "react";
import { View, AppState, Platform } from "react-native";
import { isAuthenticated, logout as apiLogout, setOnAuthExpired } from "../lib/api";
import { checkDeviceIntegrity, showSecurityWarning } from "../lib/security";
import { BrandingProvider } from "../lib/branding-context";
import { BiometricProvider } from "../lib/biometric-lock";
import { useNetworkState } from "../lib/use-network";
import { ThemeProvider, useTheme } from "../lib/theme-context";
import ConnectionBanner from "../components/ConnectionBanner";
import { getRouteForNotificationType, extractNotificationType } from "../lib/push-notifications";

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
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);

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
    checkDeviceIntegrity()
      .then((result) => {
        if (result.riskLevel !== "safe") {
          showSecurityWarning(result);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshAuth();
      }
    });
    return () => subscription.remove();
  }, [refreshAuth]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let mounted = true;

    async function setupNotificationListeners() {
      try {
        const Notifications = await import("expo-notifications");

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        notificationListenerRef.current = Notifications.addNotificationReceivedListener(
          (notification) => {
            console.log("[Push] Notification received in foreground:", notification.request.content.title);
          }
        );

        responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            if (!mounted) return;
            const data = response.notification.request.content.data;
            const notificationType = extractNotificationType(data);
            const route = getRouteForNotificationType(notificationType);
            try {
              router.push(route as any);
            } catch (err) {
              console.error("[Push] Navigation failed:", err);
            }
          }
        );
      } catch (err) {
        console.error("[Push] Failed to setup notification listeners:", err);
      }
    }

    setupNotificationListeners();

    return () => {
      mounted = false;
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, []);

  useProtectedRoute(loggedIn);

  return (
    <ThemeProvider>
      <BrandingProvider>
        <BiometricProvider>
          <AuthContext.Provider value={{ loggedIn, signOut, refreshAuth }}>
            <RootLayoutInner isOnline={isOnline} />
          </AuthContext.Provider>
        </BiometricProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}

function RootLayoutInner({ isOnline }: { isOnline: boolean }) {
  const { colors, mode } = useTheme();

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ConnectionBanner isOnline={isOnline} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="call-detail" options={{ title: "Call Details" }} />
          <Stack.Screen name="business-switcher" options={{ title: "Switch Business" }} />
          <Stack.Screen name="campaigns" options={{ title: "Campaigns" }} />
          <Stack.Screen name="edit-profile" options={{ title: "Edit Profile" }} />
          <Stack.Screen name="change-password" options={{ title: "Change Password" }} />
          <Stack.Screen name="notification-preferences" options={{ title: "Notification Preferences" }} />
          <Stack.Screen name="search" options={{ title: "Search", headerShown: true }} />
        </Stack>
      </View>
    </>
  );
}
