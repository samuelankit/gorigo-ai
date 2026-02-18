import { View, TextInput, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";

interface InputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMicPress: () => void;
  isListening?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
}

export default function InputBar({
  value,
  onChangeText,
  onSend,
  onMicPress,
  isListening = false,
  isProcessing = false,
  placeholder = "Type a message...",
}: InputBarProps) {
  const canSend = value.trim().length > 0 && !isProcessing;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          style={[styles.micButton, { backgroundColor: isListening ? Colors.destructive : Colors.primary }]}
          onPress={onMicPress}
          disabled={isProcessing}
        >
          <Ionicons name={isListening ? "mic" : "mic-outline"} size={22} color={Colors.white} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="send"
          onSubmitEditing={onSend}
          editable={!isProcessing && !isListening}
        />
        <Pressable
          style={[styles.sendButton, { backgroundColor: canSend ? Colors.primary : Colors.borderLight }]}
          onPress={onSend}
          disabled={!canSend}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={canSend ? Colors.white : Colors.textTertiary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
