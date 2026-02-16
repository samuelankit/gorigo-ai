import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { useAuth } from "../_layout";
import { useBranding } from "../../lib/branding-context";

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}

export default function SettingsScreen() {
  const { branding } = useBranding();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: "Account",
      items: [
        { icon: "person-outline", label: "Profile", value: "SuperAdmin" },
        { icon: "business-outline", label: "Organization", value: branding?.brandName || "GoRigo" },
        { icon: "wallet-outline", label: "Billing & Wallet" },
      ],
    },
    {
      title: "Call Center",
      items: [
        { icon: "bar-chart-outline", label: "Analytics" },
        { icon: "shield-checkmark-outline", label: "Compliance" },
        { icon: "globe-outline", label: "International Calling" },
        { icon: "megaphone-outline", label: "Campaigns" },
      ],
    },
    {
      title: "App",
      items: [
        { icon: "notifications-outline", label: "Notifications" },
        { icon: "help-circle-outline", label: "Help & Support" },
        { icon: "information-circle-outline", label: "About", value: "v1.0.0" },
      ],
    },
    {
      title: "",
      items: [
        { icon: "log-out-outline", label: "Sign Out", onPress: handleLogout, destructive: true },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sections.map((section, sIndex) => (
        <View key={sIndex} style={styles.section}>
          {section.title ? (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          ) : null}
          <View style={styles.sectionCard}>
            {section.items.map((item, iIndex) => (
              <View key={item.label}>
                <Pressable
                  style={styles.settingsRow}
                  onPress={item.onPress}
                >
                  <View style={styles.settingsLeft}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.destructive ? Colors.destructive : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.settingsLabel,
                        item.destructive && { color: Colors.destructive },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.settingsRight}>
                    {item.value && (
                      <Text style={styles.settingsValue}>{item.value}</Text>
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.textTertiary}
                    />
                  </View>
                </Pressable>
                {iIndex < section.items.length - 1 && (
                  <View style={styles.separator} />
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.footer}>{branding?.brandName || "GoRigo"} AI Call Center v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.card,
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
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingsLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingsValue: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.xxl + Spacing.md,
  },
  footer: {
    textAlign: "center",
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
});
