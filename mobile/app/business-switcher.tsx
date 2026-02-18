import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { getBusinesses, switchBusiness, apiRequest } from "../lib/api";
import { useBranding } from "../lib/branding-context";

interface Business {
  id: number;
  name: string;
  deploymentModel?: string;
  isActive?: boolean;
}

export default function BusinessSwitcherScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const loadBusinesses = useCallback(async () => {
    try {
      const data = await getBusinesses();
      setBusinesses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[BusinessSwitcher] Failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const handleSwitch = async (biz: Business) => {
    if (biz.id === currentId) return;
    setSwitching(true);
    try {
      await switchBusiness(biz.id);
      setCurrentId(biz.id);
      Alert.alert("Switched", `Now managing ${biz.name}`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to switch business");
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={activeColor} />
      </View>
    );
  }

  if (businesses.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="business-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No Businesses</Text>
        <Text style={styles.emptyDesc}>Businesses will appear here once created</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={businesses}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.bizCard, currentId === item.id && { borderColor: activeColor }]}
          onPress={() => handleSwitch(item)}
          disabled={switching}
        >
          <View style={[styles.bizIcon, { backgroundColor: activeColor + "14" }]}>
            <Ionicons name="business" size={22} color={activeColor} />
          </View>
          <View style={styles.bizInfo}>
            <Text style={styles.bizName}>{item.name}</Text>
            {item.deploymentModel && (
              <Text style={styles.bizType}>{item.deploymentModel}</Text>
            )}
          </View>
          {currentId === item.id && (
            <Ionicons name="checkmark-circle" size={22} color={activeColor} />
          )}
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm, backgroundColor: Colors.background },
  list: { padding: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },
  bizCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
  },
  bizIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  bizInfo: { flex: 1 },
  bizName: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  bizType: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
});
