import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Snackbar, Text, TextInput, useTheme } from "react-native-paper";
import { Alternatives } from "../../../components/Alternatives";
import { BodyMap } from "../../../components/BodyMap";
import { MUSCLE_LABEL, type MuscleId } from "../../../components/body-map-data";
import { Screen } from "../../../components/Screen";
import { ErrorState, Loading } from "../../../components/States";
import { Meta, Panel, Section } from "../../../components/ui";
import { WorkoutBanner } from "../../../components/WorkoutCard";
import { YouTubePlayer } from "../../../components/YouTubePlayer";
import { api, errorMessage } from "../../../lib/api";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL, formatSeconds, prescription, relativeDay } from "../../../lib/format";
import type { WorkoutDetail } from "../../../lib/types";
import { useFetch } from "../../../lib/useFetch";
import { radius } from "../../../theme";

type Item = WorkoutDetail["exercises"][number];

function ExerciseCard({ item, index, locked }: { item: Item; index: number; locked: boolean }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [video, setVideo] = useState(false);
  const muscles = item.exercise.primaryMuscles.map((m) => MUSCLE_LABEL[m as MuscleId] ?? m).join(", ");
  return (
    <Panel style={{ padding: 0, gap: 0 }}>
      <Pressable onPress={() => setOpen(!open)} style={styles.exerciseHead}>
        <View style={[styles.number, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="titleMedium" style={{ fontWeight: "700" }}>
            {item.exercise.name}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {[prescription(item), item.restSeconds ? `rest ${formatSeconds(item.restSeconds)}` : null].filter(Boolean).join(" · ")}
          </Text>
          {!!muscles && (
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              {muscles}
            </Text>
          )}
        </View>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={24} color={theme.colors.onSurfaceVariant} />
      </Pressable>
      {open && (
        <View style={[styles.exerciseBody, { borderTopColor: theme.colors.outlineVariant }]}>
          {item.notes && <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{item.notes}</Text>}
          {item.exercise.description && <Text variant="bodyMedium">{item.exercise.description}</Text>}
          {item.exercise.youtubeVideoId ? (
            video ? (
              <YouTubePlayer videoId={item.exercise.youtubeVideoId} />
            ) : (
              <Button icon="play-circle" mode="contained-tonal" onPress={() => setVideo(true)}>
                Watch how to do it
              </Button>
            )
          ) : locked && item.exercise.hasVideo ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              🔒 Demo video included with a plan.
            </Text>
          ) : null}
          {item.exercise.primaryMuscles.length > 0 && (
            <BodyMap primary={item.exercise.primaryMuscles} secondary={item.exercise.secondaryMuscles} height={150} showLegend={false} />
          )}
          <Alternatives items={item.exercise.alternatives} equipment={item.exercise.equipment} />
        </View>
      )}
    </Panel>
  );
}

export default function WorkoutScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refresh } = useFetch<{ workout: WorkoutDetail }>(`/workouts/${id}`);
  const [dialog, setDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Not found"} onRetry={refresh} />;
  const w = data.workout;

  async function complete() {
    setSaving(true);
    try {
      await api.post(`/workouts/${w.id}/complete`, { notes: notes.trim() || undefined });
      setDialog(false);
      setNotes("");
      setSnack("Nice work! Workout logged 💪");
      await refresh();
    } catch (err) {
      setSnack(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const footer = w.locked ? (
    <Button mode="contained" icon="lock-open-variant" contentStyle={styles.cta} onPress={() => router.push("/subscribe")}>
      Unlock with a plan
    </Button>
  ) : (
    <View style={{ gap: 2 }}>
      <Button mode="contained" icon="play" contentStyle={styles.cta} labelStyle={{ fontSize: 16 }} onPress={() => router.push({ pathname: "/player", params: { workoutId: w.id } })}>
        Start workout
      </Button>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
        {w.myCompletions.count > 0 && (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Done {w.myCompletions.count}× · last {relativeDay(w.myCompletions.lastCompletedAt!).toLowerCase()} ·
          </Text>
        )}
        <Button compact onPress={() => setDialog(true)}>
          Already did it? Log it
        </Button>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Screen footer={footer}>
        {!w.locked && w.youtubeVideoId ? (
          <YouTubePlayer videoId={w.youtubeVideoId} />
        ) : (
          <WorkoutBanner category={w.category} thumbnailUrl={w.thumbnailUrl} height={210}>
            <View style={styles.bannerText}>
              <Text style={styles.badge}>{CATEGORY_LABEL[w.category].toUpperCase()}</Text>
              <Text variant="headlineSmall" style={{ color: "#fff", fontWeight: "700" }}>
                {w.title}
              </Text>
            </View>
            {w.locked && (
              <View style={styles.lock}>
                <MaterialCommunityIcons name="lock" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Members only</Text>
              </View>
            )}
          </WorkoutBanner>
        )}

        {!w.locked && w.youtubeVideoId && (
          <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
            {w.title}
          </Text>
        )}

        <View style={[styles.facts, { backgroundColor: theme.colors.surface }]}>
          {[
            ["clock-outline", `${w.durationMinutes} min`, "Duration"],
            ["signal-cellular-2", DIFFICULTY_LABEL[w.difficulty], "Level"],
            ["format-list-numbered", `${w.exercises.length}`, "Exercises"],
            [w.equipmentSetting === "GYM" ? "weight-lifter" : w.equipmentSetting === "HOME" ? "home-outline" : "human-handsup", EQUIPMENT_LABEL[w.equipmentSetting], "Where"],
          ].map(([icon, value, label]) => (
            <View key={label} style={styles.fact}>
              <MaterialCommunityIcons name={icon as never} size={20} color={theme.colors.primary} />
              <Text variant="titleSmall" style={{ fontWeight: "700" }} numberOfLines={1}>
                {value}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {w.description && <Text variant="bodyLarge">{w.description}</Text>}
        {!!w.equipment.length && <Meta icon="toolbox-outline" label={`You'll need: ${w.equipment.join(", ")} (alternatives inside each exercise)`} />}

        {(w.muscles.primary.length > 0 || w.muscles.secondary.length > 0) && (
          <Section title="Muscles worked">
            <Panel>
              <BodyMap primary={w.muscles.primary} secondary={w.muscles.secondary} height={210} />
            </Panel>
          </Section>
        )}

        <Section title={`Exercises (${w.exercises.length})`}>
          {w.exercises.map((item, i) => (
            <ExerciseCard key={item.id} item={item} index={i} locked={w.locked} />
          ))}
        </Section>
      </Screen>

      <Portal>
        <Dialog visible={dialog} onDismiss={() => setDialog(false)}>
          <Dialog.Title>Great job! 🎉</Dialog.Title>
          <Dialog.Content>
            <TextInput label="How did it feel? (optional)" mode="outlined" multiline value={notes} onChangeText={setNotes} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={complete} loading={saving} disabled={saving}>
              Save workout
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={3000}>
        {snack}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  bannerText: { position: "absolute", left: 16, right: 16, bottom: 14, gap: 6 },
  badge: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 1, opacity: 0.9 },
  lock: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  facts: { flexDirection: "row", borderRadius: radius.md, paddingVertical: 14 },
  fact: { flex: 1, alignItems: "center", gap: 3, paddingHorizontal: 4 },
  exerciseHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  exerciseBody: { padding: 14, paddingTop: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  number: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  cta: { height: 50 },
});
