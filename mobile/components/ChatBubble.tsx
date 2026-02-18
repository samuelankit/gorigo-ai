import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export default function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const isUser = role === "user";

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
        {content}
      </Text>
      {timestamp && (
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
          {formatTime(timestamp)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  text: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  assistantText: {
    color: Colors.text,
  },
  timestamp: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  userTimestamp: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "right",
  },
  assistantTimestamp: {
    color: Colors.textTertiary,
  },
});
