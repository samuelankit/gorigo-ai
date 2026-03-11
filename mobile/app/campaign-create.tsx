import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { apiRequest } from "../lib/api";
import { useBranding } from "../lib/branding-context";
import { impactFeedback, notificationFeedback } from "../lib/haptics";

interface Agent {
  id: number;
  name: string;
  agentType?: string;
  enabled?: boolean;
}

interface Contact {
  phone: string;
  name: string;
}

const TIMEZONES = [
  { label: "Europe/London (GMT)", value: "Europe/London" },
  { label: "Europe/Paris (CET)", value: "Europe/Paris" },
  { label: "Europe/Berlin (CET)", value: "Europe/Berlin" },
  { label: "America/New_York (EST)", value: "America/New_York" },
  { label: "America/Chicago (CST)", value: "America/Chicago" },
  { label: "America/Los_Angeles (PST)", value: "America/Los_Angeles" },
  { label: "Asia/Dubai (GST)", value: "Asia/Dubai" },
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
  { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Australia/Sydney (AEST)", value: "Australia/Sydney" },
];

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone.replace(/\s/g, ""));
}

export default function CampaignCreateScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactName, setContactName] = useState("");

  const [callingHoursStart, setCallingHoursStart] = useState("09:00");
  const [callingHoursEnd, setCallingHoursEnd] = useState("17:00");
  const [callingTimezone, setCallingTimezone] = useState("Europe/London");
  const [budgetCap, setBudgetCap] = useState("");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const data = await apiRequest("/api/mobile/agents");
      const list = Array.isArray(data) ? data : data?.agents || data?.data || [];
      setAgents(list.filter((a: Agent) => a.enabled !== false));
    } catch (err) {
      console.error("Failed to load agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const addContact = useCallback(() => {
    const phone = contactPhone.trim();
    const name = contactName.trim();

    if (!phone) {
      Alert.alert("Validation", "Phone number is required.");
      return;
    }

    if (!isValidE164(phone)) {
      Alert.alert("Invalid Phone", "Phone number must be in E.164 format (e.g. +44123456789).");
      return;
    }

    if (contacts.some((c) => c.phone === phone)) {
      Alert.alert("Duplicate", "This phone number has already been added.");
      return;
    }

    impactFeedback("light");
    setContacts((prev) => [...prev, { phone, name: name || "Unknown" }]);
    setContactPhone("");
    setContactName("");
  }, [contactPhone, contactName, contacts]);

  const removeContact = useCallback(
    (index: number) => {
      impactFeedback("light");
      setContacts((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const validateStep1 = (): boolean => {
    if (!campaignName.trim()) {
      Alert.alert("Validation", "Campaign name is required.");
      return false;
    }
    if (!selectedAgent) {
      Alert.alert("Validation", "Please select an agent.");
      return false;
    }
    if (contacts.length === 0) {
      Alert.alert("Validation", "Add at least one contact.");
      return false;
    }
    return true;
  };

  const goToStep2 = () => {
    if (validateStep1()) {
      impactFeedback("light");
      setStep(2);
    }
  };

  const goBackToStep1 = () => {
    impactFeedback("light");
    setStep(1);
  };

  const handleSubmit = async () => {
    const budget = parseFloat(budgetCap);
    if (!budgetCap.trim() || isNaN(budget) || budget <= 0) {
      Alert.alert("Validation", "Please enter a valid budget cap greater than 0.");
      return;
    }

    impactFeedback("medium");
    setSubmitting(true);

    try {
      const payload = {
        name: campaignName.trim(),
        agentId: selectedAgent!.id,
        contacts: contacts.map((c) => ({ phone: c.phone, name: c.name })),
        callingHoursStart,
        callingHoursEnd,
        callingTimezone,
        budgetCap: budget,
      };

      const result = await apiRequest("/api/mobile/campaigns", {
        method: "POST",
        body: payload,
      });

      await notificationFeedback("success");
      Alert.alert("Campaign Created", `"${campaignName.trim()}" has been created as a draft.`, [
        {
          text: "OK",
          onPress: () => {
            if (result?.campaign?.id || result?.id) {
              router.back();
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (err: any) {
      await notificationFeedback("error");
      Alert.alert("Error", err.message || "Failed to create campaign. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedCost = contacts.length * 0.15;

  const getTimezoneLabel = (value: string) =>
    TIMEZONES.find((tz) => tz.value === value)?.label || value;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.stepIndicator}>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, { backgroundColor: activeColor }]}>
            <Text style={styles.stepDotText}>1</Text>
          </View>
          <View style={[styles.stepLine, step === 2 && { backgroundColor: activeColor }]} />
          <View
            style={[
              styles.stepDot,
              step === 2
                ? { backgroundColor: activeColor }
                : { backgroundColor: Colors.border },
            ]}
          >
            <Text style={[styles.stepDotText, step < 2 && { color: Colors.textSecondary }]}>2</Text>
          </View>
        </View>
        <View style={styles.stepLabelRow}>
          <Text style={[styles.stepLabel, { color: activeColor }]} data-testid="text-step-1-label">
            Setup
          </Text>
          <Text
            style={[styles.stepLabel, step === 2 ? { color: activeColor } : { color: Colors.textTertiary }]}
            data-testid="text-step-2-label"
          >
            Schedule & Budget
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <>
            <View style={styles.formSection}>
              <Text style={styles.label}>Campaign Name</Text>
              <TextInput
                style={styles.input}
                value={campaignName}
                onChangeText={setCampaignName}
                placeholder="e.g. Q1 Outbound Sales"
                placeholderTextColor={Colors.textTertiary}
                data-testid="input-campaign-name"
                accessibilityLabel="Campaign name"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Agent</Text>
              {loadingAgents ? (
                <ActivityIndicator size="small" color={activeColor} />
              ) : (
                <>
                  <Pressable
                    style={styles.pickerButton}
                    onPress={() => {
                      setShowAgentPicker(!showAgentPicker);
                      setShowTimezonePicker(false);
                    }}
                    data-testid="button-select-agent"
                    accessibilityLabel="Select agent"
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !selectedAgent && { color: Colors.textTertiary },
                      ]}
                    >
                      {selectedAgent ? selectedAgent.name : "Select an agent"}
                    </Text>
                    <Ionicons
                      name={showAgentPicker ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={Colors.textSecondary}
                    />
                  </Pressable>
                  {showAgentPicker && (
                    <View style={styles.optionsList}>
                      {agents.length === 0 ? (
                        <View style={styles.optionItem}>
                          <Text style={[styles.optionText, { color: Colors.textTertiary }]}>
                            No agents available
                          </Text>
                        </View>
                      ) : (
                        agents.map((agent) => (
                          <Pressable
                            key={agent.id}
                            style={[
                              styles.optionItem,
                              selectedAgent?.id === agent.id && {
                                backgroundColor: activeColor + "15",
                              },
                            ]}
                            onPress={() => {
                              setSelectedAgent(agent);
                              setShowAgentPicker(false);
                              impactFeedback("light");
                            }}
                            data-testid={`button-agent-option-${agent.id}`}
                            accessibilityLabel={`Select agent ${agent.name}`}
                            accessibilityRole="button"
                          >
                            <View>
                              <Text
                                style={[
                                  styles.optionText,
                                  selectedAgent?.id === agent.id && {
                                    color: activeColor,
                                    fontWeight: "600",
                                  },
                                ]}
                              >
                                {agent.name}
                              </Text>
                              {agent.agentType && (
                                <Text style={styles.optionSubtext}>{agent.agentType}</Text>
                              )}
                            </View>
                            {selectedAgent?.id === agent.id && (
                              <Ionicons name="checkmark" size={18} color={activeColor} />
                            )}
                          </Pressable>
                        ))
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Contacts ({contacts.length})</Text>

              <View style={styles.contactInputRow}>
                <View style={styles.contactInputGroup}>
                  <TextInput
                    style={[styles.input, styles.contactPhoneInput]}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="+44123456789"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                    data-testid="input-contact-phone"
                    accessibilityLabel="Contact phone number"
                  />
                  <TextInput
                    style={[styles.input, styles.contactNameInput]}
                    value={contactName}
                    onChangeText={setContactName}
                    placeholder="Contact name"
                    placeholderTextColor={Colors.textTertiary}
                    data-testid="input-contact-name"
                    accessibilityLabel="Contact name"
                  />
                </View>
                <Pressable
                  style={[styles.addContactButton, { backgroundColor: activeColor }]}
                  onPress={addContact}
                  data-testid="button-add-contact"
                  accessibilityLabel="Add contact"
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={22} color={Colors.white} />
                </Pressable>
              </View>

              {contacts.length > 0 && (
                <View style={styles.contactsList}>
                  {contacts.map((contact, index) => (
                    <View key={`${contact.phone}-${index}`} style={styles.contactItem}>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactItemName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        <Text style={styles.contactItemPhone}>{contact.phone}</Text>
                      </View>
                      <Pressable
                        onPress={() => removeContact(index)}
                        style={styles.removeContactButton}
                        data-testid={`button-remove-contact-${index}`}
                        accessibilityLabel={`Remove contact ${contact.name}`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="close-circle" size={22} color={Colors.destructive} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Pressable
              style={[styles.primaryButton, { backgroundColor: activeColor }]}
              onPress={goToStep2}
              data-testid="button-next-step"
              accessibilityLabel="Continue to schedule and budget"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Next: Schedule & Budget</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.formSection}>
              <Text style={styles.label}>Calling Hours Start</Text>
              <TextInput
                style={styles.input}
                value={callingHoursStart}
                onChangeText={setCallingHoursStart}
                placeholder="09:00"
                placeholderTextColor={Colors.textTertiary}
                data-testid="input-calling-hours-start"
                accessibilityLabel="Calling hours start time"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Calling Hours End</Text>
              <TextInput
                style={styles.input}
                value={callingHoursEnd}
                onChangeText={setCallingHoursEnd}
                placeholder="17:00"
                placeholderTextColor={Colors.textTertiary}
                data-testid="input-calling-hours-end"
                accessibilityLabel="Calling hours end time"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Timezone</Text>
              <Pressable
                style={styles.pickerButton}
                onPress={() => {
                  setShowTimezonePicker(!showTimezonePicker);
                  setShowAgentPicker(false);
                }}
                data-testid="button-select-timezone"
                accessibilityLabel="Select timezone"
                accessibilityRole="button"
              >
                <Text style={styles.pickerButtonText}>{getTimezoneLabel(callingTimezone)}</Text>
                <Ionicons
                  name={showTimezonePicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.textSecondary}
                />
              </Pressable>
              {showTimezonePicker && (
                <View style={styles.optionsList}>
                  {TIMEZONES.map((tz) => (
                    <Pressable
                      key={tz.value}
                      style={[
                        styles.optionItem,
                        callingTimezone === tz.value && {
                          backgroundColor: activeColor + "15",
                        },
                      ]}
                      onPress={() => {
                        setCallingTimezone(tz.value);
                        setShowTimezonePicker(false);
                        impactFeedback("light");
                      }}
                      data-testid={`button-timezone-option-${tz.value}`}
                      accessibilityLabel={`Select timezone ${tz.label}`}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.optionText,
                          callingTimezone === tz.value && {
                            color: activeColor,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {tz.label}
                      </Text>
                      {callingTimezone === tz.value && (
                        <Ionicons name="checkmark" size={18} color={activeColor} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Budget Cap</Text>
              <View style={styles.budgetInputRow}>
                <Text style={styles.currencySymbol}>£</Text>
                <TextInput
                  style={[styles.input, styles.budgetInput]}
                  value={budgetCap}
                  onChangeText={setBudgetCap}
                  placeholder="100.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  data-testid="input-budget-cap"
                  accessibilityLabel="Budget cap in pounds"
                />
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Review Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Campaign</Text>
                <Text style={styles.summaryValue} data-testid="text-summary-name">
                  {campaignName}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Agent</Text>
                <Text style={styles.summaryValue} data-testid="text-summary-agent">
                  {selectedAgent?.name}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Contacts</Text>
                <Text style={styles.summaryValue} data-testid="text-summary-contacts">
                  {contacts.length}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Calling Hours</Text>
                <Text style={styles.summaryValue} data-testid="text-summary-hours">
                  {callingHoursStart} - {callingHoursEnd}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Est. Cost</Text>
                <Text style={[styles.summaryValue, { color: activeColor, fontWeight: "700" }]} data-testid="text-summary-cost">
                  £{estimatedCost.toFixed(2)}
                </Text>
              </View>
              {budgetCap && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Budget Cap</Text>
                  <Text style={styles.summaryValue} data-testid="text-summary-budget">
                    £{parseFloat(budgetCap || "0").toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.backButton}
                onPress={goBackToStep1}
                data-testid="button-back-step"
                accessibilityLabel="Back to setup"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={18} color={Colors.text} />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.primaryButton,
                  styles.submitButton,
                  { backgroundColor: activeColor },
                  submitting && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
                data-testid="button-create-campaign"
                accessibilityLabel="Create campaign"
                accessibilityRole="button"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={18} color={Colors.white} />
                    <Text style={styles.primaryButtonText}>Create Campaign</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  stepIndicator: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.white,
  },
  stepLine: {
    height: 2,
    width: 80,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  stepLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  stepLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerButtonText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  optionsList: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  optionSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  contactInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  contactInputGroup: {
    flex: 1,
    gap: Spacing.sm,
  },
  contactPhoneInput: {
    flex: 1,
  },
  contactNameInput: {
    flex: 1,
  },
  addContactButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  contactsList: {
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  contactInfo: {
    flex: 1,
  },
  contactItemName: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  contactItemPhone: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeContactButton: {
    padding: Spacing.xs,
  },
  budgetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currencySymbol: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  budgetInput: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "right",
    flexShrink: 1,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  submitButton: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
