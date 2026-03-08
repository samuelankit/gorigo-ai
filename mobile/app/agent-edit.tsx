import { View, Text, StyleSheet, ScrollView, TextInput, Switch, Pressable, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { createAgent, updateAgent } from "../lib/api";
import { useBranding } from "../lib/branding-context";

const AGENT_TYPES = [
  { label: "General", value: "general" },
  { label: "Sales", value: "sales" },
  { label: "Support", value: "support" },
  { label: "Receptionist", value: "receptionist" },
  { label: "Booking", value: "booking" },
  { label: "FAQ", value: "faq" },
];

const LANGUAGES = [
  { label: "English (UK)", value: "en-GB" },
  { label: "English (US)", value: "en-US" },
  { label: "Spanish", value: "es-ES" },
  { label: "French", value: "fr-FR" },
  { label: "German", value: "de-DE" },
  { label: "Italian", value: "it-IT" },
  { label: "Portuguese", value: "pt-PT" },
  { label: "Dutch", value: "nl-NL" },
  { label: "Arabic", value: "ar-SA" },
  { label: "Hindi", value: "hi-IN" },
];

export default function AgentEditScreen() {
  const { branding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    agentType?: string;
    language?: string;
    greeting?: string;
    enabled?: string;
  }>();

  const isEditing = !!params.id;

  const [name, setName] = useState(params.name || "");
  const [agentType, setAgentType] = useState(params.agentType || "general");
  const [language, setLanguage] = useState(params.language || "en-GB");
  const [greeting, setGreeting] = useState(params.greeting || "Hello, thank you for calling. How can I help you today?");
  const [enabled, setEnabled] = useState(params.enabled !== "false");
  const [saving, setSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const getTypeLabel = (value: string) => AGENT_TYPES.find((t) => t.value === value)?.label || value;
  const getLanguageLabel = (value: string) => LANGUAGES.find((l) => l.value === value)?.label || value;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Agent name is required.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateAgent(parseInt(params.id!, 10), {
          name: name.trim(),
          agentType,
          language,
          greeting,
          enabled,
        });
      } else {
        await createAgent({
          name: name.trim(),
          agentType,
          language,
          greeting,
          enabled,
        });
      }
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save agent. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.formSection}>
        <Text style={styles.label}>Agent Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sales Assistant"
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel="Agent name"
          accessibilityRole="text"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Type</Text>
        <Pressable
          style={styles.pickerButton}
          onPress={() => { setShowTypePicker(!showTypePicker); setShowLanguagePicker(false); }}
          accessibilityLabel="Select agent type"
          accessibilityRole="button"
        >
          <Text style={styles.pickerButtonText}>{getTypeLabel(agentType)}</Text>
          <Ionicons name={showTypePicker ? "chevron-up" : "chevron-down"} size={18} color={Colors.textSecondary} />
        </Pressable>
        {showTypePicker && (
          <View style={styles.optionsList}>
            {AGENT_TYPES.map((type) => (
              <Pressable
                key={type.value}
                style={[styles.optionItem, agentType === type.value && { backgroundColor: activeColor + "15" }]}
                onPress={() => { setAgentType(type.value); setShowTypePicker(false); }}
                accessibilityLabel={`Select type ${type.label}`}
                accessibilityRole="button"
              >
                <Text style={[styles.optionText, agentType === type.value && { color: activeColor, fontWeight: "600" }]}>
                  {type.label}
                </Text>
                {agentType === type.value && <Ionicons name="checkmark" size={18} color={activeColor} />}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Language</Text>
        <Pressable
          style={styles.pickerButton}
          onPress={() => { setShowLanguagePicker(!showLanguagePicker); setShowTypePicker(false); }}
          accessibilityLabel="Select language"
          accessibilityRole="button"
        >
          <Text style={styles.pickerButtonText}>{getLanguageLabel(language)}</Text>
          <Ionicons name={showLanguagePicker ? "chevron-up" : "chevron-down"} size={18} color={Colors.textSecondary} />
        </Pressable>
        {showLanguagePicker && (
          <View style={styles.optionsList}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.value}
                style={[styles.optionItem, language === lang.value && { backgroundColor: activeColor + "15" }]}
                onPress={() => { setLanguage(lang.value); setShowLanguagePicker(false); }}
                accessibilityLabel={`Select language ${lang.label}`}
                accessibilityRole="button"
              >
                <Text style={[styles.optionText, language === lang.value && { color: activeColor, fontWeight: "600" }]}>
                  {lang.label}
                </Text>
                {language === lang.value && <Ionicons name="checkmark" size={18} color={activeColor} />}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Greeting Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={greeting}
          onChangeText={setGreeting}
          placeholder="Enter the greeting message..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Greeting message"
          accessibilityRole="text"
        />
      </View>

      <View style={styles.formSection}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.label}>Enabled</Text>
            <Text style={styles.toggleDescription}>Agent will be active and ready to handle calls</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: Colors.border, true: activeColor + "80" }}
            thumbColor={enabled ? activeColor : Colors.textTertiary}
            accessibilityLabel="Toggle agent enabled"
            accessibilityRole="switch"
          />
        </View>
      </View>

      <Pressable
        style={[styles.saveButton, { backgroundColor: activeColor }, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityLabel={isEditing ? "Save changes" : "Create agent"}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>{isEditing ? "Save Changes" : "Create Agent"}</Text>
        )}
      </Pressable>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
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
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  toggleDescription: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
