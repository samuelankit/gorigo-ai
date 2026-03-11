import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { apiRequest } from "../lib/api";
import { useBranding } from "../lib/branding-context";
import { useTheme } from "../lib/theme-context";
import { impactFeedback, notificationFeedback } from "../lib/haptics";
import CampaignProgress from "../components/CampaignProgress";

interface CampaignDetail {
  id: number;
  name: string;
  status: string;
  totalContacts: number;
  completedCount: number;
  answeredCount: number;
  failedCount: number;
  pendingCount?: number;
  budgetCap: number;
  budgetSpent: number;
  agentName: string;
  callingHoursStart?: string;
  callingHoursEnd?: string;
  callingTimezone?: string;
  createdAt: string;
  estimatedCost?: number;
  walletBalance?: number;
}

export default function CampaignDetailScreen() {
  const { branding } = useBranding();
  const { colors } = useTheme();
  const activeColor = branding?.brandColor || colors.primary;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadCampaign = useCallback(async () => {
    try {
      const data = await apiRequest(`/api/mobile/campaigns/${id}`);
      setCampaign(data.campaign || data);
    } catch (err) {
      console.error("[CampaignDetail] Failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadCampaign();
  }, [id, loadCampaign]);

  useEffect(() => {
    if (campaign?.status === "running") {
      intervalRef.current = setInterval(() => {
        loadCampaign();
      }, 10000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [campaign?.status, loadCampaign]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampaign();
  }, [loadCampaign]);

  const handleApprove = useCallback(async () => {
    if (!campaign) return;
    await impactFeedback("medium");

    const estimateText = campaign.estimatedCost
      ? `Estimated cost: £${campaign.estimatedCost.toFixed(2)}`
      : `Contacts: ${campaign.totalContacts}`;
    const balanceText = campaign.walletBalance !== undefined
      ? `\nWallet balance: £${campaign.walletBalance.toFixed(2)}`
      : "";

    Alert.alert(
      "Approve & Start Campaign",
      `${estimateText}${balanceText}\n\nThis will lock funds and start dialling. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            setActionLoading(true);
            try {
              await apiRequest(`/api/mobile/campaigns/${id}/approve`, { method: "POST", body: { consentConfirmed: true } });
              await notificationFeedback("success");
              await loadCampaign();
            } catch (err: any) {
              await notificationFeedback("error");
              Alert.alert("Error", err.message || "Failed to approve campaign");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [campaign, id, loadCampaign]);

  const handleControl = useCallback(async (action: "pause" | "resume" | "cancel") => {
    if (!campaign) return;
    await impactFeedback("medium");

    const titles: Record<string, string> = {
      pause: "Pause Campaign",
      resume: "Resume Campaign",
      cancel: "Cancel Campaign",
    };
    const messages: Record<string, string> = {
      pause: "This will pause all active calls for this campaign.",
      resume: "This will resume dialling for this campaign.",
      cancel: "This will permanently cancel this campaign. This action cannot be undone.",
    };

    Alert.alert(titles[action], messages[action], [
      { text: "Go Back", style: "cancel" },
      {
        text: titles[action],
        style: action === "cancel" ? "destructive" : "default",
        onPress: async () => {
          setActionLoading(true);
          try {
            await apiRequest(`/api/mobile/campaigns/${id}/control`, {
              method: "POST",
              body: { action },
            });
            await notificationFeedback("success");
            await loadCampaign();
          } catch (err: any) {
            await notificationFeedback("error");
            Alert.alert("Error", err.message || `Failed to ${action} campaign`);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [campaign, id, loadCampaign]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "running":
        return "#22c55e";
      case "paused":
        return "#f59e0b";
      case "draft":
        return colors.textSecondary;
      case "completed":
        return "#3b82f6";
      case "cancelled":
      case "canceled":
      case "failed":
        return colors.destructive;
      default:
        return colors.textTertiary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={activeColor} />
        <Text style={styles.loadingText}>Loading campaign...</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.loadingText}>Campaign not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.primaryButton, { backgroundColor: activeColor }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const pendingCount = campaign.pendingCount ?? Math.max(0, campaign.totalContacts - campaign.completedCount - campaign.failedCount);
  const budgetPct = campaign.budgetCap > 0 ? Math.min(100, Math.round((campaign.budgetSpent / campaign.budgetCap) * 100)) : 0;
  const statusColor = getStatusColor(campaign.status);
  const statusLower = campaign.status?.toLowerCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
    >
      <View style={styles.headerCard}>
        <Text style={styles.campaignName} data-testid="text-campaign-name">{campaign.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]} data-testid="text-campaign-status">
            {campaign.status}
          </Text>
        </View>
        <Text style={styles.createdDate}>
          Created {new Date(campaign.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress</Text>
        <View style={styles.card}>
          <CampaignProgress
            completed={campaign.completedCount}
            answered={campaign.answeredCount}
            failed={campaign.failedCount}
            pending={pendingCount}
            total={campaign.totalContacts}
          />
          <View style={styles.contactCounts}>
            <CountItem label="Total" value={campaign.totalContacts} color={colors.text} textColor={colors.text} secondaryColor={colors.textSecondary} />
            <CountItem label="Completed" value={campaign.completedCount} color="#22c55e" textColor={colors.text} secondaryColor={colors.textSecondary} />
            <CountItem label="Answered" value={campaign.answeredCount} color="#3b82f6" textColor={colors.text} secondaryColor={colors.textSecondary} />
            <CountItem label="Failed" value={campaign.failedCount} color="#ef4444" textColor={colors.text} secondaryColor={colors.textSecondary} />
            <CountItem label="Pending" value={pendingCount} color="#9ca3af" textColor={colors.text} secondaryColor={colors.textSecondary} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget</Text>
        <View style={styles.card}>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Spent</Text>
            <Text style={styles.budgetValue} data-testid="text-budget-spent">
              £{(campaign.budgetSpent || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Cap</Text>
            <Text style={styles.budgetValue} data-testid="text-budget-cap">
              £{(campaign.budgetCap || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.budgetBarTrack}>
            <View
              style={[
                styles.budgetBarFill,
                {
                  width: `${budgetPct}%`,
                  backgroundColor: budgetPct >= 90 ? colors.destructive : activeColor,
                },
              ]}
            />
          </View>
          <Text style={styles.budgetPct}>{budgetPct}% used</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.card}>
          {[
            { label: "Agent", value: campaign.agentName || "Unassigned" },
            { label: "Calling Hours", value: campaign.callingHoursStart && campaign.callingHoursEnd ? `${campaign.callingHoursStart} - ${campaign.callingHoursEnd}` : "Not set" },
            { label: "Timezone", value: campaign.callingTimezone || "Not set" },
          ].map((item, idx) => (
            <View key={item.label}>
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>{item.label}</Text>
                <Text style={styles.configValue}>{item.value}</Text>
              </View>
              {idx < 2 && <View style={styles.separator} />}
            </View>
          ))}
        </View>
      </View>

      {actionLoading ? (
        <View style={styles.actionLoadingContainer}>
          <ActivityIndicator size="small" color={activeColor} />
          <Text style={styles.actionLoadingText}>Processing...</Text>
        </View>
      ) : (
        <View style={styles.actionsSection}>
          {statusLower === "draft" && (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: activeColor }]}
              onPress={handleApprove}
              accessibilityLabel="Approve and start campaign"
              accessibilityRole="button"
              data-testid="button-approve-campaign"
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Approve & Start</Text>
            </Pressable>
          )}

          {statusLower === "running" && (
            <Pressable
              style={[styles.secondaryButton, { borderColor: "#f59e0b" }]}
              onPress={() => handleControl("pause")}
              accessibilityLabel="Pause campaign"
              accessibilityRole="button"
              data-testid="button-pause-campaign"
            >
              <Ionicons name="pause-circle-outline" size={20} color="#f59e0b" />
              <Text style={[styles.secondaryButtonText, { color: "#f59e0b" }]}>Pause Campaign</Text>
            </Pressable>
          )}

          {statusLower === "paused" && (
            <Pressable
              style={[styles.secondaryButton, { borderColor: "#22c55e" }]}
              onPress={() => handleControl("resume")}
              accessibilityLabel="Resume campaign"
              accessibilityRole="button"
              data-testid="button-resume-campaign"
            >
              <Ionicons name="play-circle-outline" size={20} color="#22c55e" />
              <Text style={[styles.secondaryButtonText, { color: "#22c55e" }]}>Resume Campaign</Text>
            </Pressable>
          )}

          {statusLower !== "completed" && statusLower !== "cancelled" && statusLower !== "canceled" && (
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.destructive }]}
              onPress={() => handleControl("cancel")}
              accessibilityLabel="Cancel campaign"
              accessibilityRole="button"
              data-testid="button-cancel-campaign"
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.destructive} />
              <Text style={[styles.secondaryButtonText, { color: colors.destructive }]}>Cancel Campaign</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

function CountItem({
  label,
  value,
  color,
  textColor,
  secondaryColor,
}: {
  label: string;
  value: number;
  color: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={countStyles.item}>
      <Text style={[countStyles.value, { color }]}>{value}</Text>
      <Text style={[countStyles.label, { color: secondaryColor }]}>{label}</Text>
    </View>
  );
}

const countStyles = StyleSheet.create({
  item: {
    alignItems: "center",
    gap: 2,
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  label: {
    fontSize: FontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

const createStyles = (colors: typeof Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.md,
      backgroundColor: colors.background,
    },
    loadingText: { fontSize: FontSize.md, color: colors.textSecondary },
    headerCard: {
      alignItems: "center",
      padding: Spacing.lg,
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    campaignName: {
      fontSize: FontSize.xl,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
      gap: Spacing.xs,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    createdDate: {
      fontSize: FontSize.sm,
      color: colors.textTertiary,
    },
    section: { marginBottom: Spacing.md },
    sectionTitle: {
      fontSize: FontSize.xs,
      fontWeight: "600",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: Spacing.sm,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: Spacing.md,
      gap: Spacing.md,
    },
    contactCounts: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    budgetRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    budgetLabel: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
    },
    budgetValue: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    budgetBarTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.borderLight,
      overflow: "hidden",
    },
    budgetBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    budgetPct: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      textAlign: "right",
    },
    configRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: Spacing.sm,
    },
    configLabel: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
    },
    configValue: {
      fontSize: FontSize.md,
      fontWeight: "500",
      color: colors.text,
      flexShrink: 1,
      textAlign: "right",
    },
    separator: {
      height: 1,
      backgroundColor: colors.borderLight,
    },
    actionsSection: {
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    primaryButtonText: {
      color: Colors.white,
      fontSize: FontSize.md,
      fontWeight: "700",
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      borderWidth: 1,
      backgroundColor: "transparent",
    },
    secondaryButtonText: {
      fontSize: FontSize.md,
      fontWeight: "600",
    },
    actionLoadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      padding: Spacing.lg,
    },
    actionLoadingText: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
    },
  });
