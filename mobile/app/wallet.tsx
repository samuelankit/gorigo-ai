import { View, Text, StyleSheet, ScrollView, FlatList, RefreshControl } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { getWallet, apiRequest } from "../lib/api";
import { useBranding } from "../lib/branding-context";

interface Transaction {
  id: number;
  type: string;
  amount: string;
  description: string;
  createdAt: string;
}

export default function WalletScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const [balance, setBalance] = useState("0.00");
  const [currency, setCurrency] = useState("USD");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.allSettled([
        getWallet(),
        apiRequest("/api/wallet/transactions?limit=30"),
      ]);
      if (walletRes.status === "fulfilled") {
        const w = walletRes.value?.wallet;
        setBalance(Number(w?.balance || 0).toFixed(2));
        setCurrency(w?.currency || "USD");
      }
      if (txRes.status === "fulfilled") {
        setTransactions(txRes.value?.transactions || txRes.value || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "topup": case "credit": return "arrow-down-circle-outline";
      case "debit": case "usage": return "arrow-up-circle-outline";
      case "refund": return "refresh-circle-outline";
      default: return "ellipse-outline";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "topup": case "credit": case "refund": return Colors.success;
      case "debit": case "usage": return Colors.destructive;
      default: return Colors.textTertiary;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
    >
      <View style={[styles.balanceCard, { backgroundColor: activeColor }]}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>${balance}</Text>
        <Text style={styles.balanceCurrency}>{currency}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.txCard}>
            {transactions.map((tx, idx) => (
              <View key={tx.id || idx}>
                <View style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: getTypeColor(tx.type) + "14" }]}>
                    <Ionicons name={getTypeIcon(tx.type)} size={18} color={getTypeColor(tx.type)} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc}>{tx.description || tx.type}</Text>
                    <Text style={styles.txDate}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "--"}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: getTypeColor(tx.type) }]}>
                    {tx.type === "debit" || tx.type === "usage" ? "-" : "+"}${Math.abs(Number(tx.amount)).toFixed(4)}
                  </Text>
                </View>
                {idx < transactions.length - 1 && <View style={styles.txSeparator} />}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  balanceCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  balanceLabel: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  balanceAmount: { fontSize: 42, fontWeight: "700", color: "#ffffff", marginTop: 4 },
  balanceCurrency: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  txCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: FontSize.md, fontWeight: "500", color: Colors.text },
  txDate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  txAmount: { fontSize: FontSize.md, fontWeight: "600" },
  txSeparator: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 68 },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
