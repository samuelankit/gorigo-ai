import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { preventScreenCaptureAsync, allowScreenCaptureAsync } from "expo-screen-capture";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getWallet, getWalletTransactions } from "../../lib/api";
import TransactionItem from "../../components/TransactionItem";
import { useBranding } from "../../lib/branding-context";
import { useTheme } from "../../lib/theme-context";

interface WalletData {
  balance: number;
  monthlySpent: number;
  breakdown: {
    calls: number;
    aiUsage: number;
    knowledgeProcessing: number;
  };
  transactions: any[];
}

export default function WalletScreen() {
  const { branding } = useBranding();
  const { colors } = useTheme();
  const activeColor = branding?.brandColor || colors.primary;
  const [data, setData] = useState<WalletData>({
    balance: 0,
    monthlySpent: 0,
    breakdown: {
      calls: 0,
      aiUsage: 0,
      knowledgeProcessing: 0,
    },
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWalletData = useCallback(async () => {
    setError(null);
    try {
      const [walletResult, transactionsResult] = await Promise.allSettled([
        getWallet(),
        getWalletTransactions({ limit: 10 }),
      ]);

      let balance = 0;
      let monthlySpent = 0;
      let breakdown = { calls: 0, aiUsage: 0, knowledgeProcessing: 0 };
      let transactions: any[] = [];

      if (walletResult.status === "fulfilled" && walletResult.value) {
        const wallet = walletResult.value;
        balance = wallet.balance || wallet.amount || 0;
        monthlySpent = wallet.monthlySpent || wallet.spent || 0;
        
        if (wallet.breakdown) {
          breakdown = {
            calls: wallet.breakdown.calls || 0,
            aiUsage: wallet.breakdown.aiUsage || wallet.breakdown.ai_usage || 0,
            knowledgeProcessing: wallet.breakdown.knowledgeProcessing || wallet.breakdown.knowledge_processing || 0,
          };
        } else if (wallet.usage) {
          breakdown = {
            calls: wallet.usage.calls || 0,
            aiUsage: wallet.usage.aiUsage || wallet.usage.ai_usage || 0,
            knowledgeProcessing: wallet.usage.knowledgeProcessing || wallet.usage.knowledge_processing || 0,
          };
        }
      }

      if (transactionsResult.status === "fulfilled" && transactionsResult.value) {
        const txData = transactionsResult.value?.transactions || transactionsResult.value || [];
        transactions = Array.isArray(txData) ? txData : [];
      }

      setData({
        balance,
        monthlySpent,
        breakdown,
        transactions,
      });
    } catch (err) {
      console.error("[Wallet] Failed to load data:", err);
      setError("Unable to load wallet data. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  useEffect(() => {
    const setupScreenCapture = async () => {
      try {
        await preventScreenCaptureAsync();
      } catch (err) {
        console.error("[Wallet] Failed to prevent screen capture:", err);
      }
    };

    setupScreenCapture();

    return () => {
      const cleanupScreenCapture = async () => {
        try {
          await allowScreenCaptureAsync();
        } catch (err) {
          console.error("[Wallet] Failed to allow screen capture:", err);
        }
      };
      cleanupScreenCapture();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWalletData();
  }, [loadWalletData]);

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
          onPress={loadWalletData}
          accessibilityLabel="Retry loading wallet data"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color="white" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const totalBreakdown = data.breakdown.calls + data.breakdown.aiUsage + data.breakdown.knowledgeProcessing;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.balanceCard, { backgroundColor: activeColor }]}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceAmount}>£{data.balance.toFixed(2)}</Text>
        <View style={styles.topUpNotice}>
          <Ionicons name="globe-outline" size={14} color="rgba(255, 255, 255, 0.7)" />
          <Text style={styles.topUpNoticeText}>Manage balance via web dashboard</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={[styles.usageSummaryCard, { borderColor: colors.border }]}>
          <View style={styles.usageHeader}>
            <Text style={styles.usageTotal}>Total Spent: £{data.monthlySpent.toFixed(2)}</Text>
          </View>

          {totalBreakdown > 0 ? (
            <View style={styles.breakdownContainer}>
              {data.breakdown.calls > 0 && (
                <View style={styles.breakdownItem}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#06b6d4" }]} />
                  <View style={styles.breakdownInfo}>
                    <Text style={styles.breakdownLabel}>Calls</Text>
                    <Text style={styles.breakdownValue}>£{data.breakdown.calls.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.breakdownPercent}>
                    {totalBreakdown > 0 ? ((data.breakdown.calls / totalBreakdown) * 100).toFixed(0) : 0}%
                  </Text>
                </View>
              )}

              {data.breakdown.aiUsage > 0 && (
                <View style={styles.breakdownItem}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#8b5cf6" }]} />
                  <View style={styles.breakdownInfo}>
                    <Text style={styles.breakdownLabel}>AI Usage</Text>
                    <Text style={styles.breakdownValue}>£{data.breakdown.aiUsage.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.breakdownPercent}>
                    {totalBreakdown > 0 ? ((data.breakdown.aiUsage / totalBreakdown) * 100).toFixed(0) : 0}%
                  </Text>
                </View>
              )}

              {data.breakdown.knowledgeProcessing > 0 && (
                <View style={styles.breakdownItem}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#f59e0b" }]} />
                  <View style={styles.breakdownInfo}>
                    <Text style={styles.breakdownLabel}>Knowledge Processing</Text>
                    <Text style={styles.breakdownValue}>£{data.breakdown.knowledgeProcessing.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.breakdownPercent}>
                    {totalBreakdown > 0 ? ((data.breakdown.knowledgeProcessing / totalBreakdown) * 100).toFixed(0) : 0}%
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyBreakdown}>
              <Text style={styles.emptyBreakdownText}>No usage this month</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {data.transactions.length > 0 ? (
          <View style={[styles.transactionCard, { borderColor: colors.border }]}>
            {data.transactions.map((transaction, index) => (
              <View key={index}>
                <TransactionItem
                  title={transaction.description || transaction.type || "Transaction"}
                  amount={transaction.amount || 0}
                  type={transaction.type || ""}
                  timestamp={transaction.createdAt || transaction.timestamp || new Date().toISOString()}
                  icon={transaction.icon}
                />
                {index < data.transactions.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
            <Text style={styles.emptyStateText}>Your transaction history will appear here once you start making calls or using AI services.</Text>
          </View>
        )}
      </View>

      <View style={{ height: Spacing.lg }} />
    </ScrollView>
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
    balanceCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      alignItems: "center",
    },
    balanceLabel: {
      fontSize: FontSize.sm,
      color: "rgba(255, 255, 255, 0.8)",
      fontWeight: "500",
      marginBottom: Spacing.sm,
    },
    balanceAmount: {
      fontSize: FontSize.hero,
      fontWeight: "700",
      color: colors.white,
      marginBottom: Spacing.lg,
    },
    topUpNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    topUpNoticeText: {
      fontSize: FontSize.sm,
      color: "rgba(255, 255, 255, 0.7)",
      fontWeight: "500",
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontSize: FontSize.lg,
      fontWeight: "600",
      color: colors.text,
      marginBottom: Spacing.md,
    },
    usageSummaryCard: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      borderWidth: 1,
    },
    usageHeader: {
      marginBottom: Spacing.md,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    usageTotal: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    breakdownContainer: {
      gap: Spacing.md,
    },
    breakdownItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
    },
    breakdownDot: {
      width: 12,
      height: 12,
      borderRadius: BorderRadius.full,
    },
    breakdownInfo: {
      flex: 1,
    },
    breakdownLabel: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    breakdownValue: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
      marginTop: 2,
    },
    breakdownPercent: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    emptyBreakdown: {
      alignItems: "center",
      paddingVertical: Spacing.md,
    },
    emptyBreakdownText: {
      fontSize: FontSize.sm,
      color: colors.textTertiary,
    },
    transactionCard: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      overflow: "hidden",
      borderWidth: 1,
    },
    divider: {
      height: 1,
      marginHorizontal: Spacing.md,
    },
    emptyState: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      alignItems: "center",
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
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
  });
