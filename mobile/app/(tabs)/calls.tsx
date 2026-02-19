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
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../../constants/theme";
import { getCalls } from "../../lib/api";
import StatusBadge from "../../components/StatusBadge";
import { useBranding } from "../../lib/branding-context";
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

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // Check if same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
};

export default function CallsScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;

  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadCalls = useCallback(
    async (isInitial = true) => {
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

        // Check if there are more results
        setHasMore(callsData.length >= 20);
      } catch (err) {
        console.error("[Calls] Failed to load:", err);
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

  // Initial load
  useEffect(() => {
    loadCalls(true);
  }, []);

  // Filter calls when search query or calls change
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
      <Ionicons name="call-outline" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Calls Found</Text>
      <Text style={styles.emptyDesc}>
        {searchQuery ? "Try searching with a different phone number" : "Your call history will appear here"}
      </Text>
    </View>
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={activeColor} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: Colors.surface }]}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by phone number"
            placeholderTextColor={Colors.textTertiary}
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
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Loading State */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.text,
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
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
    marginBottom: 4,
  },
  callDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  duration: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
  },
  callRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  separator: {
    height: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
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
