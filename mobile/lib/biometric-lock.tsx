import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus, View, Text, StyleSheet, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

interface BiometricContextType {
  isLocked: boolean;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  requireAuth: () => Promise<boolean>;
}

const BiometricContext = createContext<BiometricContextType>({
  isLocked: false,
  biometricEnabled: false,
  setBiometricEnabled: async () => {},
  requireAuth: async () => true,
});

export const useBiometric = () => useContext(BiometricContext);

const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const BIOMETRIC_KEY = "gorigo-biometric-enabled";

export function BiometricProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const lastActiveRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(BIOMETRIC_KEY);
        if (stored === "true") {
          setBiometricEnabledState(true);
        }
      } catch {}

      try {
        const LocalAuth = await import("expo-local-authentication");
        const hasHardware = await LocalAuth.hasHardwareAsync();
        const isEnrolled = await LocalAuth.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
      } catch {
        setBiometricAvailable(false);
      }
    };
    loadSettings();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!biometricAvailable) {
      setIsLocked(false);
      return true;
    }

    try {
      const LocalAuth = await import("expo-local-authentication");
      const result = await LocalAuth.authenticateAsync({
        promptMessage: "Authenticate to access GoRigo",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        lastActiveRef.current = Date.now();
        return true;
      }
      return false;
    } catch {
      setIsLocked(false);
      return true;
    }
  }, [biometricAvailable]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === "active" &&
        (nextAppState === "background" || nextAppState === "inactive")
      ) {
        lastActiveRef.current = Date.now();
      }

      if (
        nextAppState === "active" &&
        (appStateRef.current === "background" || appStateRef.current === "inactive")
      ) {
        const elapsed = Date.now() - lastActiveRef.current;
        if (biometricEnabled && elapsed >= LOCK_TIMEOUT_MS) {
          setIsLocked(true);
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [biometricEnabled]);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && !biometricAvailable) {
      return;
    }
    setBiometricEnabledState(enabled);
    await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? "true" : "false");
  }, [biometricAvailable]);

  const requireAuth = useCallback(async (): Promise<boolean> => {
    if (!biometricEnabled || !biometricAvailable) return true;
    return authenticate();
  }, [biometricEnabled, biometricAvailable, authenticate]);

  if (isLocked && biometricEnabled) {
    return (
      <View style={lockStyles.container}>
        <View style={lockStyles.content}>
          <Ionicons name="lock-closed" size={64} color="#189553" />
          <Text style={lockStyles.title}>GoRigo is Locked</Text>
          <Text style={lockStyles.subtitle}>Authenticate to continue</Text>
          <Pressable style={lockStyles.unlockButton} onPress={authenticate}>
            <Ionicons name="finger-print" size={24} color="#ffffff" />
            <Text style={lockStyles.unlockText}>Unlock</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <BiometricContext.Provider value={{ isLocked, biometricEnabled, setBiometricEnabled, requireAuth }}>
      {children}
    </BiometricContext.Provider>
  );
}

const lockStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#189553",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  unlockText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
