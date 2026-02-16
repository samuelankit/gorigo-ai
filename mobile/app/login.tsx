import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "../constants/theme";
import { login, fetchBranding } from "../lib/api";
import { useBranding } from "../lib/branding-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [showPartnerCode, setShowPartnerCode] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);

  const { branding, isWhiteLabel, setBranding, resetBranding } = useBranding();
  const activeColor = branding?.brandColor || Colors.primary;

  const handleApplyPartnerCode = async () => {
    if (!partnerCodeInput.trim()) return;

    setBrandingLoading(true);
    setError("");
    try {
      const config = await fetchBranding(partnerCodeInput.trim());
      await setBranding(config, partnerCodeInput.trim());
      setShowPartnerCode(false);
    } catch (err: any) {
      setError(err.message || "Invalid partner code");
    } finally {
      setBrandingLoading(false);
    }
  };

  const handleClearBranding = async () => {
    await resetBranding();
    setPartnerCodeInput("");
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password.trim());
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <View style={styles.logo}>
          {branding?.brandLogo ? (
            <Image
              source={{ uri: branding.brandLogo }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.logoCircle, { backgroundColor: activeColor }]}>
              <Ionicons name="call" size={32} color={Colors.white} />
            </View>
          )}
          <Text style={[styles.logoText, { color: activeColor }]}>{branding?.brandName || "GoRigo"}</Text>
          <Text style={styles.tagline}>AI Call Center</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={Colors.textTertiary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.loginButton, { backgroundColor: activeColor }, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.partnerSection}>
          {isWhiteLabel ? (
            <Pressable onPress={handleClearBranding}>
              <Text style={[styles.partnerToggle, { color: activeColor }]}>
                Using partner branding — tap to reset
              </Text>
            </Pressable>
          ) : showPartnerCode ? (
            <View style={styles.partnerCodeBox}>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={partnerCodeInput}
                  onChangeText={setPartnerCodeInput}
                  placeholder="Enter partner code"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.partnerActions}>
                <Pressable
                  style={[styles.partnerApplyButton, { backgroundColor: activeColor }, brandingLoading && styles.loginButtonDisabled]}
                  onPress={handleApplyPartnerCode}
                  disabled={brandingLoading}
                >
                  {brandingLoading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.partnerApplyText}>Apply</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => { setShowPartnerCode(false); setError(""); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setShowPartnerCode(true)}>
              <Text style={[styles.partnerToggle, { color: activeColor }]}>
                Have a partner code?
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.footer}>
          {branding?.brandName || "GoRigo"} AI Call Center v1.0.0
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  logo: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  logoText: {
    fontSize: FontSize.hero,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.md,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#fef2f2",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.destructive,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  inputIcon: {
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  loginButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.white,
  },
  partnerSection: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  partnerToggle: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  partnerCodeBox: {
    width: "100%",
    gap: Spacing.sm,
  },
  partnerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    justifyContent: "center",
  },
  partnerApplyButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerApplyText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.white,
  },
  cancelText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  footer: {
    textAlign: "center",
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xxl,
  },
});
