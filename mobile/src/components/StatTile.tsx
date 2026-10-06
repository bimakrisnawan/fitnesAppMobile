import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useTween } from "../lib/motion";
import { radius } from "../theme";
import { IconBubble, type IconName, shadow } from "./ui";

/** Numbers count up from 0 when they first appear (and animate on change). */
export function StatTile({ icon, value, label, color, tint, delay = 0 }: { icon: IconName; value: string | number; label: string; color?: string; tint?: string; delay?: number }) {
  const theme = useTheme();
  const animated = useTween(typeof value === "number" ? value : 0, 900, delay);
  return (
    <View style={[styles.tile, { backgroundColor: theme.colors.surface }, !theme.dark && shadow]}>
      <IconBubble icon={icon} size={34} color={color} tint={tint} />
      <Text variant="headlineSmall" style={styles.value}>
        {typeof value === "number" ? Math.round(animated) : value}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: radius.md, padding: 12, gap: 6 },
  value: { fontWeight: "700", fontVariant: ["tabular-nums"] },
});
