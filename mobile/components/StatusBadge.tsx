import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize } from "../../constants/theme";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const getStatusColor = (status: string): string => {
  const s = status.toLowerCase();
  if (["active", "completed", "online"].includes(s)) return Colors.success;
  if (["failed", "error", "offline"].includes(s)) return Colors.destructive;
  if (["pending", "ringing"].includes(s)) return Colors.warning;
  return Colors.textSecondary;
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
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
