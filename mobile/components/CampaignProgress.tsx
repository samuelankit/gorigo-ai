import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { useTheme } from "../lib/theme-context";
import { useMemo } from "react";

interface CampaignProgressProps {
  completed: number;
  answered: number;
  failed: number;
  pending: number;
  total: number;
  compact?: boolean;
}

const SEGMENT_COLORS = {
  completed: "#22c55e",
  answered: "#3b82f6",
  failed: "#ef4444",
  pending: "#9ca3af",
};

export default function CampaignProgress({
  completed,
  answered,
  failed,
  pending,
  total,
  compact = false,
}: CampaignProgressProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);

  const safeTotal = total > 0 ? total : 1;
  const completedPct = (completed / safeTotal) * 100;
  const answeredPct = (answered / safeTotal) * 100;
  const failedPct = (failed / safeTotal) * 100;
  const pendingPct = (pending / safeTotal) * 100;
  const overallPct = total > 0 ? Math.round(((completed) / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          {completedPct > 0 && (
            <View
              style={[
                styles.barSegment,
                { width: `${completedPct}%`, backgroundColor: SEGMENT_COLORS.completed },
              ]}
            />
          )}
          {answeredPct > 0 && (
            <View
              style={[
                styles.barSegment,
                { width: `${answeredPct}%`, backgroundColor: SEGMENT_COLORS.answered },
              ]}
            />
          )}
          {failedPct > 0 && (
            <View
              style={[
                styles.barSegment,
                { width: `${failedPct}%`, backgroundColor: SEGMENT_COLORS.failed },
              ]}
            />
          )}
          {pendingPct > 0 && (
            <View
              style={[
                styles.barSegment,
                { width: `${pendingPct}%`, backgroundColor: SEGMENT_COLORS.pending },
              ]}
            />
          )}
        </View>
        <Text style={styles.percentText}>{overallPct}%</Text>
      </View>

      {!compact && (
        <View style={styles.legend}>
          <LegendItem color={SEGMENT_COLORS.completed} label="Completed" count={completed} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <LegendItem color={SEGMENT_COLORS.answered} label="Answered" count={answered} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <LegendItem color={SEGMENT_COLORS.failed} label="Failed" count={failed} textColor={colors.text} secondaryColor={colors.textSecondary} />
          <LegendItem color={SEGMENT_COLORS.pending} label="Pending" count={pending} textColor={colors.text} secondaryColor={colors.textSecondary} />
        </View>
      )}
    </View>
  );
}

function LegendItem({
  color,
  label,
  count,
  textColor,
  secondaryColor,
}: {
  color: string;
  label: string;
  count: number;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={[legendStyles.label, { color: secondaryColor }]}>{label}</Text>
      <Text style={[legendStyles.count, { color: textColor }]}>{count}</Text>
    </View>
  );
}

const createStyles = (colors: typeof Colors, compact: boolean) =>
  StyleSheet.create({
    container: {
      gap: compact ? Spacing.xs : Spacing.sm,
    },
    barContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    barTrack: {
      flex: 1,
      height: compact ? 6 : 10,
      borderRadius: compact ? 3 : 5,
      backgroundColor: colors.borderLight,
      flexDirection: "row",
      overflow: "hidden",
    },
    barSegment: {
      height: "100%",
    },
    percentText: {
      fontSize: FontSize.xs,
      fontWeight: "600",
      color: colors.textSecondary,
      minWidth: 32,
      textAlign: "right",
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.md,
    },
  });

const legendStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: FontSize.sm,
  },
  count: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
