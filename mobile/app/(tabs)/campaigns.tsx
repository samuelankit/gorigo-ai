import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getCampaigns } from "../../lib/api";
import CampaignCard from "../../components/CampaignCard";
import DashboardCard from "../../components/DashboardCard";
import { useBranding } from "../../lib/branding-context";
import { useTheme } from "../../lib/theme-context";
import { router } from "expo-router";

interface Campaign {
  id: number;
  name: string;
  status: string;
  totalContacts: number;
  completedCount: number;
  failedCount: number;
  answeredCount: number;
  budgetCap?: number;
  budgetSpent?: number;
  agentName?: string;
  createdAt: string;
}

const FILTER_OPTIONS = ["All", "Running", "Draft", "Paused", "Completed"];

export default function CampaignsScreen() {
  const { branding } = useBranding();
  const { colors } = useTheme();
  const activeColor = branding?.brandColor || colors.primary;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setError(null);
    try {
      const statusParam = activeFilter === "All" ? undefined : activeFilter.toLowerCase();
      const result = await getCampaigns({
        limit: 50,
        search: searchQuery || undefined,
        status: statusParam,
      });
      const list = result?.campaigns || result || [];
      setCampaigns(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("[Campaigns] Failed to load:", err);
      setError("Unable to load campaigns. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    setLoading(true);
    loadCampaigns();
  }, [loadCampaigns]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampaigns();
  }, [loadCampaigns]);

  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.status?.toLowerCase() === "running"),
    [campaigns]
  );

  const totalContacts = useMemo(
    () => campaigns.reduce((sum, c) => sum + (c.totalContacts || 0), 0),
    [campaigns]
  );

  const overallCompletion = useMemo(() => {
    const total = campaigns.reduce((sum, c) => sum + (c.totalContacts || 0), 0);
    const completed = campaigns.reduce((sum, c) => sum + (c.completedCount || 0), 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [campaigns]);

  const handleCampaignPress = useCallback((id: string | number) => {
    router.push({ pathname: "/campaign-detail", params: { id: String(id) } });
  }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderCampaignItem = ({ item }: { item: Campaign }) => (
    <View style={styles.cardWrapper}>
      <CampaignCard
        id={item.id}
        name={item.name}
        status={item.status}
        agentName={item.agentName}
        totalContacts={item.totalContacts || 0}
        completedCount={item.completedCount || 0}
        answeredCount={item.answeredCount || 0}
        failedCount={item.failedCount || 0}
        budgetCap={item.budgetCap}
        budgetSpent={item.budgetSpent}
        onPress={handleCampaignPress}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="megaphone-outline" size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>
        {searchQuery ? "No Matching Campaigns" : error ? "Failed to Load" : "No Campaigns Yet"}
      </Text>
      <Text style={styles.emptyDesc}>
        {searchQuery
          ? "Try a different search term or clear the filter."
          : error
            ? error
            : "Create your first outbound call campaign to start reaching contacts automatically."}
      </Text>
      {error && !searchQuery ? (
        <Pressable
          style={({ pressed }) => [styles.retryButton, { backgroundColor: activeColor }, pressed && { opacity: 0.8 }]}
          onPress={() => { setLoading(true); loadCampaigns(); }}
          accessibilityLabel="Retry loading campaigns"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color="white" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      ) : null}
      {!error && !searchQuery ? (
        <Pressable
          style={({ pressed }) => [styles.retryButton, { backgroundColor: activeColor }, pressed && { opacity: 0.8 }]}
          onPress={() => router.push("/campaign-create" as any)}
          accessibilityLabel="Create campaign"
          accessibilityRole="button"
          data-testid="button-create-campaign-empty"
        >
          <Ionicons name="add-outline" size={18} color="white" />
          <Text style={styles.retryButtonText}>Create Campaign</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.summaryRow}>
        <DashboardCard
          title="Active"
          value={String(activeCampaigns.length)}
          icon="play-circle-outline"
          color="#22c55e"
        />
        <DashboardCard
          title="Contacts"
          value={totalContacts.toLocaleString()}
          icon="people-outline"
          color="#3b82f6"
        />
      </View>
      <View style={styles.summaryRow}>
        <DashboardCard
          title="Completion"
          value={`${overallCompletion}%`}
          icon="checkmark-circle-outline"
          color="#8b5cf6"
        />
        <DashboardCard
          title="Total"
          value={String(campaigns.length)}
          icon="megaphone-outline"
          color="#f59e0b"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search-campaigns"
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              data-testid="button-clear-search"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <Pressable
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: activeColor },
                  !isActive && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => setActiveFilter(item)}
                data-testid={`filter-${item.toLowerCase()}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && { color: colors.white },
                    !isActive && { color: colors.textSecondary },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={activeColor} />
        </View>
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderCampaignItem}
          keyExtractor={(item) => `campaign-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
          ListHeaderComponent={campaigns.length > 0 ? renderHeader : null}
          ListEmptyComponent={renderEmpty()}
          showsVerticalScrollIndicator={false}
          data-testid="campaigns-list"
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: activeColor }]}
        onPress={() => router.push("/campaign-create" as any)}
        accessibilityRole="button"
        accessibilityLabel="Create new campaign"
        data-testid="button-create-campaign"
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: typeof Colors) =>
  StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchContainer: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
      height: 40,
    },
    searchInput: {
      flex: 1,
      fontSize: FontSize.md,
      color: colors.text,
    },
    filterContainer: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterList: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs + 2,
      borderRadius: BorderRadius.full,
    },
    filterChipText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    summaryRow: {
      flexDirection: "row",
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    listContent: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      flexGrow: 1,
    },
    cardWrapper: {
      marginBottom: Spacing.md,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.xxl * 2,
      paddingHorizontal: Spacing.lg,
      gap: Spacing.sm,
    },
    emptyTitle: {
      fontSize: FontSize.lg,
      fontWeight: "600",
      color: colors.text,
      marginTop: Spacing.md,
    },
    emptyDesc: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: Spacing.md,
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.sm + 4,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.md,
      gap: Spacing.sm,
    },
    retryButtonText: {
      color: "white",
      fontSize: FontSize.md,
      fontWeight: "600",
    },
    centerLoading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    fab: {
      position: "absolute",
      bottom: Spacing.lg,
      right: Spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });
