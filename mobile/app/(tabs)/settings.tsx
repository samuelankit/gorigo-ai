import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { useAuth } from "../_layout";
import { useBranding } from "../../lib/branding-context";
import { logout, getUser } from "../../lib/api";
import { router } from "expo-router";

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}

interface UserData {
  name: string;
  email: string;
  role?: string;
}

export default function SettingsScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const [userData, setUserData] = useState<UserData>({
    name: "User",
    email: "",
    role: "Admin",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const user = await getUser();
      setUserData({
        name: user.name || user.email?.split("@")[0] || "User",
        email: user.email || "",
        role: user.role || "Admin",
      });
    } catch (err) {
      console.error("Failed to load user data:", err);
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
            router.replace("/(auth)/login");
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

  const accountSectionItems: SettingsItem[] = [
    {
      icon: "person-outline",
      label: "Edit Profile",
      onPress: () => comingSoon("Edit Profile"),
    },
    {
      icon: "lock-closed-outline",
      label: "Change Password",
      onPress: () => comingSoon("Change Password"),
    },
    {
      icon: "notifications-outline",
      label: "Notification Preferences",
      onPress: () => comingSoon("Notification Preferences"),
    },
  ];

  const businessSectionItems: SettingsItem[] = [
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
      label: "Theme",
      onPress: () => comingSoon("Theme"),
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
      onPress: () => comingSoon("Help Center"),
    },
    {
      icon: "mail-outline",
      label: "Contact Support",
      onPress: () => Alert.alert("Contact Support", "Email: support@gorigo.ai\n\nWe typically respond within 24 hours."),
    },
    {
      icon: "document-text-outline",
      label: "Terms of Service",
      onPress: () => comingSoon("Terms of Service"),
    },
    {
      icon: "shield-checkmark-outline",
      label: "Privacy Policy",
      onPress: () => comingSoon("Privacy Policy"),
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
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
      {/* Profile Section */}
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

      {/* Settings Sections */}
      {sections.map((section, sIndex) => (
        <View key={sIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
          <View style={[styles.sectionCard, { backgroundColor: Colors.card }]}>
            {section.items.map((item, iIndex) => (
              <View key={item.label}>
                <Pressable
                  style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
                  onPress={item.onPress}
                >
                  <View style={styles.settingsLeft}>
                    <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </Pressable>
                {iIndex < section.items.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Sign Out Button */}
      <View style={styles.signOutSection}>
        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* App Version */}
      <Text style={styles.versionText}>GoRigo v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
    color: Colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  settingsRowPressed: {
    backgroundColor: Colors.surface,
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  settingsLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.xxl + Spacing.md,
  },
  signOutSection: {
    marginBottom: Spacing.lg,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.destructive,
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
    color: Colors.textTertiary,
    paddingBottom: Spacing.md,
  },
});
