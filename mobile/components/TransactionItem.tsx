import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";

interface TransactionItemProps {
  title: string;
  amount: number;
  type: string;
  timestamp: string;
  icon?: string;
}

const CREDIT_TYPES = ["topup", "credit", "refund"];

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

export default function TransactionItem({ title, amount, type, timestamp, icon }: TransactionItemProps) {
  const isCredit = CREDIT_TYPES.includes(type.toLowerCase());
  const amountColor = isCredit ? Colors.success : Colors.destructive;
  const prefix = isCredit ? "+" : "-";
  const defaultIcon = isCredit ? "arrow-down-circle-outline" : "arrow-up-circle-outline";

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: amountColor + "14" }]}>
        <Ionicons name={(icon || defaultIcon) as any} size={20} color={amountColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.timestamp}>{formatTimeAgo(timestamp)}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {prefix}${Math.abs(amount).toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  timestamp: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
