import { router, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { Screen } from "../../components/Screen";
import { EmptyState, ErrorState, Loading } from "../../components/States";
import { IconBubble, type IconName, Panel } from "../../components/ui";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import type { AppNotification, NotificationType } from "../../lib/types";
import { useFetch } from "../../lib/useFetch";

const ICON: Record<NotificationType, IconName> = {
  SESSION_REMINDER: "alarm",
  SESSION_SCHEDULED: "calendar-clock",
  NEW_PLAN: "clipboard-text-outline",
  PAYMENT_SUCCESS: "check-decagram",
  RENEWAL_REMINDER: "credit-card-clock-outline",
};

const TARGET: Record<NotificationType, string> = {
  SESSION_REMINDER: "/sessions",
  SESSION_SCHEDULED: "/sessions",
  NEW_PLAN: "/coaching",
  PAYMENT_SUCCESS: "/subscription",
  RENEWAL_REMINDER: "/subscribe",
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const { data, error, loading, refreshing, refresh, setData } = useFetch<{ notifications: AppNotification[]; unreadCount: number }>("/notifications");

  function open(n: AppNotification) {
    if (!n.readAt) {
      void api.post(`/notifications/${n.id}/read`).catch(() => {});
      setData((d) => d && { unreadCount: Math.max(0, d.unreadCount - 1), notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) });
    }
    router.push(TARGET[n.type] as never);
  }

  async function readAll() {
    await api.post("/notifications/read-all").catch(() => {});
    await refresh();
  }

  return (
    <>
      <Stack.Screen options={{ headerRight: () => (data?.unreadCount ? <Button onPress={readAll}>Mark all read</Button> : null) }} />
      <Screen onRefresh={refresh} refreshing={refreshing}>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : !data?.notifications.length ? (
          <EmptyState icon="bell-sleep-outline" title="You're all caught up" body="Session reminders, new plans and payment receipts show up here." />
        ) : (
          data.notifications.map((n) => (
            <Panel key={n.id} onPress={() => open(n)} style={styles.item}>
              <IconBubble icon={ICON[n.type]} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="titleSmall" style={{ fontWeight: n.readAt ? "500" : "700" }}>
                  {n.title}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {n.body}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {timeAgo(n.createdAt)}
                </Text>
              </View>
              {!n.readAt && <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />}
            </Panel>
          ))
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});
