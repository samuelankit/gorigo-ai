import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, TextInput, Alert, Linking } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { getOwnedPhoneNumbers, searchAvailableNumbers } from "../lib/api";
import { useBranding } from "../lib/branding-context";
import { useTheme } from "../lib/theme-context";

interface OwnedNumber {
  id: number;
  phoneNumber: string;
  friendlyName: string | null;
  capabilities: any;
  isActive: boolean;
  countryCode: string | null;
  numberType: string | null;
  healthScore: number | null;
  spamFlagged: boolean | null;
  createdAt: string | null;
}

interface AvailableNumber {
  phoneNumber: string;
  nationalFormat: string;
  type: string;
  country: string;
  region: string;
  monthlyCost: string;
  currency: string;
  features: string[];
}

const COUNTRIES = [
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
];

const NUMBER_TYPES = [
  { code: "local", label: "Local" },
  { code: "toll_free", label: "Toll Free" },
  { code: "mobile", label: "Mobile" },
];

export default function PhoneNumbersScreen() {
  const { branding } = useBranding();
  const { colors } = useTheme();
  const activeColor = branding?.brandColor || colors.primary;

  const [ownedNumbers, setOwnedNumbers] = useState<OwnedNumber[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState("GB");
  const [selectedType, setSelectedType] = useState("local");
  const [areaCode, setAreaCode] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const loadOwnedNumbers = useCallback(async () => {
    setError(null);
    try {
      const result = await getOwnedPhoneNumbers();
      setOwnedNumbers(result?.phoneNumbers || []);
    } catch (err: any) {
      console.error("[PhoneNumbers] Failed to load:", err);
      setError("Unable to load phone numbers. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOwnedNumbers();
  }, [loadOwnedNumbers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOwnedNumbers();
  }, [loadOwnedNumbers]);

  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    try {
      const result = await searchAvailableNumbers({
        country: selectedCountry,
        type: selectedType,
        areaCode: areaCode.trim() || undefined,
      });

      if (result?.configured === false) {
        Alert.alert("Not Available", result.message || "Phone number purchasing is not yet configured.");
        setAvailableNumbers([]);
        return;
      }

      setAvailableNumbers(result?.numbers || []);
    } catch (err: any) {
      console.error("[PhoneNumbers] Search failed:", err);
      Alert.alert("Search Failed", "Unable to search for numbers. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handlePurchaseRedirect = () => {
    Alert.alert(
      "Purchase on Web",
      "Phone number purchases must be completed on the web. Would you like to open gorigo.ai?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Web",
          onPress: () => Linking.openURL("https://gorigo.ai/dashboard/phone-numbers"),
        },
      ]
    );
  };

  const getCountryLabel = (code: string): string => {
    return COUNTRIES.find((c) => c.code === code)?.label || code;
  };

  const formatNumberType = (type: string): string => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={activeColor} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading phone numbers...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColor} />}
    >
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15" }]}>
          <Ionicons name="alert-circle" size={18} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="call" size={20} color={activeColor} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Numbers</Text>
          <View style={[styles.badge, { backgroundColor: activeColor + "20" }]}>
            <Text style={[styles.badgeText, { color: activeColor }]}>{ownedNumbers.length}</Text>
          </View>
        </View>

        {ownedNumbers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="call-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No phone numbers yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              Browse available numbers below and purchase on the web
            </Text>
          </View>
        ) : (
          ownedNumbers.map((num) => (
            <View key={num.id} style={[styles.numberCard, { borderColor: colors.borderLight }]} data-testid={`card-owned-number-${num.id}`}>
              <View style={styles.numberRow}>
                <Text style={[styles.phoneNumber, { color: colors.text }]}>{num.phoneNumber}</Text>
                {num.spamFlagged && (
                  <View style={[styles.spamBadge, { backgroundColor: colors.destructive + "15" }]}>
                    <Text style={[styles.spamBadgeText, { color: colors.destructive }]}>Spam Flagged</Text>
                  </View>
                )}
              </View>
              <View style={styles.numberMeta}>
                {num.friendlyName && (
                  <Text style={[styles.friendlyName, { color: colors.textSecondary }]}>{num.friendlyName}</Text>
                )}
                <View style={styles.numberTags}>
                  {num.countryCode && (
                    <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                        {getCountryLabel(num.countryCode)}
                      </Text>
                    </View>
                  )}
                  {num.numberType && (
                    <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>{formatNumberType(num.numberType)}</Text>
                    </View>
                  )}
                  {num.healthScore != null && (
                    <View style={[styles.tag, { backgroundColor: num.healthScore >= 80 ? colors.success + "15" : colors.warning + "15" }]}>
                      <Text style={[styles.tagText, { color: num.healthScore >= 80 ? colors.success : colors.warning }]}>
                        Health: {num.healthScore}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="search" size={20} color={activeColor} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Browse Available Numbers</Text>
        </View>

        <View style={styles.searchForm}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Country</Text>
          <Pressable
            onPress={() => setShowCountryPicker(!showCountryPicker)}
            style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            data-testid="select-country"
          >
            <Text style={[styles.pickerText, { color: colors.text }]}>
              {COUNTRIES.find((c) => c.code === selectedCountry)?.label}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </Pressable>
          {showCountryPicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {COUNTRIES.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    setSelectedCountry(c.code);
                    setShowCountryPicker(false);
                  }}
                  style={[
                    styles.pickerOption,
                    selectedCountry === c.code && { backgroundColor: activeColor + "10" },
                  ]}
                  data-testid={`option-country-${c.code}`}
                >
                  <Text style={[styles.pickerOptionText, { color: selectedCountry === c.code ? activeColor : colors.text }]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>Number Type</Text>
          <Pressable
            onPress={() => setShowTypePicker(!showTypePicker)}
            style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            data-testid="select-type"
          >
            <Text style={[styles.pickerText, { color: colors.text }]}>{formatNumberType(selectedType)}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </Pressable>
          {showTypePicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {NUMBER_TYPES.map((t) => (
                <Pressable
                  key={t.code}
                  onPress={() => {
                    setSelectedType(t.code);
                    setShowTypePicker(false);
                  }}
                  style={[
                    styles.pickerOption,
                    selectedType === t.code && { backgroundColor: activeColor + "10" },
                  ]}
                  data-testid={`option-type-${t.code}`}
                >
                  <Text style={[styles.pickerOptionText, { color: selectedType === t.code ? activeColor : colors.text }]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>Area Code (optional)</Text>
          <TextInput
            value={areaCode}
            onChangeText={setAreaCode}
            placeholder="e.g. 020, 0161"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            keyboardType="number-pad"
            data-testid="input-area-code"
          />

          <Pressable
            onPress={handleSearch}
            disabled={searching}
            style={[styles.searchButton, { backgroundColor: activeColor, opacity: searching ? 0.7 : 1 }]}
            data-testid="button-search-numbers"
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.searchButtonText}>Search Numbers</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {hasSearched && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color={activeColor} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Numbers</Text>
            <View style={[styles.badge, { backgroundColor: activeColor + "20" }]}>
              <Text style={[styles.badgeText, { color: activeColor }]}>{availableNumbers.length}</Text>
            </View>
          </View>

          {availableNumbers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="call-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No numbers found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                Try a different country, type, or area code
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.webNotice, { backgroundColor: activeColor + "08", borderColor: activeColor + "20" }]}>
                <Ionicons name="information-circle" size={18} color={activeColor} />
                <Text style={[styles.webNoticeText, { color: colors.textSecondary }]}>
                  Purchases are completed on the web at gorigo.ai
                </Text>
              </View>
              {availableNumbers.map((num, index) => (
                <View key={`${num.phoneNumber}-${index}`} style={[styles.availableCard, { borderColor: colors.borderLight }]} data-testid={`card-available-number-${index}`}>
                  <View style={styles.availableTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.phoneNumber, { color: colors.text }]}>{num.phoneNumber}</Text>
                      <View style={styles.numberTags}>
                        {num.region ? (
                          <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{num.region}</Text>
                          </View>
                        ) : null}
                        <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.tagText, { color: colors.textSecondary }]}>{formatNumberType(num.type)}</Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                            {getCountryLabel(num.country)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.costSection}>
                      <Text style={[styles.costAmount, { color: activeColor }]}>
                        {num.currency === "GBP" ? "\u00A3" : "$"}{num.monthlyCost}
                      </Text>
                      <Text style={[styles.costLabel, { color: colors.textTertiary }]}>/month</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={handlePurchaseRedirect}
                    style={[styles.purchaseButton, { borderColor: activeColor }]}
                    data-testid={`button-purchase-${index}`}
                  >
                    <Ionicons name="globe-outline" size={16} color={activeColor} />
                    <Text style={[styles.purchaseButtonText, { color: activeColor }]}>Purchase on Web</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  numberCard: {
    borderTopWidth: 1,
    paddingVertical: Spacing.md,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phoneNumber: {
    fontSize: FontSize.md,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  friendlyName: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  numberMeta: {
    marginTop: Spacing.xs,
  },
  numberTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: FontSize.xs,
  },
  spamBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  spamBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  searchForm: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    marginBottom: 2,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pickerText: {
    fontSize: FontSize.md,
  },
  pickerDropdown: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  pickerOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerOptionText: {
    fontSize: FontSize.md,
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: FontSize.md,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  webNoticeText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  availableCard: {
    borderTopWidth: 1,
    paddingVertical: Spacing.md,
  },
  availableTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  costSection: {
    alignItems: "flex-end",
  },
  costAmount: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  costLabel: {
    fontSize: FontSize.xs,
  },
  purchaseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  purchaseButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
