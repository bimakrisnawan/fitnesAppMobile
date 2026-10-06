import { StyleSheet, View } from "react-native";
import { List, Text, useTheme } from "react-native-paper";
import type { Alternative } from "../lib/types";

const SETTING: Record<Alternative["setting"], { label: string; icon: string }> = {
  home: { label: "At home", icon: "home" },
  minimal: { label: "Easier / minimal", icon: "feather" },
  outdoor: { label: "Outdoors", icon: "tree" },
  gym: { label: "In the gym", icon: "weight-lifter" },
};

/** "No dumbbell? Use a filled backpack." The equipment substitution guide from the brief. */
export function Alternatives({ items, equipment }: { items: Alternative[]; equipment?: string[] }) {
  const theme = useTheme();
  if (!items.length && !equipment?.length) return null;
  return (
    <View style={styles.box}>
      {!!equipment?.length && (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Equipment: {equipment.join(", ")}
        </Text>
      )}
      {items.map((a, i) => (
        <List.Item
          key={i}
          title={`${SETTING[a.setting].label}: ${a.with}`}
          description={`Instead of ${a.replace}${a.note ? ` · ${a.note}` : ""}`}
          titleNumberOfLines={2}
          left={(p) => <List.Icon {...p} icon={SETTING[a.setting].icon} />}
          style={styles.item}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 0 },
  item: { paddingVertical: 2, paddingLeft: 0 },
});
