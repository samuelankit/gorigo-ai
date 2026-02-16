import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getAdminStats, getWallet } from "../../lib/api";
import { useBranding } from "../../lib/branding-context";

interface StatCard {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function DashboardScreen() {
  const { branding } = useBranding();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatCard[]>([
    { label: "Total Calls", value: "0", icon: "call", color: Colors.primary },
    { label: "Clients", value: "0", icon: "trending-up", color: "#3b82f6" },
    { label: "Partners", value: "0", icon: "people", color: "#8b5cf6" },
    { label: "Wallet Balance", value: "0.00", icon: "wallet", color: "#f59e0b" },
  ]);

  const loadData = useCallback(async () => {
    try {
      const [dashData, walletData] = await Promise.allSettled([
        getAdminStats(),
        getWallet(),
      ]);

      setStats((prev) => {
        const updated = [...prev];
        if (dashData.status === "fulfilled") {
          const d = dashData.value;
          updated[0] = { ...updated[0], value: String(d.totalCalls || 0) };
          updated[1] = { ...updated[1], value: String(d.totalClients || 0) };
          updated[2] = { ...updated[2], value: String(d.totalPartners || 0) };
        }
        if (walletData.status === "fulfilled") {
          const w = walletData.value?.wallet;
          updated[3] = {
            ...updated[3],
            value: `${Number(w?.balance || 0).toFixed(2)}`,
          };
        }
        return updated;
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{branding?.brandName || "GoRigo"}</Text>
        <Text style={styles.subtitle}>Your AI Call Center</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + "14" }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={styles.voiceCta}
        onPress={() => router.push("/(tabs)/voice")}
      >
        <View style={styles.voiceCtaInner}>
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={28} color={Colors.white} />
          </View>
          <View style={styles.voiceCtaText}>
            <Text style={styles.voiceCtaTitle}>Voice Control</Text>
            <Text style={styles.voiceCtaDesc}>
              Tap to manage your call center by voice
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </View>
      </Pressable>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {[
            { label: "View Calls", icon: "call-outline" as const, route: "/(tabs)/calls" },
            { label: "Manage Agents", icon: "people-outline" as const, route: "/(tabs)/agents" },
            { label: "Top Up Wallet", icon: "wallet-outline" as const, route: "/(tabs)/settings" },
            { label: "Analytics", icon: "bar-chart-outline" as const, route: "/(tabs)/settings" },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
            >
              <Ionicons name={action.icon} size={24} color={Colors.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.hero,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  voiceCta: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  voiceCtaInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  micCircle: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceCtaText: {
    flex: 1,
  },
  voiceCtaTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
  },
  voiceCtaDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  actionCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.text,
  },
});
