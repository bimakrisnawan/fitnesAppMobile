import { Link } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { AuthShell } from "../../components/AuthShell";
import { errorMessage } from "../../lib/api";
import { useAuth } from "../../stores/auth";

export default function RegisterScreen() {
  const theme = useTheme();
  const register = useAuth((s) => s.register);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordTooShort = password.length > 0 && password.length < 8;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await register(fullName.trim(), email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Free to join. Browse every workout before you subscribe.">
      <TextInput label="Full name" mode="outlined" value={fullName} onChangeText={setFullName} autoComplete="name" left={<TextInput.Icon icon="account-outline" />} />
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
        autoComplete="new-password"
        error={passwordTooShort}
        left={<TextInput.Icon icon="lock-outline" />}
        right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
      />
      <HelperText type={error || passwordTooShort ? "error" : "info"} visible>
        {error ?? "At least 8 characters"}
      </HelperText>
      <Button mode="contained" contentStyle={{ height: 50 }} onPress={onSubmit} loading={submitting} disabled={submitting || !fullName || !email || password.length < 8}>
        Create account
      </Button>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Already have an account?
        </Text>
        <Link href="/login" asChild>
          <Button compact>Log in</Button>
        </Link>
      </View>
    </AuthShell>
  );
}
