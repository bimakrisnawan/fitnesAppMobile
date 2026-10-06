import { randomUUID } from "expo-crypto";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, HelperText, SegmentedButtons, Text, TextInput, useTheme } from "react-native-paper";
import { Screen } from "../../components/Screen";
import { errorMessage } from "../../lib/api";
import {
  fetchPaymentStatus,
  fetchPlans,
  formatDate,
  formatIdr,
  type Payment,
  type Plan,
  type Specialization,
  startCheckout,
  type Tier,
} from "../../lib/billing";
import { useAuth } from "../../stores/auth";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 3 * 60_000;

type Phase =
  | { kind: "choose" }
  | { kind: "paying" }
  | { kind: "checking"; payment: Payment }
  | { kind: "done"; payment: Payment }
  | { kind: "unpaid"; payment: Payment };

export default function SubscribeScreen() {
  const theme = useTheme();
  const hasPhone = useAuth((s) => s.user?.hasPhone ?? false);
  const refreshUser = useAuth((s) => s.refreshUser);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  // "Get my coach" links here with ?tier=COACHING.
  const params = useLocalSearchParams<{ tier?: string }>();
  const [tier, setTier] = useState<Tier>(params.tier === "COACHING" ? "COACHING" : "MONTHLY");
  const [specialization, setSpecialization] = useState<Specialization>("GENERAL");
  const [phone, setPhone] = useState("");
  const selected = plans?.find((p) => p.tier === tier);
  const [phase, setPhase] = useState<Phase>({ kind: "choose" });
  const [error, setError] = useState<string | null>(null);
  // One key per checkout attempt, so a double tap can't create two invoices.
  const idempotencyKey = useRef(randomUUID());
  const mounted = useRef(true);

  useEffect(() => {
    fetchPlans().then(setPlans, (err) => setError(errorMessage(err)));
    return () => {
      mounted.current = false;
    };
  }, []);

  async function pollUntilFinal(payment: Payment) {
    setPhase({ kind: "checking", payment });
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (mounted.current && Date.now() < deadline) {
      try {
        const latest = await fetchPaymentStatus(payment.orderId);
        if (latest.status === "SETTLED") return setPhase({ kind: "done", payment: latest });
        if (latest.status !== "PENDING") return setPhase({ kind: "unpaid", payment: latest });
      } catch {
        // Transient network error: keep polling until the deadline.
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    if (mounted.current) setPhase({ kind: "unpaid", payment });
  }

  async function onPay() {
    setError(null);
    setPhase({ kind: "paying" });
    // Web: browsers block popups opened after an await, so open the window now and point it at checkout later.
    const webWindow = Platform.OS === "web" ? window.open("", "_blank") : null;
    try {
      const payment = await startCheckout(
        { tier, specialization: tier === "COACHING" ? specialization : undefined, phone: phone.trim() || undefined },
        idempotencyKey.current,
      );
      if (phone.trim()) void refreshUser().catch(() => {});
      if (payment.status === "SETTLED") {
        webWindow?.close();
        return setPhase({ kind: "done", payment });
      }
      if (!payment.paymentUrl) throw new Error("No checkout link returned");
      if (Platform.OS === "web") {
        if (webWindow) webWindow.location.href = payment.paymentUrl;
        else window.open(payment.paymentUrl, "_blank");
      } else {
        // Mayar's hosted page shows the QRIS code. On a phone, the user screenshots it or switches to their
        // e-wallet app; the session closes when Mayar redirects back to the app, or when the user dismisses it.
        await WebBrowser.openAuthSessionAsync(payment.paymentUrl, Linking.createURL("payment-complete"));
      }
      await pollUntilFinal(payment);
    } catch (err) {
      webWindow?.close();
      setError(errorMessage(err));
      setPhase({ kind: "choose" });
      idempotencyKey.current = randomUUID();
    }
  }

  if (phase.kind === "checking" || phase.kind === "paying") {
    return (
      <Screen centered>
        <ActivityIndicator size="large" />
        <Text variant="titleMedium" style={{ textAlign: "center" }}>
          {phase.kind === "paying" ? "Opening checkout…" : "Waiting for payment confirmation…"}
        </Text>
        {phase.kind === "checking" && (
          <>
            <Text style={{ textAlign: "center" }}>
              This usually takes a few seconds after you pay. You can leave this screen; we'll notify you when it's done.
            </Text>
            {phase.payment.paymentUrl && (
              <Button onPress={() => WebBrowser.openBrowserAsync(phase.payment.paymentUrl!)}>Show QRIS again</Button>
            )}
          </>
        )}
      </Screen>
    );
  }

  if (phase.kind === "done") {
    return (
      <Screen centered>
        <Text variant="headlineSmall">You're in! 🎉</Text>
        <Text>
          Order {phase.payment.orderId} is paid.
          {phase.payment.periodEnd ? ` Your plan is active until ${formatDate(phase.payment.periodEnd)}.` : ""}
        </Text>
        <Button mode="contained" onPress={() => router.back()}>
          Start training
        </Button>
      </Screen>
    );
  }

  if (phase.kind === "unpaid") {
    return (
      <Screen centered>
        <Text variant="titleLarge">Payment not confirmed yet</Text>
        <Text>
          {phase.payment.status === "PENDING"
            ? "If you've already paid, it can take a moment to arrive. Check again, or come back later — your plan activates automatically."
            : "This checkout expired. You can start a new one."}
        </Text>
        {phase.payment.status === "PENDING" ? (
          <Button mode="contained" onPress={() => pollUntilFinal(phase.payment)}>
            Check again
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={() => {
              idempotencyKey.current = randomUUID();
              setPhase({ kind: "choose" });
            }}
          >
            Try again
          </Button>
        )}
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View style={{ gap: 4 }}>
          <Button mode="contained" icon="qrcode-scan" contentStyle={{ height: 50 }} onPress={onPay} disabled={!plans || (!hasPhone && !phone.trim())}>
            {selected ? `Pay ${formatIdr(selected.priceIdr)} with QRIS` : "Pay with QRIS"}
          </Button>
          <Text variant="labelSmall" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant }}>
            GoPay · OVO · DANA · ShopeePay · mobile banking. No auto-renewal.
          </Text>
        </View>
      }
    >
      <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
        Choose how you want to train
      </Text>
      {!plans && !error && <ActivityIndicator />}
      {plans?.map((plan) => {
        const info = PLAN_INFO[plan.tier];
        const isSelected = tier === plan.tier;
        return (
          <Pressable
            key={plan.tier}
            onPress={() => setTier(plan.tier)}
            style={[
              styles.plan,
              { backgroundColor: theme.colors.surface, borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant },
            ]}
          >
            {info.badge && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text style={{ color: theme.colors.onPrimary, fontSize: 11, fontWeight: "700" }}>{info.badge}</Text>
              </View>
            )}
            <View style={styles.planHead}>
              <MaterialCommunityIcons name={isSelected ? "radiobox-marked" : "radiobox-blank"} size={24} color={isSelected ? theme.colors.primary : theme.colors.outline} />
              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={{ fontWeight: "700" }}>
                  {plan.name}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {info.tagline}
                </Text>
              </View>
            </View>
            <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
              {formatIdr(plan.priceIdr)}
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {" "}
                / month
              </Text>
            </Text>
            <View style={{ gap: 6 }}>
              {info.features.map((f) => (
                <View key={f} style={styles.feature}>
                  <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.tertiary} />
                  <Text variant="bodyMedium" style={{ flex: 1 }}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </Pressable>
        );
      })}

      {tier === "COACHING" && (
        <View style={{ gap: 8 }}>
          <Text variant="titleSmall">What should your coach focus on?</Text>
          <SegmentedButtons
            value={specialization}
            onValueChange={(v) => setSpecialization(v as Specialization)}
            buttons={[
              { value: "RUNNING", label: "Running", icon: "run" },
              { value: "SWIMMING", label: "Swimming", icon: "swim" },
              { value: "GENERAL", label: "General", icon: "dumbbell" },
            ]}
          />
        </View>
      )}

      {!hasPhone && (
        <TextInput
          label="Mobile number (for your receipt)"
          placeholder="0812…"
          mode="outlined"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          left={<TextInput.Icon icon="cellphone" />}
        />
      )}
      {error && (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      )}
    </Screen>
  );
}

const PLAN_INFO: Record<Tier, { tagline: string; features: string[]; badge?: string }> = {
  MONTHLY: {
    tagline: "Ready-made workouts you follow on your own",
    features: [
      "Full library of follow-along workouts",
      "Video demos for every exercise",
      "Home, no-equipment and gym options",
      "Track workouts, streaks and history",
    ],
  },
  COACHING: {
    tagline: "A personal coach builds your plan for you",
    badge: "MOST RESULTS",
    features: [
      "Training plan made only for you, updated weekly",
      "Running, swimming or general fitness specialist",
      "Weekly 45-minute 1-on-1 video call",
      "Coach sees your logs and adjusts your plan",
      "Everything in Monthly included",
    ],
  },
};

const styles = StyleSheet.create({
  plan: { borderWidth: 2, borderRadius: 18, padding: 16, gap: 10 },
  planHead: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  badge: { position: "absolute", top: -11, right: 16, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  feature: { flexDirection: "row", gap: 8, alignItems: "center" },
});
