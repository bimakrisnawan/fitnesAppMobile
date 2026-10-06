import { Link } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { AuthShell } from "../../components/AuthShell";
import { errorMessage } from "../../lib/api";
import { useAuth } from "../../stores/auth";

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!email || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue your training.">
      <TextInput
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        left={<TextInput.Icon icon="email-outline" />}
      />
      <TextInput
        label="Password"
        mode="outlined"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoComplete="current-password"
        onSubmitEditing={onSubmit}
        left={<TextInput.Icon icon="lock-outline" />}
        right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
      />
      <View style={{ alignItems: "flex-end" }}>
        <Link href="/forgot-password" asChild>
          <Button compact>Forgot password?</Button>
        </Link>
      </View>
      {error && (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      )}
      <Button mode="contained" contentStyle={{ height: 50 }} onPress={onSubmit} loading={submitting} disabled={submitting || !email || !password}>
        Log in
      </Button>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          New here?
        </Text>
        <Link href="/register" asChild>
          <Button compact>Create an account</Button>
        </Link>
      </View>
    </AuthShell>
  );
}
