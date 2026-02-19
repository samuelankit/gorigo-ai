import { View, Text, StyleSheet, ScrollView, Pressable, Switch, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getAgents, updateAgentStatus } from "../../lib/api";
import { useBranding } from "../../lib/branding-context";

interface Agent {
  id: number;
  name: string;
  type?: string;
  role?: string;
  enabled: boolean;
  language?: string;
  status?: string;
  [key: string]: any;
}

export default function AgentsScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      const data = await getAgents({ limit: 100 });
      const agentsList = data.agents || data || [];
      setAgents(Array.isArray(agentsList) ? agentsList : []);
    } catch (err) {
      console.error("[Agents] Failed to load agents:", err);
      setAgents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAgents();
  }, [loadAgents]);

  const handleToggleStatus = useCallback(
    async (agentId: number, currentStatus: boolean) => {
      try {
        const newStatus = !currentStatus;
        await updateAgentStatus(agentId, newStatus);
        setAgents((prevAgents) =>
          prevAgents.map((agent) =>
            agent.id === agentId ? { ...agent, enabled: newStatus } : agent
          )
        );
      } catch (err) {
        console.error("[Agents] Failed to update agent status:", err);
      }
    },
    []
  );

  const toggleExpanded = useCallback((agentId: number) => {
    setExpandedAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);

  const getAvatarInitial = (name: string): string => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";
  };

  const getAgentType = (agent: Agent): string => {
    return agent.type || agent.role || "General";
  };

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
      {/* Header with count badge */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>AI Agents</Text>
          <View style={[styles.badge, { backgroundColor: activeColor }]}>
            <Text style={styles.badgeText}>{agents.length}</Text>
          </View>
        </View>
      </View>

      {/* Agents List */}
      {agents.length > 0 ? (
        <View>
          {agents.map((agent) => {
            const isExpanded = expandedAgentId === agent.id;
            const agentType = getAgentType(agent);
            const avatarInitial = getAvatarInitial(agent.name);

            return (
              <Pressable
                key={agent.id}
                style={({ pressed }) => [
                  styles.agentCard,
                  pressed && styles.agentCardPressed,
                  { borderColor: isExpanded ? activeColor : Colors.border },
                ]}
                onPress={() => toggleExpanded(agent.id)}
              >
                <View style={styles.agentCardContent}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: activeColor }]}>
                    <Text style={styles.avatarText}>{avatarInitial}</Text>
                  </View>

                  {/* Agent Info */}
                  <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>{agent.name}</Text>
                    <Text style={styles.agentType}>{agentType}</Text>
                  </View>

                  {/* Toggle Switch */}
                  <Switch
                    value={agent.enabled || false}
                    onValueChange={() => handleToggleStatus(agent.id, agent.enabled || false)}
                    trackColor={{ false: Colors.border, true: activeColor + "80" }}
                    thumbColor={agent.enabled ? activeColor : Colors.textTertiary}
                  />
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: agent.enabled
                              ? Colors.success + "20"
                              : Colors.warning + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: agent.enabled ? Colors.success : Colors.warning,
                            },
                          ]}
                        >
                          {agent.enabled ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>

                    {agent.language && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Language:</Text>
                        <Text style={styles.detailValue}>{agent.language}</Text>
                      </View>
                    )}

                    {agent.status && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Details:</Text>
                        <Text style={styles.detailValue}>{agent.status}</Text>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>ID:</Text>
                      <Text style={styles.detailValue}>{agent.id}</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>No Agents Found</Text>
          <Text style={styles.emptyStateText}>
            You don't have any AI agents configured yet.
          </Text>
        </View>
      )}

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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  agentCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  agentCardPressed: {
    backgroundColor: Colors.surface,
  },
  agentCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: "700",
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
  },
  expandedDetails: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "right",
    flex: 1,
    marginLeft: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    opacity: 0.6,
  },
  emptyStateTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
});
