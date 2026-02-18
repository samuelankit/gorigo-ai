import { Text, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize } from "../../constants/theme";

interface ConnectionBannerProps {
  isOnline: boolean;
}

export default function ConnectionBanner({ isOnline }: ConnectionBannerProps) {
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
    <Animated.View style={[styles.banner, { height: animatedHeight, opacity: animatedOpacity }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.white} />
      <Text style={styles.text}>You're offline - commands will be queued</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.warning,
    overflow: "hidden",
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.white,
  },
});
