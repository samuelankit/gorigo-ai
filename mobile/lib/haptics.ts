import { Platform } from "react-native";

type ImpactStyle = "light" | "medium" | "heavy";
type NotificationType = "success" | "warning" | "error";

async function getHaptics() {
  try {
    return await import("expo-haptics");
  } catch {
    return null;
  }
}

export async function impactFeedback(style: ImpactStyle = "light"): Promise<void> {
  if (Platform.OS === "web") return;
  const Haptics = await getHaptics();
  if (!Haptics) return;

  const styleMap: Record<ImpactStyle, any> = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  };
  await Haptics.impactAsync(styleMap[style]);
}

export async function notificationFeedback(type: NotificationType = "success"): Promise<void> {
  if (Platform.OS === "web") return;
  const Haptics = await getHaptics();
  if (!Haptics) return;

  const typeMap: Record<NotificationType, any> = {
    success: Haptics.NotificationFeedbackType.Success,
    warning: Haptics.NotificationFeedbackType.Warning,
    error: Haptics.NotificationFeedbackType.Error,
  };
  await Haptics.notificationAsync(typeMap[type]);
}

export async function selectionFeedback(): Promise<void> {
  if (Platform.OS === "web") return;
  const Haptics = await getHaptics();
  if (!Haptics) return;
  await Haptics.selectionAsync();
}
