import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getCalls } from "../../lib/api";
import { useBranding } from "../../lib/branding-context";

interface Call {
  id: string;
  phoneNumber: string;
  direction: "inbound" | "outbound";
  status: string;
  duration: number;
  agentName: string;
  timestamp: string;
  sentiment?: string;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return Colors.success;
    case "in_progress":
    case "active":
      return "#3b82f6";
    case "failed":
    case "error":
      return Colors.destructive;
    default:
      return Colors.textTertiary;
  }
};

export default function CallsScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const activeLightColor = branding?.brandColor ? `${branding.brandColor}14` : Colors.primaryLight;

  const [calls, setCalls] = useState<Call[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCalls = useCallback(async () => {
    try {
      const data = await getCalls({ limit: 50 });
      setCalls(data.calls || data || []);
    } catch (err) {
      console.error("[Calls] Failed to load calls:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCalls();
    setRefreshing(false);
  }, [loadCalls]);

  const renderCall = ({ item }: { item: Call }) => (
    <Pressable style={styles.callCard}>
      <View style={styles.callLeft}>
        <View
          style={[
            styles.directionIcon,
            {
              backgroundColor:
                item.direction === "inbound" ? "#3b82f614" : activeLightColor,
            },
          ]}
        >
          <Ionicons
            name={item.direction === "inbound" ? "call-outline" : "arrow-up-outline"}
            size={18}
            color={item.direction === "inbound" ? "#3b82f6" : activeColor}
          />
        </View>
        <View style={styles.callInfo}>
          <Text style={styles.callPhone}>{item.phoneNumber || "Unknown"}</Text>
          <Text style={styles.callMeta}>
            {item.agentName || "Unassigned"} {item.duration ? `\u00b7 ${formatDuration(item.duration)}` : ""}
          </Text>
        </View>
      </View>
      <View style={styles.callRight}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {item.status || "pending"}
        </Text>
      </View>
    </Pressable>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="call-outline" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Calls Yet</Text>
      <Text style={styles.emptyDesc}>Calls will appear here as they come in</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        renderItem={renderCall}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />
        }
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
  list: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  callCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  callLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  directionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  callInfo: {
    flex: 1,
  },
  callPhone: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  callMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  callRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: "500",
    textTransform: "capitalize",
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
