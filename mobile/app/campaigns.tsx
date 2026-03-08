import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { apiRequest } from "../lib/api";
import { useBranding } from "../lib/branding-context";

interface Campaign {
  id: number;
  name: string;
  status: string;
  contactsDialed?: number;
  totalContacts?: number;
  costSpent?: number;
  budgetLocked?: number;
  createdAt?: string;
}

export default function CampaignsScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await apiRequest("/api/campaigns");
      const list = Array.isArray(data) ? data : data?.campaigns || data?.data || [];
      setCampaigns(list);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampaigns();
  }, [loadCampaigns]);

  const toggleCampaignStatus = useCallback(async (campaign: Campaign) => {
    const isActive = campaign.status === "active" || campaign.status === "running";
    const newStatus = isActive ? "paused" : "active";
    const actionLabel = isActive ? "Pause" : "Resume";

    Alert.alert(
      `${actionLabel} Campaign`,
      `Are you sure you want to ${actionLabel.toLowerCase()} "${campaign.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel,
          style: isActive ? "destructive" : "default",
          onPress: async () => {
            setTogglingId(campaign.id);
            try {
              await apiRequest(`/api/campaigns/${campaign.id}/status`, {
                method: "PATCH",
                body: { status: newStatus },
              });
              setCampaigns((prev) =>
                prev.map((c) => (c.id === campaign.id ? { ...c, status: newStatus } : c))
              );
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to update campaign status.");
            } finally {
              setTogglingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const getStatusColor = (status: string): string => {
    const s = status.toLowerCase();
    if (["active", "running", "completed"].includes(s)) return Colors.success;
    if (["paused", "pending", "draft"].includes(s)) return Colors.warning;
    if (["failed", "cancelled", "stopped"].includes(s)) return Colors.destructive;
    return Colors.textSecondary;
  };

  const getProgress = (campaign: Campaign): number => {
    const dialed = campaign.contactsDialed || 0;
    const total = campaign.totalContacts || 0;
    if (total === 0) return 0;
    return Math.min(dialed / total, 1);
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
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
      showsVerticalScrollIndicator={false}
    >
      {campaigns.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="megaphone-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Campaigns</Text>
          <Text style={styles.emptySubtitle}>Create campaigns from the web dashboard to manage them here.</Text>
        </View>
      ) : (
        campaigns.map((campaign) => {
          const progress = getProgress(campaign);
          const statusColor = getStatusColor(campaign.status);
          const isActive = campaign.status === "active" || campaign.status === "running";
          const isToggling = togglingId === campaign.id;
          const canToggle = ["active", "running", "paused"].includes(campaign.status.toLowerCase());

          return (
            <View
              key={campaign.id}
              style={styles.campaignCard}
              accessibilityLabel={`Campaign ${campaign.name}, status ${campaign.status}`}
              accessibilityRole="summary"
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.campaignName} numberOfLines={1} data-testid={`text-campaign-name-${campaign.id}`}>
                    {campaign.name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]} data-testid={`text-campaign-status-${campaign.id}`}>
                      {campaign.status}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressValue}>
                    {campaign.contactsDialed || 0} / {campaign.totalContacts || 0}
                  </Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.round(progress * 100)}%`,
                        backgroundColor: activeColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercent}>{Math.round(progress * 100)}% complete</Text>
              </View>

              <View style={styles.costSection}>
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Spent</Text>
                  <Text style={styles.costValue} data-testid={`text-campaign-spent-${campaign.id}`}>
                    £{(campaign.costSpent || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.costDivider} />
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Budget</Text>
                  <Text style={styles.costValue} data-testid={`text-campaign-budget-${campaign.id}`}>
                    £{(campaign.budgetLocked || 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              {canToggle && (
                <Pressable
                  style={({ pressed }) => [
                    styles.toggleButton,
                    {
                      backgroundColor: isActive ? Colors.warning + "15" : activeColor + "15",
                      borderColor: isActive ? Colors.warning + "40" : activeColor + "40",
                    },
                    pressed && styles.toggleButtonPressed,
                  ]}
                  onPress={() => toggleCampaignStatus(campaign)}
                  disabled={isToggling}
                  accessibilityLabel={isActive ? `Pause campaign ${campaign.name}` : `Resume campaign ${campaign.name}`}
                  accessibilityRole="button"
                  data-testid={`button-toggle-campaign-${campaign.id}`}
                >
                  {isToggling ? (
                    <ActivityIndicator size="small" color={isActive ? Colors.warning : activeColor} />
                  ) : (
                    <>
                      <Ionicons
                        name={isActive ? "pause-outline" : "play-outline"}
                        size={16}
                        color={isActive ? Colors.warning : activeColor}
                      />
                      <Text
                        style={[
                          styles.toggleButtonText,
                          { color: isActive ? Colors.warning : activeColor },
                        ]}
                      >
                        {isActive ? "Pause" : "Resume"}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          );
        })
      )}
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  campaignCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  campaignName: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  progressValue: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  costSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  costItem: {
    flex: 1,
    alignItems: "center",
  },
  costLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  costValue: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  costDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.borderLight,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  toggleButtonPressed: {
    opacity: 0.7,
  },
  toggleButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
