import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert } from "react-native";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { useBranding } from "../lib/branding-context";
import { useTheme } from "../lib/theme-context";
import { getNotificationIcon, getNotificationColor } from "../lib/push-notifications";

const PREFS_KEY = "gorigo-notification-prefs";

interface NotificationPref {
  key: "low_wallet" | "agent_offline" | "fraud_alert" | "quality_drop" | "general";
  label: string;
  description: string;
}

const NOTIFICATION_TYPES: NotificationPref[] = [
  {
    key: "low_wallet",
    label: "Low Wallet",
    description: "Get notified when your wallet balance drops below the threshold",
  },
  {
    key: "agent_offline",
    label: "Agent Offline",
    description: "Get notified when an AI agent goes offline unexpectedly",
  },
  {
    key: "fraud_alert",
    label: "Fraud Alert",
    description: "Get notified about suspicious activity or potential fraud",
  },
  {
    key: "quality_drop",
    label: "Quality Drop",
    description: "Get notified when call quality drops below acceptable levels",
  },
  {
    key: "general",
    label: "General",
    description: "System updates, tips, and other general notifications",
  },
];

export type NotificationPrefs = Record<string, boolean>;

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const defaults: NotificationPrefs = {};
  NOTIFICATION_TYPES.forEach((t) => {
    defaults[t.key] = true;
  });
  return defaults;
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export default function NotificationPreferencesScreen() {
  const { branding } = useBranding();
  const { colors } = useTheme();
  const activeColor = branding?.brandColor || colors.primary;
  const [prefs, setPrefs] = useState<NotificationPrefs>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = useCallback(async () => {
    const stored = await getNotificationPrefs();
    setPrefs(stored);
    setLoading(false);
  }, []);

  const handleToggle = useCallback(async (key: string) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveNotificationPrefs(updated);
      return updated;
    });
  }, []);

  const handleEnableAll = useCallback(async () => {
    const updated: NotificationPrefs = {};
    NOTIFICATION_TYPES.forEach((t) => {
      updated[t.key] = true;
    });
    setPrefs(updated);
    await saveNotificationPrefs(updated);
  }, []);

  const handleDisableAll = useCallback(async () => {
    Alert.alert(
      "Disable All Notifications",
      "You won't receive any push notifications. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable All",
          style: "destructive",
          onPress: async () => {
            const updated: NotificationPrefs = {};
            NOTIFICATION_TYPES.forEach((t) => {
              updated[t.key] = false;
            });
            setPrefs(updated);
            await saveNotificationPrefs(updated);
          },
        },
      ]
    );
  }, []);

  const allEnabled = NOTIFICATION_TYPES.every((t) => prefs[t.key] !== false);
  const allDisabled = NOTIFICATION_TYPES.every((t) => prefs[t.key] === false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Ionicons name="notifications-outline" size={24} color={activeColor} />
        <Text style={styles.headerTitle}>Push Notifications</Text>
        <Text style={styles.headerDescription}>
          Choose which notifications you want to receive on this device.
        </Text>
      </View>

      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [
            styles.quickActionButton,
            { backgroundColor: allEnabled ? colors.surface : activeColor },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleEnableAll}
          disabled={allEnabled}
          accessibilityLabel="Enable all notifications"
          accessibilityRole="button"
          data-testid="button-enable-all-notifications"
        >
          <Text style={[styles.quickActionText, { color: allEnabled ? colors.textTertiary : colors.white }]}>
            Enable All
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.quickActionButton,
            { backgroundColor: allDisabled ? colors.surface : colors.destructive },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleDisableAll}
          disabled={allDisabled}
          accessibilityLabel="Disable all notifications"
          accessibilityRole="button"
          data-testid="button-disable-all-notifications"
        >
          <Text style={[styles.quickActionText, { color: allDisabled ? colors.textTertiary : colors.white }]}>
            Disable All
          </Text>
        </Pressable>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
        {NOTIFICATION_TYPES.map((item, index) => {
          const iconName = getNotificationIcon(item.key) as keyof typeof Ionicons.glyphMap;
          const iconColor = getNotificationColor(item.key);
          const enabled = prefs[item.key] !== false;

          return (
            <View key={item.key}>
              <Pressable
                style={styles.prefRow}
                onPress={() => handleToggle(item.key)}
                accessibilityLabel={`${item.label} notifications, currently ${enabled ? "enabled" : "disabled"}`}
                accessibilityRole="switch"
                data-testid={`toggle-notification-${item.key}`}
              >
                <View style={[styles.iconCircle, { backgroundColor: iconColor + "15" }]}>
                  <Ionicons name={iconName} size={20} color={iconColor} />
                </View>
                <View style={styles.prefInfo}>
                  <Text style={styles.prefLabel}>{item.label}</Text>
                  <Text style={styles.prefDescription}>{item.description}</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={() => handleToggle(item.key)}
                  trackColor={{ false: colors.border, true: activeColor + "80" }}
                  thumbColor={enabled ? activeColor : colors.textTertiary}
                  accessibilityLabel={`Toggle ${item.label} notifications`}
                />
              </Pressable>
              {index < NOTIFICATION_TYPES.length - 1 && <View style={styles.separator} />}
            </View>
          );
        })}
      </View>

      <Text style={styles.footerText}>
        Notification preferences are stored locally on this device. Disabling a notification type will prevent it from appearing on this device.
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors: typeof Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Spacing.md,
      paddingBottom: Spacing.xxl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
    },
    headerCard: {
      alignItems: "center",
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
    headerTitle: {
      fontSize: FontSize.lg,
      fontWeight: "700",
      color: colors.text,
      marginTop: Spacing.sm,
    },
    headerDescription: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: Spacing.xs,
      lineHeight: 20,
    },
    quickActions: {
      flexDirection: "row",
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    quickActionButton: {
      flex: 1,
      paddingVertical: Spacing.sm + 4,
      borderRadius: BorderRadius.md,
      alignItems: "center",
    },
    quickActionText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    sectionCard: {
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    prefRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: Spacing.md,
      gap: Spacing.md,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    prefInfo: {
      flex: 1,
    },
    prefLabel: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    prefDescription: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 16,
    },
    separator: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginLeft: Spacing.md + 40 + Spacing.md,
    },
    footerText: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
      textAlign: "center",
      marginTop: Spacing.lg,
      lineHeight: 18,
      paddingHorizontal: Spacing.md,
    },
  });
