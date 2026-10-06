import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Snackbar, Text, TextInput, useTheme } from "react-native-paper";
import { Alternatives } from "../../../components/Alternatives";
import { BodyMap } from "../../../components/BodyMap";
import { Screen } from "../../../components/Screen";
import { ErrorState, Loading } from "../../../components/States";
import { IconBubble, Meta, Panel, Section } from "../../../components/ui";
import { YouTubePlayer } from "../../../components/YouTubePlayer";
import { api, errorMessage } from "../../../lib/api";
import { DAY_NAMES, formatDateTime, formatDistance, formatSeconds, prescription } from "../../../lib/format";
import type { ExerciseLog, PlanExercise } from "../../../lib/types";
import { useFetch } from "../../../lib/useFetch";

type Detail = PlanExercise & { logs: ExerciseLog[]; plan: { id: string; title: string } };

/** "25:30" or "25" → seconds. */
function parseDuration(v: string): number | undefined {
  const parts = v.trim().split(":").map(Number);
  if (!v.trim() || parts.some(Number.isNaN)) return undefined;
  return parts.length === 2 ? parts[0]! * 60 + parts[1]! : parts[0]! * 60;
}

function num(v: string) {
  if (v.trim() === "") return undefined;
  const x = Number(v.replace(",", "."));
  return Number.isNaN(x) ? undefined : x;
}

function describeLog(l: ExerciseLog) {
  return (
    [
      l.setsCompleted && l.repsCompleted ? `${l.setsCompleted} × ${l.repsCompleted}` : l.setsCompleted ? `${l.setsCompleted} sets` : null,
      l.weightKg ? `${l.weightKg} kg` : null,
      l.distanceMeters ? formatDistance(l.distanceMeters) : null,
      l.durationSeconds ? formatSeconds(l.durationSeconds) : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Completed"
  );
}

export default function PlanExerciseScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refresh } = useFetch<{ exercise: Detail }>(`/coaching/my-plan/exercises/${id}`);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Not found"} onRetry={refresh} />;
  const e = data.exercise;
  const isDistance = !!e.distanceMeters;
  const done = e.logs.length > 0;

  async function save() {
    setSaving(true);
    try {
      await api.post(`/coaching/my-plan/exercises/${e.id}/log`, {
        setsCompleted: num(sets) ?? (isDistance ? undefined : (e.sets ?? undefined)),
        repsCompleted: num(reps) ?? (isDistance ? undefined : (e.reps ?? undefined)),
        weightKg: num(weight),
        distanceMeters: num(distanceKm) !== undefined ? Math.round(num(distanceKm)! * 1000) : isDistance ? e.distanceMeters! * (e.sets ?? 1) : undefined,
        durationSeconds: parseDuration(duration),
        notes: notes.trim() || undefined,
      });
      setSets("");
      setReps("");
      setWeight("");
      setDistanceKm("");
      setDuration("");
      setNotes("");
      setMessage("Logged! Your coach can see it now 💪");
      await refresh();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Screen>
        {e.youtubeVideoId && <YouTubePlayer videoId={e.youtubeVideoId} />}

        <View style={{ gap: 6 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            WEEK {e.weekNumber} · {DAY_NAMES[e.dayOfWeek - 1]?.toUpperCase()}
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
            {e.name}
          </Text>
          <View style={styles.metaRow}>
            <Meta icon="target" label={prescription(e)} color={theme.colors.onSurface} />
            {done && <Meta icon="check-circle" label={`Done ${e.logs.length}×`} color={theme.colors.tertiary} />}
          </View>
        </View>

        {e.notes && (
          <Panel style={[styles.note, { backgroundColor: theme.colors.secondaryContainer }]}>
            <IconBubble icon="message-text-outline" size={36} color={theme.colors.secondary} tint={theme.colors.surface} />
            <View style={{ flex: 1 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSecondaryContainer }}>
                COACH&apos;S NOTE
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSecondaryContainer }}>
                {e.notes}
              </Text>
            </View>
          </Panel>
        )}

        {(e.primaryMuscles.length > 0 || e.secondaryMuscles.length > 0) && (
          <Section title="Muscles this trains">
            <Panel>
              <BodyMap primary={e.primaryMuscles} secondary={e.secondaryMuscles} height={200} />
            </Panel>
          </Section>
        )}

        {(e.alternatives.length > 0 || e.equipment.length > 0) && (
          <Section title="No equipment? Try this">
            <Panel>
              <Alternatives items={e.alternatives} equipment={e.equipment} />
            </Panel>
          </Section>
        )}

        <Section title={done ? "Log another session" : "Log it"}>
          <Panel>
            {isDistance ? (
              <View style={styles.row}>
                <TextInput
                  style={styles.flex}
                  mode="outlined"
                  label="Distance (km)"
                  keyboardType="decimal-pad"
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                  placeholder={formatDistance(e.distanceMeters! * (e.sets ?? 1)).replace(" km", "")}
                />
                <TextInput style={styles.flex} mode="outlined" label="Time (mm:ss)" value={duration} onChangeText={setDuration} placeholder="32:00" />
              </View>
            ) : (
              <View style={styles.row}>
                <TextInput style={styles.flex} mode="outlined" label="Sets" keyboardType="number-pad" value={sets} onChangeText={setSets} placeholder={e.sets ? String(e.sets) : undefined} />
                <TextInput style={styles.flex} mode="outlined" label="Reps" keyboardType="number-pad" value={reps} onChangeText={setReps} placeholder={e.reps ? String(e.reps) : undefined} />
                <TextInput style={styles.flex} mode="outlined" label="kg" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
              </View>
            )}
            <TextInput mode="outlined" label="How did it feel? (your coach sees this)" multiline value={notes} onChangeText={setNotes} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Leave the numbers empty to log it exactly as prescribed.
            </Text>
            <Button mode="contained" icon="check" contentStyle={{ height: 48 }} onPress={save} loading={saving} disabled={saving}>
              {done ? "Log again" : "Mark as done"}
            </Button>
          </Panel>
        </Section>

        {done && (
          <Section title="History">
            <Panel style={{ gap: 4 }}>
              {e.logs.map((l) => (
                <View key={l.id} style={styles.log}>
                  <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.tertiary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall">{describeLog(l)}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatDateTime(l.completedAt)}
                      {l.notes ? ` · “${l.notes}”` : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </Panel>
          </Section>
        )}
      </Screen>
      <Snackbar visible={!!message} onDismiss={() => setMessage(null)} duration={3000}>
        {message}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  note: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  log: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 6 },
});
