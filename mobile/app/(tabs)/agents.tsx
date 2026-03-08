import { View, Text, StyleSheet, ScrollView, Pressable, Switch, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getAgents, updateAgentStatus } from "../../lib/api";
import { useBranding } from "../../lib/branding-context";
import { useTheme } from "../../lib/theme-context";

interface Agent {
  id: number;
  name: string;
  type?: string;
  role?: string;
  agentType?: string;
  enabled: boolean;
  language?: string;
  status?: string;
  greeting?: string;
  [key: string]: any;
}

export default function AgentsScreen() {
  const { branding } = useBranding();
  const { colors } = useTheme();
  const activeColor = branding?.brandColor || colors.primary;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setError(null);
    try {
      const data = await getAgents({ limit: 100 });
      const agentsList = data.agents || data || [];
      const mapped = (Array.isArray(agentsList) ? agentsList : []).map((a: any) => ({
        ...a,
        enabled: a.enabled !== undefined ? a.enabled : a.status === "active",
      }));
      setAgents(mapped);
    } catch (err) {
      console.error("[Agents] Failed to load agents:", err);
      setAgents([]);
      setError("Unable to load agents. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useFocusEffect(
    useCallback(() => {
      loadAgents();
    }, [loadAgents])
  );

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
    return agent.agentType || agent.type || agent.role || "General";
  };

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={activeColor} />
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
          onPress={loadAgents}
          accessibilityLabel="Retry loading agents"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color="white" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>AI Agents</Text>
          <View style={[styles.badge, { backgroundColor: activeColor }]}>
            <Text style={styles.badgeText}>{agents.length}</Text>
          </View>
        </View>
      </View>

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
                  { borderColor: isExpanded ? activeColor : colors.border },
                ]}
                onPress={() => toggleExpanded(agent.id)}
              >
                <View style={styles.agentCardContent}>
                  <View style={[styles.avatar, { backgroundColor: activeColor }]}>
                    <Text style={styles.avatarText}>{avatarInitial}</Text>
                  </View>

                  <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>{agent.name}</Text>
                    <Text style={styles.agentType}>{agentType}</Text>
                  </View>

                  <Switch
                    value={agent.enabled || false}
                    onValueChange={() => handleToggleStatus(agent.id, agent.enabled || false)}
                    trackColor={{ false: colors.border, true: activeColor + "80" }}
                    thumbColor={agent.enabled ? activeColor : colors.textTertiary}
                  />
                </View>

                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: agent.enabled
                              ? colors.success + "20"
                              : colors.warning + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: agent.enabled ? colors.success : colors.warning,
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

                    <Pressable
                      style={[styles.editButton, { borderColor: activeColor }]}
                      onPress={() =>
                        router.push({
                          pathname: "/agent-edit",
                          params: {
                            id: String(agent.id),
                            name: agent.name,
                            agentType: agent.agentType || agent.type || agent.role || "general",
                            language: agent.language || "en-GB",
                            greeting: agent.greeting || "",
                            enabled: String(agent.enabled ?? true),
                          },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${agent.name}`}
                    >
                      <Ionicons name="pencil-outline" size={16} color={activeColor} />
                      <Text style={[styles.editButtonText, { color: activeColor }]}>Edit Agent</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>No Agents Yet</Text>
          <Text style={styles.emptyStateText}>
            Create your first AI agent to get started. Agents handle calls, answer questions, and engage with your customers automatically.
          </Text>
          <Text style={styles.emptyStateHint}>
            Tap the + button below to create one.
          </Text>
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>

    <Pressable
      style={[styles.fab, { backgroundColor: activeColor }]}
      onPress={() => router.push("/agent-edit")}
      accessibilityRole="button"
      accessibilityLabel="Create new agent"
    >
      <Ionicons name="add" size={28} color={colors.white} />
    </Pressable>
    </View>
  );
}

const createStyles = (colors: typeof Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: Spacing.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
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
      color: colors.text,
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
      color: colors.white,
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    agentCard: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.md,
      overflow: "hidden",
    },
    agentCardPressed: {
      backgroundColor: colors.surface,
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
      color: colors.white,
      fontSize: FontSize.lg,
      fontWeight: "700",
    },
    agentInfo: {
      flex: 1,
    },
    agentName: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    agentType: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    expandedDetails: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      backgroundColor: colors.surface,
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
      color: colors.text,
    },
    detailValue: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
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
      paddingHorizontal: Spacing.lg,
    },
    emptyStateTitle: {
      fontSize: FontSize.lg,
      fontWeight: "600",
      color: colors.text,
      marginTop: Spacing.md,
    },
    emptyStateText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginTop: Spacing.sm,
      textAlign: "center",
      paddingHorizontal: Spacing.md,
    },
    emptyStateHint: {
      fontSize: FontSize.sm,
      color: colors.textTertiary,
      marginTop: Spacing.sm,
      textAlign: "center",
      fontStyle: "italic",
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
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      borderWidth: 1,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      marginTop: Spacing.sm,
    },
    editButtonText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    fab: {
      position: "absolute",
      bottom: Spacing.lg,
      right: Spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
