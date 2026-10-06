import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { CATEGORY_ICON, CATEGORY_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL } from "../lib/format";
import type { Category, WorkoutSummary } from "../lib/types";
import { CATEGORY_GRADIENT, radius } from "../theme";
import { MUSCLE_LABEL, type MuscleId } from "./body-map-data";
import { ScalePressable } from "./motion";
import { type IconName, Meta, shadow } from "./ui";

/** Real image if one was added (demo-media.json), otherwise a category gradient with a large icon. */
export function WorkoutBanner({
  category,
  thumbnailUrl,
  height = 150,
  children,
  rounded = true,
}: {
  category: Category;
  thumbnailUrl: string | null;
  height?: number;
  children?: ReactNode;
  rounded?: boolean;
}) {
  return (
    <View style={{ height, borderRadius: rounded ? radius.md : 0, overflow: "hidden" }}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={CATEGORY_GRADIENT[category]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
          <MaterialCommunityIcons
            name={CATEGORY_ICON[category] as IconName}
            size={height * 0.9}
            color="rgba(255,255,255,0.16)"
            style={{ position: "absolute", right: -height * 0.12, bottom: -height * 0.15, transform: [{ rotate: "-12deg" }] }}
          />
        </LinearGradient>
      )}
      {/* Darken the bottom so white text stays readable on photos. */}
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.45)"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.35 }} end={{ x: 0, y: 1 }} />
      {children}
    </View>
  );
}

const equipmentIcon = { GYM: "weight-lifter", HOME: "home-outline", NONE: "human-handsup" } as const;

export function WorkoutCard({ workout, compact = false }: { workout: WorkoutSummary; compact?: boolean }) {
  const theme = useTheme();
  const open = () => router.push({ pathname: "/workout/[id]", params: { id: workout.id } });
  const focus = workout.muscles.primary.slice(0, 3).map((m) => MUSCLE_LABEL[m as MuscleId] ?? m).join(" · ");

  return (
    <ScalePressable onPress={open} style={[compact ? styles.compact : styles.card, { backgroundColor: theme.colors.surface }, !theme.dark && shadow]}>
      <WorkoutBanner category={workout.category} thumbnailUrl={workout.thumbnailUrl} height={compact ? 120 : 150}>
        <View style={styles.overlay}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{CATEGORY_LABEL[workout.category].toUpperCase()}</Text>
          </View>
          <Text variant={compact ? "titleMedium" : "titleLarge"} style={styles.title} numberOfLines={2}>
            {workout.title}
          </Text>
        </View>
        {workout.hasVideo && (
          <View style={styles.play}>
            <MaterialCommunityIcons name="play" size={18} color="#fff" />
          </View>
        )}
      </WorkoutBanner>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Meta icon="clock-outline" label={`${workout.durationMinutes} min`} />
          <Meta icon="signal-cellular-2" label={DIFFICULTY_LABEL[workout.difficulty]} />
          {!compact && <Meta icon={equipmentIcon[workout.equipmentSetting]} label={EQUIPMENT_LABEL[workout.equipmentSetting]} />}
        </View>
        {!compact && !!focus && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            Targets: {focus}
          </Text>
        )}
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, overflow: "hidden" },
  compact: { width: 230, borderRadius: radius.md, overflow: "hidden" },
  overlay: { position: "absolute", left: 14, right: 14, bottom: 12, gap: 6 },
  badge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  title: { color: "#fff", fontWeight: "700" },
  play: { position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  body: { padding: 12, gap: 6 },
  metaRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
});
