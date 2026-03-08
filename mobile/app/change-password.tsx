import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { changePassword } from "../lib/api";
import { router } from "expo-router";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = async () => {
    if (!currentPassword) {
      Alert.alert("Validation", "Current password is required.");
      return;
    }
    if (!newPassword) {
      Alert.alert("Validation", "New password is required.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Validation", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert("Success", "Password changed successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              accessibilityLabel="Current password input"
              accessibilityRole="text"
              data-testid="input-current-password"
            />
            <Pressable
              onPress={() => setShowCurrent(!showCurrent)}
              accessibilityLabel={showCurrent ? "Hide current password" : "Show current password"}
              accessibilityRole="button"
              data-testid="button-toggle-current-password"
            >
              <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="key-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              accessibilityLabel="New password input"
              accessibilityRole="text"
              data-testid="input-new-password"
            />
            <Pressable
              onPress={() => setShowNew(!showNew)}
              accessibilityLabel={showNew ? "Hide new password" : "Show new password"}
              accessibilityRole="button"
              data-testid="button-toggle-new-password"
            >
              <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="key-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              accessibilityLabel="Confirm new password input"
              accessibilityRole="text"
              data-testid="input-confirm-password"
            />
            <Pressable
              onPress={() => setShowConfirm(!showConfirm)}
              accessibilityLabel={showConfirm ? "Hide confirm password" : "Show confirm password"}
              accessibilityRole="button"
              data-testid="button-toggle-confirm-password"
            >
              <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.requirements}>Password must be at least 8 characters long.</Text>

        <Pressable
          style={({ pressed }) => [styles.saveButton, saving && styles.saveButtonDisabled, pressed && styles.saveButtonPressed]}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Change password"
          accessibilityRole="button"
          data-testid="button-change-password"
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={20} color="white" />
              <Text style={styles.saveButtonText}>Change Password</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: 14,
  },
  requirements: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: "white",
  },
});
