import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, useTheme } from "react-native-paper";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function Loading() {
  return <ActivityIndicator style={{ marginVertical: 32 }} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.box}>
      <MaterialCommunityIcons name="cloud-alert" size={40} color={theme.colors.error} />
      <Text style={styles.center}>{message}</Text>
      {onRetry && <Button onPress={onRetry}>Try again</Button>}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.box}>
      <MaterialCommunityIcons name={icon} size={44} color={theme.colors.primary} />
      <Text variant="titleMedium" style={styles.center}>
        {title}
      </Text>
      {body && (
        <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
          {body}
        </Text>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", gap: 8, paddingVertical: 32, paddingHorizontal: 16 },
  center: { textAlign: "center" },
});
