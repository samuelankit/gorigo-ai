import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Keyboard } from "react-native";
import { useState, useCallback, useRef, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { getCalls, getAgents } from "../lib/api";
import { router } from "expo-router";
import { useTheme } from "../lib/theme-context";
import { useBranding } from "../lib/branding-context";
import StatusBadge from "../components/StatusBadge";

interface SearchResult {
  type: "call" | "agent";
  id: number;
  title: string;
  subtitle: string;
  status?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DEBOUNCE_MS = 400;

export default function SearchScreen() {
  const { colors } = useTheme();
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || colors.primary;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const [callsResult, agentsResult] = await Promise.allSettled([
        getCalls({ limit: 10, search: trimmed }),
        getAgents({ search: trimmed }),
      ]);

      const searchResults: SearchResult[] = [];

      if (agentsResult.status === "fulfilled" && agentsResult.value) {
        const agentsList = agentsResult.value?.agents || agentsResult.value || [];
        if (Array.isArray(agentsList)) {
          agentsList.slice(0, 10).forEach((agent: any) => {
            searchResults.push({
              type: "agent",
              id: agent.id,
              title: agent.name || "Unnamed Agent",
              subtitle: `${agent.agentType || "general"} · ${agent.language || "en-GB"}`,
              status: agent.status,
              icon: "people-outline",
            });
          });
        }
      }

      if (callsResult.status === "fulfilled" && callsResult.value) {
        const callsList = callsResult.value?.calls || callsResult.value || [];
        if (Array.isArray(callsList)) {
          callsList.slice(0, 10).forEach((call: any) => {
            const duration = call.duration ? `${Math.floor(call.duration / 60000)}m ${Math.floor((call.duration % 60000) / 1000)}s` : "0:00";
            searchResults.push({
              type: "call",
              id: call.id,
              title: call.phoneNumber || call.callerNumber || "Unknown Number",
              subtitle: `${call.direction || "inbound"} · ${duration}`,
              status: call.status,
              icon: call.direction === "outbound" ? "arrow-up-outline" : "call-outline",
            });
          });
        }
      }

      setResults(searchResults);
    } catch (err) {
      console.error("[Search] Error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeText = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      performSearch(text);
    }, DEBOUNCE_MS);
  }, [performSearch]);

  const handleResultPress = useCallback((item: SearchResult) => {
    Keyboard.dismiss();
    if (item.type === "call") {
      router.push(`/call-detail?id=${item.id}`);
    } else if (item.type === "agent") {
      router.push("/(tabs)/agents" as any);
    }
  }, []);

  const agentResults = results.filter((r) => r.type === "agent");
  const callResults = results.filter((r) => r.type === "call");

  const renderSectionHeader = (title: string, count: number, icon: keyof typeof Ionicons.glyphMap) => {
    if (count === 0) return null;
    return (
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
        <Text style={styles.sectionHeaderText}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <Pressable
      style={({ pressed }) => [styles.resultItem, pressed && styles.resultItemPressed]}
      onPress={() => handleResultPress(item)}
      data-testid={`search-result-${item.type}-${item.id}`}
    >
      <View style={[styles.resultIcon, { backgroundColor: activeColor + "14" }]}>
        <Ionicons name={item.icon} size={18} color={activeColor} />
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      {item.status && (
        <StatusBadge status={item.status} size="sm" />
      )}
    </Pressable>
  );

  const allResults = [
    ...(agentResults.length > 0 ? [{ type: "header" as const, key: "agents-header", title: "Agents", count: agentResults.length, icon: "people-outline" as const }] : []),
    ...agentResults,
    ...(callResults.length > 0 ? [{ type: "header" as const, key: "calls-header", title: "Calls", count: callResults.length, icon: "call-outline" as const }] : []),
    ...callResults,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search calls, agents..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={onChangeText}
          autoFocus
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          data-testid="input-search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery("");
              setResults([]);
              setSearched(false);
            }}
            style={styles.clearButton}
            data-testid="button-clear-search"
          >
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={activeColor} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      )}

      {!loading && !searched && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Search</Text>
          <Text style={styles.emptySubtitle}>Search across your calls and agents</Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={allResults}
          keyExtractor={(item: any) => item.key || `${item.type}-${item.id}`}
          renderItem={({ item }: any) => {
            if (item.type === "header") {
              return renderSectionHeader(item.title, item.count, item.icon) || <View />;
            }
            return renderItem({ item });
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
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
    searchBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: FontSize.md,
      color: colors.text,
      paddingVertical: Spacing.md,
    },
    clearButton: {
      padding: Spacing.xs,
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.xl,
      gap: Spacing.sm,
    },
    loadingText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.xxl,
    },
    emptyTitle: {
      fontSize: FontSize.lg,
      fontWeight: "600",
      color: colors.text,
      marginTop: Spacing.md,
    },
    emptySubtitle: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    sectionHeaderText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sectionCount: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
    },
    listContent: {
      paddingBottom: Spacing.xl,
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.md,
    },
    resultItemPressed: {
      backgroundColor: colors.surface,
    },
    resultIcon: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    resultContent: {
      flex: 1,
    },
    resultTitle: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    resultSubtitle: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
