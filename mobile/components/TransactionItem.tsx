import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { useTheme } from "../lib/theme-context";
import { useMemo } from "react";

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
  const { colors } = useTheme();
  const isCredit = CREDIT_TYPES.includes(type.toLowerCase());
  const amountColor = isCredit ? colors.success : colors.destructive;
  const prefix = isCredit ? "+" : "-";
  const defaultIcon = isCredit ? "arrow-down-circle-outline" : "arrow-up-circle-outline";

  const styles = useMemo(() => createStyles(colors), [colors]);

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

const createStyles = (colors: typeof Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
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
      color: colors.text,
    },
    timestamp: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
      marginTop: 2,
    },
    amount: {
      fontSize: FontSize.md,
      fontWeight: "700",
    },
  });
