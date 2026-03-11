import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { useTheme } from "../lib/theme-context";
import { useMemo } from "react";
import CampaignProgress from "./CampaignProgress";

interface CampaignCardProps {
  id: string | number;
  name: string;
  status: string;
  agentName?: string;
  totalContacts: number;
  completedCount: number;
  answeredCount: number;
  failedCount: number;
  budgetCap?: number;
  budgetSpent?: number;
  onPress: (id: string | number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: "#22c55e",
  paused: "#f59e0b",
  draft: "#9ca3af",
  completed: "#3b82f6",
  cancelled: "#ef4444",
  failed: "#ef4444",
};

export default function CampaignCard({
  id,
  name,
  status,
  agentName,
  totalContacts,
  completedCount,
  answeredCount,
  failedCount,
  budgetCap,
  budgetSpent,
  onPress,
}: CampaignCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statusColor = STATUS_COLORS[status.toLowerCase()] || colors.textSecondary;
  const pendingCount = Math.max(0, totalContacts - completedCount);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(id);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "1A" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status}
            </Text>
          </View>
        </View>
        {agentName && (
          <View style={styles.agentRow}>
            <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.agentName} numberOfLines={1}>{agentName}</Text>
          </View>
        )}
      </View>

      <CampaignProgress
        completed={completedCount}
        answered={answeredCount}
        failed={failedCount}
        pending={pendingCount}
        total={totalContacts}
        compact
      />

      {budgetCap != null && budgetCap > 0 && (
        <View style={styles.budgetRow}>
          <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.budgetText}>
            £{(budgetSpent ?? 0).toFixed(2)} / £{budgetCap.toFixed(2)}
          </Text>
        </View>
      )}

      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: typeof Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    pressed: {
      opacity: 0.7,
    },
    header: {
      gap: Spacing.xs,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    name: {
      flex: 1,
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
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
    agentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    agentName: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    budgetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    budgetText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    chevronContainer: {
      position: "absolute",
      right: Spacing.md,
      top: "50%",
      marginTop: -9,
    },
  });
