import { Link } from "expo-router";
import { useState } from "react";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { AuthShell } from "../../components/AuthShell";
import { api, errorMessage } from "../../lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/password-reset/request", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={sent ? "Check your email" : "Reset your password"} subtitle={sent ? "" : "Enter your email and we'll send you a reset link."}>
      {sent ? (
        <Text variant="bodyLarge">If an account exists for {email.trim()}, we've emailed a link to reset your password. It's valid for 1 hour.</Text>
      ) : (
        <>
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
          {error && <HelperText type="error">{error}</HelperText>}
          <Button mode="contained" contentStyle={{ height: 50 }} onPress={onSubmit} loading={submitting} disabled={submitting || !email}>
            Send reset link
          </Button>
        </>
      )}
      <Link href="/login" asChild>
        <Button icon="arrow-left">Back to log in</Button>
      </Link>
    </AuthShell>
  );
}
