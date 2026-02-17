import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getAgents } from "../../lib/api";
import { useBranding } from "../../lib/branding-context";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  language: string;
  totalCalls: number;
}

export default function AgentsScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const activeLightColor = branding?.brandColor ? `${branding.brandColor}20` : Colors.primaryLight;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    try {
      const data = await getAgents();
      setAgents(data.agents || data || []);
    } catch (err) {
      console.error("[Agents] Failed to load agents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAgents();
    setRefreshing(false);
  }, [loadAgents]);

  const renderAgent = ({ item }: { item: Agent }) => (
    <Pressable style={styles.agentCard}>
      <View style={[styles.avatar, { backgroundColor: activeLightColor }]}>
        <Ionicons name="person" size={20} color={activeColor} />
      </View>
      <View style={styles.agentInfo}>
        <Text style={styles.agentName}>{item.name}</Text>
        <Text style={styles.agentType}>
          {item.type || "General"} {item.language ? `\u00b7 ${item.language}` : ""}
        </Text>
      </View>
      <View style={styles.agentRight}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "active" ? activeLightColor : Colors.borderLight,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: item.status === "active" ? activeColor : Colors.textTertiary },
            ]}
          >
            {item.status || "inactive"}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Agents</Text>
      <Text style={styles.emptyDesc}>Create AI agents to handle your calls</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={agents}
        renderItem={renderAgent}
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
  agentCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  agentType: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  agentRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
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
