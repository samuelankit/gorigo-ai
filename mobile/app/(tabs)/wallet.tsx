import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getWallet, getWalletTransactions } from "../../lib/api";
import { router } from "expo-router";
import TransactionItem from "../../components/TransactionItem";
import { useBranding } from "../../lib/branding-context";

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
  const activeColor = branding?.brandColor || Colors.primary;
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

  const loadWalletData = useCallback(async () => {
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
        
        // Parse breakdown if available
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWalletData();
  }, [loadWalletData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={activeColor} />
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
      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: activeColor }]}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceAmount}>£{data.balance.toFixed(2)}</Text>
        <Pressable
          style={({ pressed }) => [styles.topUpButton, pressed && styles.topUpButtonPressed]}
          onPress={() => router.push("/topup")}
        >
          <Ionicons name="add-circle-outline" size={18} color={activeColor} />
          <Text style={[styles.topUpButtonText, { color: activeColor }]}>Top Up</Text>
        </Pressable>
      </View>

      {/* Usage Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={[styles.usageSummaryCard, { borderColor: Colors.border }]}>
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

      {/* Transaction History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {data.transactions.length > 0 ? (
          <View style={[styles.transactionCard, { borderColor: Colors.border }]}>
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
                  <View style={[styles.divider, { backgroundColor: Colors.border }]} />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
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
    color: Colors.white,
    marginBottom: Spacing.lg,
  },
  topUpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  topUpButtonPressed: {
    opacity: 0.8,
  },
  topUpButtonText: {
    fontSize: FontSize.md,
    fontWeight: "600",
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
  usageSummaryCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  usageHeader: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  usageTotal: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
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
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 2,
  },
  breakdownPercent: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  emptyBreakdown: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  emptyBreakdownText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  transactionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
