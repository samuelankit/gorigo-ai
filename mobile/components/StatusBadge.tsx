import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize } from "../constants/theme";
import { useTheme } from "../lib/theme-context";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { colors } = useTheme();

  const getStatusColor = (s: string): string => {
    const lower = s.toLowerCase();
    if (["active", "completed", "online"].includes(lower)) return colors.success;
    if (["failed", "error", "offline"].includes(lower)) return colors.destructive;
    if (["pending", "ringing"].includes(lower)) return colors.warning;
    return colors.textSecondary;
  };

  const color = getStatusColor(status);
  const isSm = size === "sm";

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color, width: isSm ? 6 : 8, height: isSm ? 6 : 8, borderRadius: isSm ? 3 : 4 }]} />
      <Text style={[styles.text, { color, fontSize: isSm ? FontSize.xs : FontSize.sm }]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {},
  text: {
    fontWeight: "500",
    textTransform: "capitalize",
  },
});
