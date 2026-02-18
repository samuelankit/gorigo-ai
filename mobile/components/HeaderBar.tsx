import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  color?: string;
}

const STATUS_BAR_HEIGHT = Platform.OS === "ios" ? 56 : 40;

export default function HeaderBar({ title, subtitle, leftIcon, rightIcon, onLeftPress, onRightPress, color = Colors.text }: HeaderBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {leftIcon ? (
          <Pressable style={styles.iconButton} onPress={onLeftPress}>
            <Ionicons name={leftIcon as any} size={24} color={color} />
          </Pressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color }]} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {rightIcon ? (
          <Pressable style={styles.iconButton} onPress={onRightPress}>
            <Ionicons name={rightIcon as any} size={24} color={color} />
          </Pressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholder: {
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
