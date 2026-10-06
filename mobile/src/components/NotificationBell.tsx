import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { Badge, IconButton } from "react-native-paper";
import { api } from "../lib/api";

/** Header bell with an unread count, refreshed when the screen gains focus and every minute. */
export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () =>
        api
          .get<{ unreadCount: number }>("/notifications")
          .then(({ data }) => active && setUnread(data.unreadCount))
          .catch(() => {});
      void load();
      const timer = setInterval(load, 60_000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, []),
  );

  return (
    <View>
      <IconButton icon={unread ? "bell-badge" : "bell-outline"} onPress={() => router.push("/notifications")} accessibilityLabel="Notifications" />
      {unread > 0 && (
        <Badge size={16} style={{ position: "absolute", top: 6, right: 6 }}>
          {unread}
        </Badge>
      )}
    </View>
  );
}
