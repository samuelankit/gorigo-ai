import { Platform, Alert } from "react-native";
import * as Device from "expo-device";

export type DeviceRiskLevel = "safe" | "warning" | "compromised";

interface IntegrityResult {
  riskLevel: DeviceRiskLevel;
  reasons: string[];
}

const ANDROID_ROOT_INDICATORS = [
  "/system/app/Superuser.apk",
  "/system/xbin/su",
  "/system/bin/su",
  "/sbin/su",
  "/data/local/xbin/su",
  "/data/local/bin/su",
  "/data/local/su",
  "/su/bin/su",
  "/system/bin/.ext/.su",
  "/system/usr/we-need-root/su-backup",
  "/system/app/Magisk.apk",
  "/system/app/MagiskManager.apk",
  "/data/adb/magisk",
];

const IOS_JAILBREAK_INDICATORS = [
  "/Applications/Cydia.app",
  "/Library/MobileSubstrate/MobileSubstrate.dylib",
  "/bin/bash",
  "/usr/sbin/sshd",
  "/etc/apt",
  "/usr/bin/ssh",
  "/private/var/lib/apt",
  "/private/var/lib/cydia",
  "/private/var/stash",
  "/Applications/Sileo.app",
  "/var/jb",
];

async function checkFileExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(`file://${path}`, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkRootIndicators(): Promise<string[]> {
  const reasons: string[] = [];
  const indicators =
    Platform.OS === "android" ? ANDROID_ROOT_INDICATORS : IOS_JAILBREAK_INDICATORS;

  for (const path of indicators) {
    const exists = await checkFileExists(path);
    if (exists) {
      reasons.push(`Suspicious path detected: ${path}`);
      break;
    }
  }

  return reasons;
}

export async function checkDeviceIntegrity(): Promise<IntegrityResult> {
  const reasons: string[] = [];

  if (Platform.OS === "web") {
    return { riskLevel: "safe", reasons: [] };
  }

  if (!Device.isDevice) {
    reasons.push("Running on emulator/simulator");
  }

  if (Platform.OS === "android" || Platform.OS === "ios") {
    try {
      const rootReasons = await checkRootIndicators();
      reasons.push(...rootReasons);
    } catch {
    }
  }

  let riskLevel: DeviceRiskLevel = "safe";
  if (reasons.length > 0) {
    const hasRoot = reasons.some((r) => r.includes("Suspicious path"));
    riskLevel = hasRoot ? "compromised" : "warning";
  }

  return { riskLevel, reasons };
}

export function showSecurityWarning(result: IntegrityResult): void {
  if (result.riskLevel === "safe") return;

  const title =
    result.riskLevel === "compromised"
      ? "Security Warning"
      : "Device Notice";

  const message =
    result.riskLevel === "compromised"
      ? "This device appears to be rooted or jailbroken. Your data may be at risk. We recommend using a secure device for sensitive operations."
      : "This device may have reduced security. Some features may behave differently.";

  Alert.alert(title, message, [{ text: "I Understand", style: "default" }]);
}
