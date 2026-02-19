import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getAdminStats, getTodayCalls, getWallet, getCalls, getUser } from "../../lib/api";
import { useAuth } from "../_layout";
import { router } from "expo-router";
import DashboardCard from "../../components/DashboardCard";
import StatusBadge from "../../components/StatusBadge";
import { useBranding } from "../../lib/branding-context";

interface DashboardData {
  callsToday: number;
  activeAgents: number;
  walletBalance: number;
  revenue: number;
  recentCalls: any[];
  userName: string;
}

const formatTimeAgo = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

export default function DashboardScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const [data, setData] = useState<DashboardData>({
    callsToday: 0,
    activeAgents: 0,
    walletBalance: 0,
    revenue: 0,
    recentCalls: [],
    userName: "User",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsResult, todayCallsResult, walletResult, callsResult, userResult] = await Promise.allSettled([
        getAdminStats(),
        getTodayCalls(),
        getWallet(),
        getCalls({ limit: 5 }),
        getUser(),
      ]);

      let callsToday = 0;
      let activeAgents = 0;
      let walletBalance = 0;
      let revenue = 0;
      let recentCalls: any[] = [];
      let userName = "User";

      if (statsResult.status === "fulfilled" && statsResult.value) {
        const stats = statsResult.value;
        callsToday = stats.callsToday || stats.totalCalls || 0;
        activeAgents = stats.activeAgents || stats.totalAgents || 0;
        revenue = stats.revenue || stats.totalRevenue || 0;
      }

      if (walletResult.status === "fulfilled" && walletResult.value) {
        walletBalance = walletResult.value.balance || walletResult.value.amount || 0;
      }

      if (callsResult.status === "fulfilled" && callsResult.value) {
        const callsData = callsResult.value?.calls || callsResult.value || [];
        recentCalls = Array.isArray(callsData) ? callsData.slice(0, 5) : [];
      }

      if (userResult.status === "fulfilled" && userResult.value) {
        userName = userResult.value.name || userResult.value.email?.split("@")[0] || "User";
      }

      setData({
        callsToday,
        activeAgents,
        walletBalance,
        revenue,
        recentCalls,
        userName,
      });
    } catch (err) {
      console.error("[Dashboard] Failed to load data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={activeColor} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {data.userName}!</Text>
          <Text style={styles.date}>{currentDate}</Text>
        </View>
      </View>

      {/* Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        <DashboardCard
          title="Calls Today"
          value={data.callsToday.toLocaleString()}
          icon="call-outline"
          color={Colors.primary}
        />
        <DashboardCard
          title="Active Agents"
          value={data.activeAgents.toLocaleString()}
          icon="people-outline"
          color="#06b6d4"
        />
      </View>

      <View style={styles.metricsGrid}>
        <DashboardCard
          title="Wallet Balance"
          value={`£${(data.walletBalance || 0).toFixed(2)}`}
          icon="wallet-outline"
          color="#f59e0b"
        />
        <DashboardCard
          title="Revenue"
          value={`£${(data.revenue || 0).toFixed(2)}`}
          icon="trending-up-outline"
          color="#8b5cf6"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, { backgroundColor: activeColor }, pressed && styles.pressed]}
            onPress={() => router.push("/new-call")}
          >
            <Ionicons name="call-outline" size={18} color="white" />
            <Text style={styles.actionButtonText}>New Call</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionButton, { backgroundColor: "#f59e0b" }, pressed && styles.pressed]}
            onPress={() => router.push("/wallet")}
          >
            <Ionicons name="add-circle-outline" size={18} color="white" />
            <Text style={styles.actionButtonText}>Top Up</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionButton, { backgroundColor: "#06b6d4" }, pressed && styles.pressed]}
            onPress={() => router.push("/agents")}
          >
            <Ionicons name="people-outline" size={18} color="white" />
            <Text style={styles.actionButtonText}>View Agents</Text>
          </Pressable>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable onPress={() => router.push("/(tabs)/activity")}>
            <Text style={[styles.viewAllText, { color: activeColor }]}>View All</Text>
          </Pressable>
        </View>

        {data.recentCalls.length > 0 ? (
          <View>
            {data.recentCalls.map((call, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [styles.activityItem, pressed && styles.activityItemPressed]}
                onPress={() => router.push(`/call-detail?id=${call.id}`)}
              >
                <View style={[styles.activityIcon, { backgroundColor: activeColor + "14" }]}>
                  <Ionicons
                    name={call.direction === "outbound" ? "arrow-up-outline" : "call-outline"}
                    size={18}
                    color={activeColor}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{call.phoneNumber || call.callerNumber || "Unknown"}</Text>
                  <Text style={styles.activitySubtitle}>
                    {call.duration ? formatDuration(Math.floor(call.duration / 1000)) : "0:00"} •{" "}
                    {formatTimeAgo(call.startTime || call.createdAt)}
                  </Text>
                </View>
                <View style={styles.activityStatusContainer}>
                  <StatusBadge status={call.status || "pending"} size="sm" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="call-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyStateText}>No recent calls</Text>
          </View>
        )}
      </View>

      {/* Bottom spacing */}
      <View style={{ height: Spacing.lg }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  viewAllText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    color: "white",
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  activityItemPressed: {
    backgroundColor: Colors.surface,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  activitySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activityStatusContainer: {
    alignItems: "flex-end",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
