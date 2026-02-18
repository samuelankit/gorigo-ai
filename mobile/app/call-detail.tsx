import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { apiRequest } from "../lib/api";
import { useBranding } from "../lib/branding-context";

export default function CallDetailScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadCall = useCallback(async () => {
    try {
      const data = await apiRequest(`/api/admin/calls/${id}`);
      setCall(data.call || data);
    } catch (err) {
      console.error("[CallDetail] Failed:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadCall();
  }, [id, loadCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive": return Colors.success;
      case "negative": return Colors.destructive;
      default: return Colors.textTertiary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading call details...</Text>
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.loadingText}>Call not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: activeColor }]}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={[styles.directionBadge, { backgroundColor: activeColor + "18" }]}>
          <Ionicons
            name={call.direction === "outbound" ? "arrow-up" : "call"}
            size={24}
            color={activeColor}
          />
        </View>
        <Text style={styles.phoneNumber}>{call.phoneNumber || call.callerNumber || "Unknown"}</Text>
        <Text style={styles.directionText}>{call.direction || "inbound"} call</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.metricValue}>{call.duration ? formatDuration(call.duration) : "--"}</Text>
          <Text style={styles.metricLabel}>Duration</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="happy-outline" size={18} color={getSentimentColor(call.sentimentLabel)} />
          <Text style={[styles.metricValue, { color: getSentimentColor(call.sentimentLabel) }]}>
            {call.sentimentLabel || "N/A"}
          </Text>
          <Text style={styles.metricLabel}>Sentiment</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="star-outline" size={18} color="#f59e0b" />
          <Text style={styles.metricValue}>{call.qualityScore ? `${call.qualityScore}%` : "--"}</Text>
          <Text style={styles.metricLabel}>Quality</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailCard}>
          {[
            { label: "Agent", value: call.agentName || "Unassigned" },
            { label: "Status", value: call.status || "unknown" },
            { label: "Start Time", value: call.startTime ? new Date(call.startTime).toLocaleString() : "--" },
            { label: "End Time", value: call.endTime ? new Date(call.endTime).toLocaleString() : "--" },
            { label: "Cost", value: call.cost ? `$${Number(call.cost).toFixed(4)}` : "--" },
          ].map((detail, idx) => (
            <View key={detail.label}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
              {idx < 4 && <View style={styles.detailSeparator} />}
            </View>
          ))}
        </View>
      </View>

      {call.transcript && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptText}>{call.transcript}</Text>
          </View>
        </View>
      )}

      {call.summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Summary</Text>
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptText}>{call.summary}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md, backgroundColor: Colors.background },
  loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },
  backButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  backButtonText: { color: Colors.white, fontWeight: "600", fontSize: FontSize.md },
  headerCard: {
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  directionBadge: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  phoneNumber: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  directionText: { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: "capitalize", marginTop: 4 },
  metricsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  metricValue: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text, textTransform: "capitalize" },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  detailCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  detailLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.md, fontWeight: "500", color: Colors.text, textTransform: "capitalize" },
  detailSeparator: { height: 1, backgroundColor: Colors.borderLight, marginLeft: Spacing.md },
  transcriptCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
  },
  transcriptText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
});
