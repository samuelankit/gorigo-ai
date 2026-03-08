import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch, Linking } from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { useAuth } from "../_layout";
import { useBranding } from "../../lib/branding-context";
import { useTheme } from "../../lib/theme-context";
import { logout, getUser } from "../../lib/api";
import { router } from "expo-router";

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

interface UserData {
  name: string;
  email: string;
  role?: string;
}

export default function SettingsScreen() {
  const { branding } = useBranding();
  const { colors, mode, toggleTheme } = useTheme();
  const activeColor = branding?.brandColor || colors.primary;
  const [userData, setUserData] = useState<UserData>({
    name: "User",
    email: "",
    role: "Admin",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = useCallback(async () => {
    setError(null);
    try {
      const user = await getUser();
      setUserData({
        name: user.name || user.email?.split("@")[0] || "User",
        email: user.email || "",
        role: user.role || "Admin",
      });
    } catch (err) {
      console.error("Failed to load user data:", err);
      setError("Unable to load settings. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/login");
          } catch (err) {
            console.error("Logout failed:", err);
          }
        },
      },
    ]);
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const comingSoon = (feature: string) => {
    Alert.alert(feature, "This feature is coming soon in a future update.");
  };

  const openURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error("Failed to open URL:", err);
      Alert.alert("Error", "Unable to open the requested link.");
    }
  };

  const accountSectionItems: SettingsItem[] = [
    {
      icon: "person-outline",
      label: "Edit Profile",
      onPress: () => router.push("/edit-profile" as any),
    },
    {
      icon: "lock-closed-outline",
      label: "Change Password",
      onPress: () => router.push("/change-password" as any),
    },
    {
      icon: "notifications-outline",
      label: "Notification Preferences",
      onPress: () => router.push("/notification-preferences" as any),
    },
  ];

  const businessSectionItems: SettingsItem[] = [
    {
      icon: "megaphone-outline",
      label: "Campaigns",
      onPress: () => router.push("/campaigns" as any),
    },
    {
      icon: "business-outline",
      label: "Switch Business",
      onPress: () => comingSoon("Switch Business"),
    },
    {
      icon: "settings-outline",
      label: "Manage Businesses",
      onPress: () => comingSoon("Manage Businesses"),
    },
  ];

  const appSectionItems: SettingsItem[] = [
    {
      icon: "contrast-outline",
      label: "Dark Mode",
      rightElement: (
        <Switch
          value={mode === "dark"}
          onValueChange={toggleTheme}
          trackColor={{ false: colors.border, true: activeColor + "80" }}
          thumbColor={mode === "dark" ? activeColor : colors.textTertiary}
        />
      ),
    },
    {
      icon: "language-outline",
      label: "Language",
      onPress: () => comingSoon("Language"),
    },
    {
      icon: "information-circle-outline",
      label: "About",
      onPress: () => Alert.alert("About GoRigo", "GoRigo AI Call Center v1.0.0\n\nInternational Business Exchange Limited\nCotton Court Business Centre\nPreston PR1 3BY, England"),
    },
  ];

  const supportSectionItems: SettingsItem[] = [
    {
      icon: "help-circle-outline",
      label: "Help Center",
      onPress: () => openURL("https://gorigo.ai/pricing#faq"),
    },
    {
      icon: "mail-outline",
      label: "Contact Support",
      onPress: () => openURL("mailto:support@gorigo.ai"),
    },
    {
      icon: "document-text-outline",
      label: "Terms of Service",
      onPress: () => openURL("https://gorigo.ai/policies/terms"),
    },
    {
      icon: "shield-checkmark-outline",
      label: "Privacy Policy",
      onPress: () => openURL("https://gorigo.ai/policies/privacy"),
    },
  ];

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.errorTitle}>Something Went Wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, { backgroundColor: activeColor }, pressed && { opacity: 0.8 }]}
          onPress={loadUserData}
          accessibilityLabel="Retry loading settings"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color="white" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const sections: { title: string; items: SettingsItem[] }[] = [
    { title: "Account", items: accountSectionItems },
    { title: "Business", items: businessSectionItems },
    { title: "App", items: appSectionItems },
    { title: "Support", items: supportSectionItems },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.profileSection}>
        <View style={[styles.avatarCircle, { backgroundColor: activeColor + "20" }]}>
          <Text style={[styles.avatarText, { color: activeColor }]}>{getInitials(userData.name)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userData.name}</Text>
          <Text style={styles.profileEmail}>{userData.email}</Text>
          {userData.role && (
            <View style={[styles.roleBadge, { backgroundColor: activeColor + "15" }]}>
              <Text style={[styles.roleBadgeText, { color: activeColor }]}>{userData.role}</Text>
            </View>
          )}
        </View>
      </View>

      {sections.map((section, sIndex) => (
        <View key={sIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            {section.items.map((item, iIndex) => (
              <View key={item.label}>
                <Pressable
                  style={({ pressed }) => [styles.settingsRow, pressed && !item.rightElement && styles.settingsRowPressed]}
                  onPress={item.onPress}
                  disabled={!!item.rightElement && !item.onPress}
                >
                  <View style={styles.settingsLeft}>
                    <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                  </View>
                  {item.rightElement ? (
                    item.rightElement
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  )}
                </Pressable>
                {iIndex < section.items.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.signOutSection}>
        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={styles.versionText}>GoRigo v1.0.0</Text>
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
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    avatarCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: "center",
      alignItems: "center",
      marginRight: Spacing.md,
    },
    avatarText: {
      fontSize: FontSize.xl,
      fontWeight: "700",
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: FontSize.md,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    roleBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
    },
    roleBadgeText: {
      fontSize: FontSize.xs,
      fontWeight: "600",
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontSize: FontSize.xs,
      fontWeight: "600",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    sectionCard: {
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    settingsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: Spacing.md,
    },
    settingsRowPressed: {
      backgroundColor: colors.surface,
    },
    settingsLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      flex: 1,
    },
    settingsLabel: {
      fontSize: FontSize.md,
      color: colors.text,
      fontWeight: "500",
    },
    separator: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginLeft: Spacing.xxl + Spacing.md,
    },
    signOutSection: {
      marginBottom: Spacing.lg,
    },
    signOutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.destructive,
      borderRadius: BorderRadius.md,
      paddingVertical: 14,
      gap: Spacing.sm,
    },
    signOutButtonPressed: {
      opacity: 0.8,
    },
    signOutText: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: "white",
    },
    versionText: {
      textAlign: "center",
      fontSize: FontSize.xs,
      color: colors.textTertiary,
      paddingBottom: Spacing.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      paddingHorizontal: Spacing.lg,
    },
    errorTitle: {
      fontSize: FontSize.lg,
      fontWeight: "600",
      color: colors.text,
      marginTop: Spacing.md,
    },
    errorMessage: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.sm + 4,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.lg,
      gap: Spacing.sm,
    },
    retryButtonText: {
      color: "white",
      fontSize: FontSize.md,
      fontWeight: "600",
    },
  });
