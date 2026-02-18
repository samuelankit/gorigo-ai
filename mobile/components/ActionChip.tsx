import { Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";

interface ActionChipProps {
  label: string;
  onPress: () => void;
  icon?: string;
  active?: boolean;
  color?: string;
}

export default function ActionChip({ label, onPress, icon, active = false, color = Colors.primary }: ActionChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        active ? { backgroundColor: Colors.primaryLight, borderColor: color } : { backgroundColor: "transparent", borderColor: Colors.border },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {icon && <Ionicons name={icon as any} size={14} color={active ? color : Colors.textSecondary} />}
      <Text style={[styles.label, { color: active ? color : Colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
});
