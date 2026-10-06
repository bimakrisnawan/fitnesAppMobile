import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Card, Chip, Dialog, Divider, List, Portal, Snackbar, Text, useTheme } from "react-native-paper";
import { Screen } from "../../components/Screen";
import { EmptyState, ErrorState, Loading } from "../../components/States";
import { api, errorMessage } from "../../lib/api";
import { formatDate, formatIdr, type Payment } from "../../lib/billing";
import { formatDateTime, SPECIALIZATION_LABEL } from "../../lib/format";
import type { SubscriptionRow } from "../../lib/types";
import { useFetch } from "../../lib/useFetch";

const STATUS: Record<SubscriptionRow["status"], { label: string; icon: string }> = {
  PENDING: { label: "Awaiting payment", icon: "timer-sand" },
  ACTIVE: { label: "Active", icon: "check-circle" },
  PAUSED: { label: "Paused", icon: "pause-circle" },
  CANCELLED: { label: "Cancelled", icon: "close-circle" },
  EXPIRED: { label: "Expired", icon: "alert-circle" },
};

const PAYMENT_STATUS: Record<Payment["status"], string> = {
  PENDING: "Waiting for payment",
  SETTLED: "Paid",
  FAILED: "Failed",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
};

type Action = { kind: "cancel" | "pause"; sub: SubscriptionRow };

export default function SubscriptionScreen() {
  const theme = useTheme();
  const subs = useFetch<{ subscriptions: SubscriptionRow[] }>("/subscriptions");
  const payments = useFetch<{ payments: (Payment & { createdAt: string; paidAt: string | null })[] }>("/payments/history");
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(path: string, success: string) {
    setBusy(true);
    try {
      await api.post(path);
      setMessage(success);
      await subs.refresh();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const visible = subs.data?.subscriptions.filter((s) => s.status !== "PENDING") ?? [];
  const name = (s: SubscriptionRow) => (s.tier === "MONTHLY" ? "Monthly Membership" : "1-on-1 Coaching");

  return (
    <>
      <Screen onRefresh={() => { void subs.refresh(); void payments.refresh(); }} refreshing={subs.refreshing}>
        {subs.loading ? (
          <Loading />
        ) : subs.error ? (
          <ErrorState message={subs.error} onRetry={subs.refresh} />
        ) : !visible.length ? (
          <EmptyState icon="card-account-details-outline" title="No membership yet" action={<Button mode="contained" onPress={() => router.push("/subscribe")}>See plans</Button>} />
        ) : (
          visible.map((s) => {
            const until = s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : null;
            return (
              <Card key={s.id}>
                <Card.Title
                  title={name(s)}
                  subtitle={[s.specialization && s.tier === "COACHING" ? SPECIALIZATION_LABEL[s.specialization] : null, s.coach ? `Coach: ${s.coach.fullName}` : null].filter(Boolean).join(" · ") || undefined}
                  right={() => (
                    <Chip compact icon={STATUS[s.status].icon} style={styles.chip}>
                      {STATUS[s.status].label}
                    </Chip>
                  )}
                />
                <Card.Content>
                  <Text variant="bodyMedium">
                    {s.status === "ACTIVE" && until && `Paid until ${until}. QRIS doesn't renew automatically; we'll remind you 3 days before.`}
                    {s.status === "CANCELLED" && until && `You keep access until ${until}.`}
                    {s.status === "PAUSED" && "Paused: your remaining days are frozen and added back when you resume."}
                    {s.status === "EXPIRED" && "Your plan has ended. Renew to pick up where you left off."}
                  </Text>
                </Card.Content>
                <Card.Actions>
                  {s.status === "ACTIVE" && (
                    <>
                      <Button onPress={() => setConfirm({ kind: "pause", sub: s })}>Pause</Button>
                      <Button onPress={() => setConfirm({ kind: "cancel", sub: s })} textColor={theme.colors.error}>
                        Cancel
                      </Button>
                    </>
                  )}
                  {s.status === "PAUSED" && (
                    <Button mode="contained" onPress={() => run(`/subscriptions/${s.id}/resume`, "Welcome back! Your plan is active again.")} loading={busy}>
                      Resume
                    </Button>
                  )}
                  {s.status !== "PAUSED" && (
                    <Button mode="contained" onPress={() => router.push("/subscribe")}>
                      {s.status === "ACTIVE" ? "Renew early" : "Renew"}
                    </Button>
                  )}
                </Card.Actions>
              </Card>
            );
          })
        )}

        <Divider />
        <Text variant="titleMedium">Payment history</Text>
        {payments.loading ? (
          <Loading />
        ) : !payments.data?.payments.length ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No payments yet.
          </Text>
        ) : (
          payments.data.payments.map((p) => (
            <List.Item
              key={p.orderId}
              title={`${p.tier === "MONTHLY" ? "Monthly" : "Coaching"} · ${formatIdr(p.amount)}`}
              description={`${PAYMENT_STATUS[p.status]} · ${formatDateTime(p.paidAt ?? p.createdAt)}\nOrder ${p.orderId}${p.periodEnd && p.status === "SETTLED" ? ` · covers until ${formatDate(p.periodEnd)}` : ""}`}
              descriptionNumberOfLines={3}
              left={(props) => <List.Icon {...props} icon={p.status === "SETTLED" ? "receipt" : p.status === "PENDING" ? "timer-sand" : "close-circle-outline"} />}
            />
          ))
        )}
      </Screen>

      <Portal>
        <Dialog visible={!!confirm} onDismiss={() => setConfirm(null)}>
          <Dialog.Title>{confirm?.kind === "cancel" ? "Cancel membership?" : "Pause membership?"}</Dialog.Title>
          <Dialog.Content>
            <Text>
              {confirm?.kind === "cancel"
                ? `You'll keep access until ${confirm.sub.currentPeriodEnd ? formatDate(confirm.sub.currentPeriodEnd) : "the end of your paid period"}. You can renew any time.`
                : "Access stops now and your remaining days are saved. Resume whenever you're ready, e.g. after an injury or a trip."}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirm(null)}>Keep it</Button>
            <Button
              loading={busy}
              disabled={busy}
              onPress={() =>
                confirm &&
                run(`/subscriptions/${confirm.sub.id}/${confirm.kind}`, confirm.kind === "cancel" ? "Membership cancelled." : "Membership paused.")
              }
            >
              {confirm?.kind === "cancel" ? "Cancel membership" : "Pause"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={!!message} onDismiss={() => setMessage(null)} duration={3000}>
        {message}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { marginRight: 12 },
});
