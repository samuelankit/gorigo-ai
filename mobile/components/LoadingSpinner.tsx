import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize } from "../../constants/theme";

interface LoadingSpinnerProps {
  size?: "sm" | "lg";
  text?: string;
  color?: string;
}

export default function LoadingSpinner({ size = "sm", text, color = Colors.primary }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size === "lg" ? "large" : "small"} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  text: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
