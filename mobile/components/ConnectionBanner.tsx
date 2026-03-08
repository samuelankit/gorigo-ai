import { Text, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize } from "../constants/theme";
import { useTheme } from "../lib/theme-context";

interface ConnectionBannerProps {
  isOnline: boolean;
}

export default function ConnectionBanner({ isOnline }: ConnectionBannerProps) {
  const { colors } = useTheme();
  const heightAnim = useRef(new Animated.Value(isOnline ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isOnline ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOnline, heightAnim]);

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 44],
  });

  const animatedOpacity = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View style={[styles.banner, { height: animatedHeight, opacity: animatedOpacity, backgroundColor: colors.warning }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
      <Text style={[styles.text, { color: colors.white }]}>You're offline - commands will be queued</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    overflow: "hidden",
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
