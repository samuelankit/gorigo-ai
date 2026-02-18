import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform, RefreshControl, Animated } from "react-native";
import { useState, useRef, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getAdminStats, getWallet, sendVoiceCommand } from "../../lib/api";
import { useBranding } from "../../lib/branding-context";
import { useSpeechRecognition } from "../../lib/speech-recognition";
import { useNetworkStatus, cacheData, getCachedData, queueCommand } from "../../lib/offline-support";
import { impactFeedback, notificationFeedback, selectionFeedback } from "../../lib/haptics";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface StatCard {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const QUICK_CHIPS = [
  { label: "Call stats", command: "How are my calls today?" },
  { label: "Wallet", command: "What's my wallet balance?" },
  { label: "Agents", command: "Show me my agents status" },
  { label: "Alerts", command: "Any alerts or issues?" },
  { label: "Sentiment", command: "What's the sentiment trend today?" },
  { label: "Top calls", command: "Show me my best rated calls" },
];

export default function RigoScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const [refreshing, setRefreshing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);
  const { isOnline } = useNetworkStatus();

  const handleVoiceResult = useCallback((text: string) => {
    setInputText(text);
    handleSendRef.current?.(text);
  }, []);

  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition(handleVoiceResult);
  const handleSendRef = useRef<((text?: string) => Promise<void>) | null>(null);

  const [stats, setStats] = useState<StatCard[]>([
    { label: "Calls Today", value: "--", icon: "call", color: Colors.primary },
    { label: "Wallet", value: "--", icon: "wallet", color: "#f59e0b" },
    { label: "Active Agents", value: "--", icon: "people", color: "#3b82f6" },
    { label: "Alerts", value: "--", icon: "alert-circle", color: "#ef4444" },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! I'm Rigo, your AI call center assistant. Ask me anything — speak or type. Try tapping a quick action below.",
      timestamp: new Date(),
    },
  ]);

  const loadStats = useCallback(async () => {
    try {
      const cached = await getCachedData<StatCard[]>("dashboard-stats");
      if (cached && !isOnline) {
        setStats(cached.data);
        return;
      }

      const [dashData, walletData] = await Promise.allSettled([
        getAdminStats(),
        getWallet(),
      ]);

      setStats((prev) => {
        const updated = [...prev];
        if (dashData.status === "fulfilled") {
          const d = dashData.value;
          updated[0] = { ...updated[0], value: String(d.totalCalls || 0) };
          updated[2] = { ...updated[2], value: String(d.activeAgents || d.totalAgents || 0) };
          updated[3] = { ...updated[3], value: String(d.pendingAlerts || 0) };
        }
        if (walletData.status === "fulfilled") {
          const w = walletData.value?.wallet;
          updated[1] = { ...updated[1], value: `$${Number(w?.balance || 0).toFixed(2)}` };
        }
        cacheData("dashboard-stats", updated);
        return updated;
      });
    } catch {}
  }, [isOnline]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const handleSend = useCallback(async (text?: string) => {
    const message = text || inputText.trim();
    if (!message || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");

    if (!isOnline) {
      await queueCommand(message);
      const offlineMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "You're offline. I've queued your request and will process it when you're back online.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, offlineMsg]);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await sendVoiceCommand(message);
      const reply = response.response || response.message || "Done.";
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (ttsEnabled) {
        try {
          const Speech = await import("expo-speech");
          Speech.speak(reply, { language: "en", rate: 0.95, pitch: 1.0 });
        } catch {}
      }
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error.message || "Sorry, something went wrong. Try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      loadStats();
    }
  }, [inputText, isProcessing, ttsEnabled, loadStats, isOnline]);

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const toggleListening = useCallback(() => {
    impactFeedback("medium");
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
      {item.role === "assistant" && (
        <View style={styles.assistantIconRow}>
          <Ionicons name="sparkles" size={14} color={activeColor} />
          <Text style={[styles.assistantName, { color: activeColor }]}>Rigo</Text>
        </View>
      )}
      <Text style={[styles.messageText, item.role === "user" ? styles.userText : styles.assistantText]}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.rigoAvatar, { backgroundColor: activeColor }]}>  
            <Ionicons name="sparkles" size={20} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{branding?.brandName || "GoRigo"}</Text>
            <View style={styles.headerSubRow}>
              <Text style={styles.headerSubtitle}>AI Call Center</Text>
              {!isOnline && (
                <View style={styles.offlineBadge}>
                  <Ionicons name="cloud-offline-outline" size={10} color="#f59e0b" />
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <Pressable
          style={[styles.ttsToggle, ttsEnabled && { backgroundColor: activeColor + "18" }]}
          onPress={() => setTtsEnabled(!ttsEnabled)}
        >
          <Ionicons
            name={ttsEnabled ? "volume-high" : "volume-mute"}
            size={18}
            color={ttsEnabled ? activeColor : Colors.textTertiary}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <Pressable key={stat.label} style={styles.statCard} onPress={() => { selectionFeedback(); handleSend(`Tell me about my ${stat.label.toLowerCase()}`); }}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + "14" }]}>
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chatSection}>
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageBubble, msg.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              {msg.role === "assistant" && (
                <View style={styles.assistantIconRow}>
                  <Ionicons name="sparkles" size={14} color={activeColor} />
                  <Text style={[styles.assistantName, { color: activeColor }]}>Rigo</Text>
                </View>
              )}
              <Text style={[styles.messageText, msg.role === "user" ? styles.userText : styles.assistantText]}>
                {msg.content}
              </Text>
            </View>
          ))}
          {isProcessing && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.assistantIconRow}>
                <Ionicons name="sparkles" size={14} color={activeColor} />
                <Text style={[styles.assistantName, { color: activeColor }]}>Rigo</Text>
              </View>
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          )}
        </View>

        <View style={styles.chipsContainer}>
          <Text style={styles.chipsTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {QUICK_CHIPS.map((chip) => (
              <Pressable
                key={chip.label}
                style={[styles.chip, { borderColor: activeColor + "30" }]}
                onPress={() => handleSend(chip.command)}
                disabled={isProcessing}
              >
                <Text style={[styles.chipText, { color: activeColor }]}>{chip.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <Animated.View style={{ transform: [{ scale: isListening ? pulseAnim : 1 }] }}>
            <Pressable
              style={[styles.micButton, isListening && styles.micButtonActive, !isListening && { backgroundColor: activeColor }]}
              onPress={toggleListening}
              disabled={isProcessing}
            >
              <Ionicons name={isListening ? "mic" : "mic-outline"} size={22} color={Colors.white} />
            </Pressable>
          </Animated.View>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isListening ? (transcript || "Listening...") : "Ask Rigo anything..."}
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            editable={!isProcessing && !isListening}
          />
          <Pressable
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? activeColor : Colors.borderLight }]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isProcessing}
          >
            <Ionicons name="send" size={18} color={inputText.trim() ? Colors.white : Colors.textTertiary} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  rigoAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f59e0b",
  },
  ttsToggle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chatSection: {
    marginBottom: Spacing.md,
  },
  messageBubble: {
    maxWidth: "88%",
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
  assistantIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  assistantName: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  messageText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  assistantText: {
    color: Colors.text,
  },
  typingText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },
  chipsContainer: {
    marginBottom: Spacing.md,
  },
  chipsTitle: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  chipsRow: {
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: Colors.card,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  inputArea: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  inputRow: {
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
  micButtonActive: {
    backgroundColor: "#ef4444",
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
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
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
