import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Alert } from "react-native";

const PUSH_TOKEN_KEY = "gorigo-push-token";
const PUSH_ENABLED_KEY = "gorigo-push-enabled";

export interface NotificationPayload {
  type: "low_wallet" | "fraud_alert" | "agent_offline" | "quality_drop" | "general";
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    if (!Device.isDevice) {
      console.log("[Push] Must use physical device for push notifications");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Notifications Disabled",
        "Enable notifications in your device settings to receive important alerts about your call center."
      );
      return null;
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("gorigo-alerts", {
        name: "GoRigo Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#189553",
        sound: "default",
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "gorigo",
    });

    const token = tokenData.data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    await sendPushTokenToServer(token);
    await AsyncStorage.setItem(PUSH_ENABLED_KEY, "true");

    return token;
  } catch (err) {
    console.error("[Push] Registration failed:", err);
    return null;
  }
}

export async function getPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function isPushEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function disablePushNotifications(): Promise<void> {
  await AsyncStorage.setItem(PUSH_ENABLED_KEY, "false");
}

export async function sendPushTokenToServer(token: string): Promise<void> {
  try {
    const sessionToken = await AsyncStorage.getItem("gorigo-session-token");
    if (!sessionToken) return;

    const baseUrl = Platform.OS === "web"
      ? window.location.origin
      : __DEV__ ? "http://localhost:5000" : "https://gorigo.ai";

    await fetch(`${baseUrl}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (err) {
    console.error("[Push] Failed to register token with server:", err);
  }
}

export function getNotificationIcon(type: NotificationPayload["type"]): string {
  switch (type) {
    case "low_wallet": return "wallet-outline";
    case "fraud_alert": return "shield-outline";
    case "agent_offline": return "people-outline";
    case "quality_drop": return "trending-down-outline";
    default: return "notifications-outline";
  }
}

export function getNotificationColor(type: NotificationPayload["type"]): string {
  switch (type) {
    case "low_wallet": return "#f59e0b";
    case "fraud_alert": return "#ef4444";
    case "agent_offline": return "#6366f1";
    case "quality_drop": return "#f97316";
    default: return "#189553";
  }
}
