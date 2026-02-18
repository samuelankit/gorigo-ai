import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getCalls, getAdminStats, apiRequest } from "../../lib/api";
import { useBranding } from "../../lib/branding-context";
import { router } from "expo-router";

type FilterType = "all" | "calls" | "alerts" | "wallet";

interface ActivityItem {
  id: string;
  type: "call" | "alert" | "wallet";
  title: string;
  subtitle: string;
  timestamp: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  status?: string;
  meta?: Record<string, any>;
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

export default function ActivityScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const [filter, setFilter] = useState<FilterType>("all");
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    try {
      const [callsResult, txResult] = await Promise.allSettled([
        getCalls({ limit: 50 }),
        apiRequest("/api/wallet/transactions?limit=20"),
      ]);

      const activityItems: ActivityItem[] = [];

      if (callsResult.status === "fulfilled") {
        const callsData = callsResult.value?.calls || callsResult.value || [];
        for (const call of callsData) {
          activityItems.push({
            id: `call-${call.id}`,
            type: "call",
            title: call.phoneNumber || call.callerNumber || "Unknown Caller",
            subtitle: `${call.direction || "inbound"} \u00b7 ${call.agentName || "Unassigned"} \u00b7 ${call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}` : "0:00"}`,
            timestamp: call.startTime || call.createdAt || new Date().toISOString(),
            icon: call.direction === "outbound" ? "arrow-up-outline" : "call-outline",
            iconColor: call.status === "completed" ? Colors.success : call.status === "failed" ? Colors.destructive : "#3b82f6",
            status: call.status,
            meta: call,
          });
        }
      }

      if (txResult.status === "fulfilled") {
        const txData = txResult.value?.transactions || txResult.value || [];
        for (const tx of txData) {
          const isCredit = tx.type === "topup" || tx.type === "credit" || tx.type === "refund";
          activityItems.push({
            id: `wallet-${tx.id}`,
            type: "wallet",
            title: tx.description || tx.type || "Transaction",
            subtitle: `${isCredit ? "+" : "-"}$${Math.abs(Number(tx.amount || 0)).toFixed(4)}`,
            timestamp: tx.createdAt || new Date().toISOString(),
            icon: isCredit ? "arrow-down-circle-outline" : "arrow-up-circle-outline",
            iconColor: isCredit ? Colors.success : "#f59e0b",
            status: tx.type,
            meta: tx,
          });
        }
      }

      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setItems(activityItems);
    } catch (err) {
      console.error("[Activity] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, [loadActivity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActivity();
    setRefreshing(false);
  }, [loadActivity]);

  const filteredItems = filter === "all" ? items : items.filter((i) => i.type === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "calls", label: "Calls" },
    { key: "alerts", label: "Alerts" },
    { key: "wallet", label: "Wallet" },
  ];

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <Pressable
      style={styles.activityCard}
      onPress={() => {
        if (item.type === "call" && item.meta?.id) {
          router.push({ pathname: "/call-detail", params: { id: item.meta.id } });
        }
      }}
    >
      <View style={[styles.activityIcon, { backgroundColor: item.iconColor + "14" }]}>
        <Ionicons name={item.icon} size={18} color={item.iconColor} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
      </View>
      <View style={styles.activityRight}>
        <Text style={styles.activityTime}>{formatTimeAgo(item.timestamp)}</Text>
        {item.status && (
          <View style={[styles.statusDot, { backgroundColor: item.iconColor }]} />
        )}
      </View>
    </Pressable>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="pulse-outline" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptyDesc}>Calls, alerts, and transactions will show up here</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, filter === f.key && { backgroundColor: activeColor + "18", borderColor: activeColor + "40" }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && { color: activeColor, fontWeight: "600" }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
        ListEmptyComponent={!loading ? EmptyState : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterRow: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.md,
    flexGrow: 1,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  activitySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activityRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  activityTime: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
