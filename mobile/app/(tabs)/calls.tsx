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
import { getCalls } from "../../lib/api";
import StatusBadge from "../../components/StatusBadge";
import { useBranding } from "../../lib/branding-context";
import { useTheme } from "../../lib/theme-context";
import { router } from "expo-router";

interface Call {
  id: number;
  phoneNumber?: string;
  callerNumber?: string;
  duration: number;
  status: string;
  startTime: string;
  createdAt: string;
  [key: string]: any;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
};

export default function CallsScreen() {
  const { branding } = useBranding();
  const { colors } = useTheme();
  const activeColor = branding?.brandColor || colors.primary;

  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalls = useCallback(
    async (isInitial = true) => {
      if (isInitial) setError(null);
      try {
        const currentOffset = isInitial ? 0 : offset;
        const result = await getCalls({ limit: 20, offset: currentOffset });

        const callsData = result?.calls || result || [];

        if (isInitial) {
          setCalls(callsData);
          setOffset(20);
        } else {
          setCalls((prev) => [...prev, ...callsData]);
          setOffset((prev) => prev + 20);
        }

        setHasMore(callsData.length >= 20);
      } catch (err) {
        console.error("[Calls] Failed to load:", err);
        if (isInitial) setError("Unable to load calls. Please check your connection and try again.");
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [offset]
  );

  useEffect(() => {
    loadCalls(true);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCalls(calls);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = calls.filter((call) => {
        const phoneNumber = (call.phoneNumber || call.callerNumber || "Unknown").toLowerCase();
        return phoneNumber.includes(query);
      });
      setFilteredCalls(filtered);
    }
  }, [searchQuery, calls]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setOffset(0);
    await loadCalls(true);
    setRefreshing(false);
  }, [loadCalls]);

  const onEndReached = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      loadCalls(false);
    }
  }, [hasMore, loadingMore, loading, loadCalls]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderCallItem = ({ item }: { item: Call }) => {
    const phoneNumber = item.phoneNumber || item.callerNumber || "Unknown";
    const timeDisplay = formatTimeAgo(item.startTime || item.createdAt);

    return (
      <Pressable
        style={styles.callCard}
        onPress={() => {
          router.push({ pathname: "/call-detail", params: { id: item.id.toString() } });
        }}
        data-testid={`call-card-${item.id}`}
      >
        <View style={styles.callIconContainer}>
          <View style={[styles.callIcon, { backgroundColor: activeColor + "14" }]}>
            <Ionicons name="call-outline" size={20} color={activeColor} />
          </View>
        </View>

        <View style={styles.callInfo}>
          <Text style={styles.phoneNumber} numberOfLines={1} data-testid={`phone-number-${item.id}`}>
            {phoneNumber}
          </Text>
          <View style={styles.callDetails}>
            <Text style={styles.duration} data-testid={`duration-${item.id}`}>
              {formatDuration(item.duration || 0)}
            </Text>
            <View style={styles.dot} />
            <StatusBadge status={item.status} size="sm" />
          </View>
        </View>

        <View style={styles.callRight}>
          <Text style={styles.timeText} data-testid={`time-${item.id}`}>
            {timeDisplay}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="call-outline" size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{searchQuery ? "No Matching Calls" : (error ? "Failed to Load Calls" : "No Calls Yet")}</Text>
      <Text style={styles.emptyDesc}>
        {searchQuery
          ? "Try searching with a different phone number or clear the search to see all calls."
          : error
            ? error
            : "Your call history will appear here once your AI agents start handling calls. Set up an agent to begin."}
      </Text>
      {(error && !searchQuery) ? (
        <Pressable
          style={({ pressed }) => [styles.retryButton, { backgroundColor: activeColor }, pressed && { opacity: 0.8 }]}
          onPress={() => loadCalls(true)}
          accessibilityLabel="Retry loading calls"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color="white" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={activeColor} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by phone number"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="search-input"
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              data-testid="clear-search"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={activeColor} />
        </View>
      ) : (
        <FlatList
          data={filteredCalls}
          renderItem={renderCallItem}
          keyExtractor={(item) => `call-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
          ListEmptyComponent={renderEmpty()}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? renderLoadingIndicator() : null}
          scrollEnabled={true}
          data-testid="calls-list"
        />
      )}
    </View>
  );
}

const createStyles = (colors: typeof Colors) =>
  StyleSheet.create({
    container: {
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
    listContent: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      flexGrow: 1,
    },
    callCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.sm,
      gap: Spacing.md,
    },
    callIconContainer: {
      justifyContent: "center",
    },
    callIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    callInfo: {
      flex: 1,
    },
    phoneNumber: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    callDetails: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    duration: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textTertiary,
    },
    callRight: {
      alignItems: "flex-end",
      justifyContent: "center",
    },
    timeText: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
    },
    separator: {
      height: 0,
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
    loadingContainer: {
      paddingVertical: Spacing.lg,
      alignItems: "center",
    },
  });
