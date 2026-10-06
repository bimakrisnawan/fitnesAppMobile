// Guided workout player: get ready → work → rest → … → celebration.
// Plays a library workout (?workoutId=…) or a day of the coaching plan (?plan=1&week=&day=).
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { ActivityIndicator, Button, Dialog, Portal, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BodyMap } from "../../components/BodyMap";
import { MUSCLE_LABEL, type MuscleId } from "../../components/body-map-data";
import { Confetti, ProgressRing } from "../../components/motion";
import { YouTubePlayer } from "../../components/YouTubePlayer";
import { api, errorMessage } from "../../lib/api";
import { DAY_NAMES, formatDistance, prescription, todayDayOfWeek } from "../../lib/format";
import { haptic } from "../../lib/haptics";
import { useNow } from "../../lib/motion";
import type { Alternative, MyPlanResponse, Stats, WorkoutDetail } from "../../lib/types";
import { useFetch } from "../../lib/useFetch";
import { CATEGORY_GRADIENT } from "../../theme";

interface Step {
  key: string;
  name: string;
  sets: number;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  targetPace: string | null;
  restSeconds: number;
  notes: string | null;
  description: string | null;
  youtubeVideoId: string | null;
  alternatives: Alternative[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  planExerciseId?: string;
}

type Mode = "reps" | "timed" | "distance";
const modeOf = (s: Step): Mode => (s.distanceMeters ? "distance" : s.durationSeconds && !s.reps ? "timed" : "reps");

type Phase =
  | { kind: "ready"; endsAt: number }
  | { kind: "work"; startedAt: number; endsAt: number | null }
  | { kind: "rest"; endsAt: number; total: number; next: { index: number; set: number } }
  | { kind: "done" };

const READY_MS = 3000;
const ACCENT = ["#FF7A45", "#E8341C"] as const;
const REST = ["#4CC9F0", "#3A6EE8"] as const;
const TIPS = [
  "Breathe out on the effort, in on the way back.",
  "Sip some water. Small sips, not gulps.",
  "Shake out your arms and legs while you rest.",
  "Quality over speed: control every rep.",
  "Next set: same form, same focus.",
  "Roll your shoulders back and relax your jaw.",
];

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function useSteps() {
  const params = useLocalSearchParams<{ workoutId?: string; plan?: string; week?: string; day?: string }>();
  const workout = useFetch<{ workout: WorkoutDetail }>(params.workoutId ? `/workouts/${params.workoutId}` : null);
  const myPlan = useFetch<MyPlanResponse>(params.plan ? "/coaching/my-plan" : null);

  return useMemo(() => {
    if (params.workoutId) {
      const w = workout.data?.workout;
      if (!w) return { loading: workout.loading, error: workout.error, steps: [] as Step[] };
      const steps: Step[] = w.exercises.map((e) => ({
        key: e.id,
        name: e.exercise.name,
        sets: e.sets ?? 1,
        reps: e.reps,
        durationSeconds: e.durationSeconds,
        distanceMeters: null,
        targetPace: null,
        restSeconds: e.restSeconds ?? (e.durationSeconds && !e.reps ? 30 : 60),
        notes: e.notes,
        description: e.exercise.description,
        youtubeVideoId: e.exercise.youtubeVideoId,
        alternatives: e.exercise.alternatives,
        primaryMuscles: e.exercise.primaryMuscles,
        secondaryMuscles: e.exercise.secondaryMuscles,
      }));
      return { loading: false, error: null, steps, title: w.title, locked: w.locked, category: w.category, workoutId: w.id };
    }
    const plan = myPlan.data?.plan;
    if (!plan) return { loading: myPlan.loading, error: myPlan.error ?? (myPlan.data ? "No active plan" : null), steps: [] as Step[] };
    const week = Number(params.week) || plan.currentWeek;
    const day = Number(params.day) || todayDayOfWeek();
    const steps: Step[] = plan.exercises
      .filter((e) => e.weekNumber === week && e.dayOfWeek === day)
      .map((e) => ({
        key: e.id,
        name: e.name,
        sets: e.sets ?? 1,
        reps: e.reps,
        durationSeconds: e.durationSeconds,
        distanceMeters: e.distanceMeters,
        targetPace: e.targetPace,
        // Plans don't store rest; use sensible defaults (none between single runs/swims).
        restSeconds: e.distanceMeters ? ((e.sets ?? 1) > 1 ? 90 : 0) : 60,
        notes: e.notes,
        description: null,
        youtubeVideoId: e.youtubeVideoId,
        alternatives: e.alternatives,
        primaryMuscles: e.primaryMuscles,
        secondaryMuscles: e.secondaryMuscles,
        planExerciseId: e.id,
      }));
    return { loading: false, error: null, steps, title: `${plan.title} · ${DAY_NAMES[day - 1]}`, locked: false, category: "STRENGTH" as const };
  }, [params.workoutId, params.week, params.day, workout.data, workout.loading, workout.error, myPlan.data, myPlan.loading, myPlan.error]);
}

function RoundButton({ icon, label, onPress, big, colors }: { icon: string; label?: string; onPress: () => void; big?: boolean; colors?: readonly [string, string] }) {
  const size = big ? 84 : 56;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ alignItems: "center", gap: 6, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      <LinearGradient colors={colors ?? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.08)"]} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name={icon as never} size={big ? 40 : 26} color="#fff" />
      </LinearGradient>
      {label && <Text style={styles.btnLabel}>{label}</Text>}
    </Pressable>
  );
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const data = useSteps();
  const steps = data.steps;
  const isPlan = !("workoutId" in data && data.workoutId);

  const [index, setIndex] = useState(0);
  const [set, setSet] = useState(1);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [paused, setPaused] = useState<{ at: number } | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [doneSets, setDoneSets] = useState<number[]>([]);
  const [measured, setMeasured] = useState<number[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [sheet, setSheet] = useState<"alternatives" | "quit" | null>(null);
  const warned = useRef<number | null>(null);
  const now = useNow(phase?.kind === "done" ? 60_000 : 200);

  // Keep the screen on while training.
  useEffect(() => {
    void activateKeepAwakeAsync("player").catch(() => {});
    return () => {
      void deactivateKeepAwake("player").catch(() => {});
    };
  }, []);

  // Start once the steps are loaded.
  useEffect(() => {
    if (steps.length && !phase && !data.locked) {
      setDoneSets(steps.map(() => 0));
      setMeasured(steps.map(() => 0));
      setSessionStart(Date.now());
      setPhase({ kind: "ready", endsAt: Date.now() + READY_MS });
    }
  }, [steps, phase, data.locked]);

  const step = steps[index];
  const mode = step ? modeOf(step) : "reps";

  const startWork = useCallback(
    (i: number, s: number) => {
      const target = steps[i]!;
      setIndex(i);
      setSet(s);
      setShowVideo(false);
      const t = Date.now();
      setPhase({ kind: "work", startedAt: t, endsAt: modeOf(target) === "timed" ? t + target.durationSeconds! * 1000 : null });
      haptic.bump();
    },
    [steps],
  );

  const finish = useCallback(() => {
    setFinishedAt(Date.now());
    setPhase({ kind: "done" });
    haptic.success();
  }, []);

  /** Moves on after a set: rest, then the next set or exercise, or the celebration. */
  const advance = useCallback(
    (i: number, s: number) => {
      const current = steps[i]!;
      const next = s < current.sets ? { index: i, set: s + 1 } : i < steps.length - 1 ? { index: i + 1, set: 1 } : null;
      if (!next) return finish();
      const rest = current.restSeconds * 1000;
      if (rest > 0) {
        setPhase({ kind: "rest", endsAt: Date.now() + rest, total: rest, next });
        warned.current = null;
      } else startWork(next.index, next.set);
    },
    [steps, finish, startWork],
  );

  const completeSet = useCallback(
    (seconds: number) => {
      setDoneSets((d) => d.map((v, i) => (i === index ? v + 1 : v)));
      setMeasured((m) => m.map((v, i) => (i === index ? v + seconds : v)));
      haptic.tap();
      advance(index, set);
    },
    [index, set, advance],
  );

  // Timer transitions and countdown haptics (paused timers don't move).
  useEffect(() => {
    if (!phase || paused) return;
    const left = phase.kind === "ready" || phase.kind === "rest" ? phase.endsAt - now : phase.kind === "work" && phase.endsAt ? phase.endsAt - now : null;
    if (left !== null && left <= 3000 && left > 0) {
      const sec = Math.ceil(left / 1000);
      if (warned.current !== sec) {
        warned.current = sec;
        haptic.warn();
      }
    }
    if (phase.kind === "ready" && now >= phase.endsAt) startWork(0, 1);
    else if (phase.kind === "rest" && now >= phase.endsAt) startWork(phase.next.index, phase.next.set);
    else if (phase.kind === "work" && phase.endsAt && now >= phase.endsAt) completeSet(step?.durationSeconds ?? 0);
  }, [now, phase, paused, startWork, completeSet, step]);

  function togglePause() {
    const t = Date.now();
    if (!paused) {
      setPaused({ at: t });
      return;
    }
    const gap = t - paused.at;
    setPausedTotal((p) => p + gap);
    // Shift every running timer by the pause, so nothing advanced while paused.
    setPhase((ph) =>
      !ph
        ? ph
        : ph.kind === "ready" || ph.kind === "rest"
          ? { ...ph, endsAt: ph.endsAt + gap }
          : ph.kind === "work"
            ? { ...ph, startedAt: ph.startedAt + gap, endsAt: ph.endsAt ? ph.endsAt + gap : null }
            : ph,
    );
    setPaused(null);
  }

  function skipExercise() {
    if (!phase || phase.kind === "done") return;
    if (index < steps.length - 1) startWork(index + 1, 1);
    else finish();
  }

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const frozenNow = paused ? paused.at : now;
  const elapsed = sessionStart ? (finishedAt ?? frozenNow) - sessionStart - pausedTotal : 0;

  // ── Loading / guard states ──
  if (data.loading || (!phase && !data.error && !data.locked && steps.length > 0)) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  if (data.error || data.locked || !steps.length) {
    return (
      <LinearGradient colors={["#1A1D24", "#0B0C10"]} style={[styles.screen, styles.center, { padding: 24, gap: 14 }]}>
        <MaterialCommunityIcons name={data.locked ? "lock" : "sofa-outline"} size={56} color="#fff" />
        <Text variant="titleLarge" style={styles.white}>
          {data.locked ? "Members-only workout" : data.error ? "Couldn't load the workout" : "Nothing planned for this day"}
        </Text>
        <Text style={[styles.dim, { textAlign: "center" }]}>
          {data.locked ? "Subscribe to follow along with the guided player." : (data.error ?? "Enjoy the rest day: recovery is training too.")}
        </Text>
        {data.locked && (
          <Button mode="contained" buttonColor="#fff" textColor="#E8341C" onPress={() => router.replace("/subscribe")}>
            See plans
          </Button>
        )}
        <Button textColor="#fff" onPress={close}>
          Go back
        </Button>
      </LinearGradient>
    );
  }

  const gradient = CATEGORY_GRADIENT[(data.category ?? "STRENGTH") as keyof typeof CATEGORY_GRADIENT] ?? ACCENT;
  const ring = Math.min(width * 0.68, height * 0.34, 300);

  // ── Celebration ──
  if (phase?.kind === "done") {
    return (
      <Celebration
        steps={steps}
        doneSets={doneSets}
        measured={measured}
        elapsedMs={elapsed}
        title={data.title ?? "Workout"}
        isPlan={isPlan}
        workoutId={"workoutId" in data ? data.workoutId : undefined}
        onClose={close}
      />
    );
  }

  const nextInfo =
    phase?.kind === "rest"
      ? phase.next
      : set < (step?.sets ?? 1)
        ? { index, set: set + 1 }
        : index < steps.length - 1
          ? { index: index + 1, set: 1 }
          : null;
  const nextStep = nextInfo ? steps[nextInfo.index] : null;

  return (
    <LinearGradient colors={["#191B22", "#0B0C10"]} style={styles.screen}>
      <LinearGradient colors={[`${gradient[0]}55`, "transparent"]} style={styles.glow} />
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => setSheet("quit")} hitSlop={12} accessibilityLabel="End workout">
          <MaterialCommunityIcons name="close" size={26} color="#fff" />
        </Pressable>
        <View style={styles.segments}>
          {steps.map((s, i) => (
            <View key={s.key} style={[styles.segment, { backgroundColor: i < index ? "#fff" : "rgba(255,255,255,0.22)" }]}>
              {i === index && <View style={{ height: "100%", width: `${((set - 1) / s.sets) * 100}%`, backgroundColor: "#fff", borderRadius: 3 }} />}
            </View>
          ))}
        </View>
        <Text style={styles.elapsed}>{clock(elapsed)}</Text>
        <Pressable onPress={togglePause} hitSlop={12} accessibilityLabel={paused ? "Resume" : "Pause"}>
          <MaterialCommunityIcons name={paused ? "play" : "pause"} size={26} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {phase?.kind === "ready" && step && (
          <View style={[styles.center, { gap: 14, marginTop: 40 }]}>
            <Text style={styles.kicker}>GET READY</Text>
            <ProgressRing progress={(phase.endsAt - frozenNow) / READY_MS} size={ring} stroke={14} colors={gradient} track="rgba(255,255,255,0.12)">
              <Text style={[styles.huge, { fontSize: ring * 0.42 }]}>{Math.max(1, Math.ceil((phase.endsAt - frozenNow) / 1000))}</Text>
            </ProgressRing>
            <Text style={styles.dim}>First up</Text>
            <Text variant="headlineSmall" style={[styles.white, { textAlign: "center" }]}>
              {step.name}
            </Text>
            <Text style={styles.dim}>{prescription(step)}</Text>
          </View>
        )}

        {phase?.kind === "work" && step && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={styles.kicker}>
                EXERCISE {index + 1} OF {steps.length}
                {step.sets > 1 ? ` · SET ${set} OF ${step.sets}` : ""}
              </Text>
              <Text variant="headlineMedium" style={[styles.white, { fontWeight: "700" }]}>
                {step.name}
              </Text>
              {step.primaryMuscles.length > 0 && (
                <Text style={[styles.dim, { color: "#FFB59F" }]}>{step.primaryMuscles.map((m) => MUSCLE_LABEL[m as MuscleId] ?? m).join(" · ")}</Text>
              )}
            </View>

            {showVideo && step.youtubeVideoId ? (
              <YouTubePlayer videoId={step.youtubeVideoId} />
            ) : (
              <View style={styles.center}>
                {mode === "timed" && phase.endsAt ? (
                  <ProgressRing progress={(phase.endsAt - frozenNow) / (step.durationSeconds! * 1000)} size={ring} stroke={16} colors={gradient} track="rgba(255,255,255,0.12)">
                    <Text style={[styles.huge, { fontSize: ring * 0.26 }]}>{clock(phase.endsAt - frozenNow)}</Text>
                    <Text style={styles.dim}>hold it!</Text>
                  </ProgressRing>
                ) : mode === "distance" ? (
                  <ProgressRing progress={1} size={ring} stroke={16} colors={gradient} track="rgba(255,255,255,0.12)">
                    <Text style={[styles.huge, { fontSize: ring * 0.24 }]}>{clock(frozenNow - phase.startedAt)}</Text>
                    <Text style={styles.dim}>
                      {formatDistance(step.distanceMeters!)}
                      {step.targetPace ? ` @ ${step.targetPace}` : ""}
                    </Text>
                  </ProgressRing>
                ) : (
                  <ProgressRing progress={(set - 1) / step.sets} size={ring} stroke={16} colors={gradient} track="rgba(255,255,255,0.12)">
                    <Text style={[styles.huge, { fontSize: ring * 0.36 }]}>{step.reps ?? "–"}</Text>
                    <Text style={styles.dim}>reps</Text>
                  </ProgressRing>
                )}
              </View>
            )}

            {(step.notes || step.description) && (
              <View style={styles.noteBox}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#FFD27A" />
                <Text style={[styles.white, { flex: 1, opacity: 0.9 }]} numberOfLines={4}>
                  {step.notes ?? step.description}
                </Text>
              </View>
            )}

            <View style={styles.controls}>
              <RoundButton icon="skip-next" label="Skip" onPress={skipExercise} />
              {mode === "timed" ? (
                <RoundButton big icon="check-bold" label="Done early" colors={gradient} onPress={() => completeSet(Math.round((frozenNow - phase.startedAt) / 1000))} />
              ) : (
                <RoundButton big icon="check-bold" label={mode === "distance" ? "Finished" : "Set done"} colors={gradient} onPress={() => completeSet(Math.round((frozenNow - phase.startedAt) / 1000))} />
              )}
              {step.youtubeVideoId ? (
                <RoundButton icon={showVideo ? "close" : "play-circle-outline"} label={showVideo ? "Hide demo" : "Demo"} onPress={() => setShowVideo(!showVideo)} />
              ) : step.alternatives.length ? (
                <RoundButton icon="swap-horizontal" label="Swap" onPress={() => setSheet("alternatives")} />
              ) : (
                <View style={{ width: 56 }} />
              )}
            </View>
            {step.youtubeVideoId && step.alternatives.length > 0 && (
              <Button textColor="#fff" icon="swap-horizontal" onPress={() => setSheet("alternatives")}>
                No equipment? See alternatives
              </Button>
            )}
          </View>
        )}

        {phase?.kind === "rest" && (
          <View style={[styles.center, { gap: 16 }]}>
            <Text style={styles.kicker}>REST</Text>
            <ProgressRing progress={(phase.endsAt - frozenNow) / phase.total} size={ring} stroke={16} colors={REST} track="rgba(255,255,255,0.12)">
              <Text style={[styles.huge, { fontSize: ring * 0.26 }]}>{clock(phase.endsAt - frozenNow)}</Text>
              <Text style={styles.dim}>breathe</Text>
            </ProgressRing>
            <View style={[styles.controls, { alignSelf: "stretch" }]}>
              <RoundButton icon="minus" label="−15 s" onPress={() => setPhase({ ...phase, endsAt: Math.max(Date.now() + 1000, phase.endsAt - 15_000) })} />
              <RoundButton big icon="fast-forward" label="Skip rest" colors={REST} onPress={() => startWork(phase.next.index, phase.next.set)} />
              <RoundButton icon="plus" label="+15 s" onPress={() => setPhase({ ...phase, endsAt: phase.endsAt + 15_000, total: phase.total + 15_000 })} />
            </View>
            <Text style={[styles.dim, { textAlign: "center", fontStyle: "italic" }]}>{TIPS[(index + set) % TIPS.length]}</Text>
          </View>
        )}

        {nextStep && phase?.kind !== "ready" && (
          <View style={styles.upNext}>
            <Text style={styles.kicker}>UP NEXT</Text>
            <Text variant="titleMedium" style={[styles.white, { fontWeight: "700" }]}>
              {nextStep.name}
              {nextInfo && nextStep.sets > 1 ? ` · set ${nextInfo.set} of ${nextStep.sets}` : ""}
            </Text>
            <Text style={styles.dim}>{prescription(nextStep)}</Text>
          </View>
        )}
      </ScrollView>

      {paused && (
        <Pressable style={[StyleSheet.absoluteFill, styles.pauseOverlay]} onPress={togglePause}>
          <MaterialCommunityIcons name="pause-circle" size={72} color="#fff" />
          <Text variant="headlineSmall" style={styles.white}>
            Paused
          </Text>
          <Text style={styles.dim}>Tap anywhere to continue</Text>
        </Pressable>
      )}

      <Portal>
        <Dialog visible={sheet === "alternatives"} onDismiss={() => setSheet(null)}>
          <Dialog.Title>No equipment? Try this</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            {step?.alternatives.map((a, i) => (
              <Text key={i} variant="bodyLarge">
                • <Text style={{ fontWeight: "700" }}>{a.with}</Text> instead of {a.replace}
                {a.note ? ` (${a.note})` : ""}
              </Text>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSheet(null)}>Got it</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={sheet === "quit"} onDismiss={() => setSheet(null)}>
          <Dialog.Title>End this workout?</Dialog.Title>
          <Dialog.Content>
            <Text>{doneSets.some((d) => d > 0) ? "You can save what you've done so far, or discard it." : "Nothing has been logged yet."}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSheet(null)}>Keep going</Button>
            {doneSets.some((d) => d > 0) && (
              <Button
                onPress={() => {
                  setSheet(null);
                  finish();
                }}
              >
                Finish & save
              </Button>
            )}
            <Button
              textColor="#DC2626"
              onPress={() => {
                setSheet(null);
                close();
              }}
            >
              Discard
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </LinearGradient>
  );
}

const FEELINGS = [
  { value: "Tough", emoji: "🥵" },
  { value: "Just right", emoji: "💪" },
  { value: "Easy", emoji: "😎" },
] as const;
const MILESTONES = [1, 5, 10, 25, 50, 100];

function Celebration({
  steps,
  doneSets,
  measured,
  elapsedMs,
  title,
  isPlan,
  workoutId,
  onClose,
}: {
  steps: Step[];
  doneSets: number[];
  measured: number[];
  elapsedMs: number;
  title: string;
  isPlan: boolean;
  workoutId?: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [feeling, setFeeling] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Stats | null>(null);

  const done = steps.map((s, i) => ({ s, sets: doneSets[i] ?? 0, secs: measured[i] ?? 0 })).filter((x) => x.sets > 0);
  const totalSets = done.reduce((n, x) => n + x.sets, 0);
  const totalReps = done.reduce((n, x) => n + (modeOf(x.s) === "reps" ? (x.s.reps ?? 0) * x.sets : 0), 0);
  const totalDistance = done.reduce((n, x) => n + (x.s.distanceMeters ? x.s.distanceMeters * x.sets : 0), 0);
  const primary = [...new Set(done.flatMap((x) => x.s.primaryMuscles))];
  const secondary = [...new Set(done.flatMap((x) => x.s.secondaryMuscles))].filter((m) => !primary.includes(m));
  const minutes = Math.max(1, Math.round(elapsedMs / 60_000));

  async function save() {
    setSaving(true);
    setError(null);
    const summary = [feeling, `${minutes} min with the guided player`, note.trim() || null].filter(Boolean).join(" · ");
    try {
      if (isPlan) {
        for (const [i, x] of done.entries()) {
          const mode = modeOf(x.s);
          await api.post(`/coaching/my-plan/exercises/${x.s.planExerciseId}/log`, {
            setsCompleted: x.sets,
            repsCompleted: mode === "reps" ? (x.s.reps ?? undefined) : undefined,
            durationSeconds: mode !== "reps" && x.secs > 0 ? x.secs : undefined,
            distanceMeters: x.s.distanceMeters ? x.s.distanceMeters * x.sets : undefined,
            notes: i === done.length - 1 ? summary : undefined,
          });
        }
      } else if (workoutId) {
        await api.post(`/workouts/${workoutId}/complete`, { notes: summary });
      }
      const { data } = await api.get<{ stats: Stats }>("/users/stats");
      setResult(data.stats);
      haptic.success();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const milestone = result && !isPlan && MILESTONES.includes(result.totalWorkouts) ? result.totalWorkouts : null;

  return (
    <LinearGradient colors={["#2A1610", "#0B0C10"]} style={styles.screen}>
      <Confetti width={width} height={height} count={result ? 90 : 70} key={result ? "saved" : "done"} />
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32, gap: 18 }]}>
        <View style={[styles.center, { gap: 6 }]}>
          <Text style={{ fontSize: 64 }}>{result ? "🔥" : "🏆"}</Text>
          <Text variant="headlineMedium" style={[styles.white, { fontWeight: "700", textAlign: "center" }]}>
            {result ? (result.streakDays > 1 ? `${result.streakDays}-day streak!` : "Saved. Great start!") : isPlan ? "Session complete!" : "Workout complete!"}
          </Text>
          <Text style={[styles.dim, { textAlign: "center" }]}>
            {result ? (isPlan ? "Your coach can see this session now." : `That's workout #${result.totalWorkouts} in your history.`) : title}
          </Text>
          {milestone && (
            <View style={styles.badge}>
              <Text style={{ color: "#1B0D07", fontWeight: "700" }}>🏅 Milestone: {milestone} workout{milestone === 1 ? "" : "s"}!</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          {[
            ["timer-outline", `${minutes}`, minutes === 1 ? "minute" : "minutes"],
            ["format-list-checks", `${done.length}/${steps.length}`, "exercises"],
            ["repeat", `${totalSets}`, "sets"],
            totalDistance ? ["map-marker-distance", formatDistance(totalDistance), "distance"] : ["arm-flex", `${totalReps}`, "reps"],
          ].map(([icon, value, label]) => (
            <View key={label} style={styles.stat}>
              <MaterialCommunityIcons name={icon as never} size={20} color="#FFB59F" />
              <Text style={[styles.white, { fontSize: 20, fontWeight: "700" }]}>{value}</Text>
              <Text style={styles.dimSmall}>{label}</Text>
            </View>
          ))}
        </View>

        {primary.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.kicker}>MUSCLES YOU WORKED</Text>
            <BodyMap primary={primary} secondary={secondary} height={170} showNames={false} tone="dark" />
          </View>
        )}

        {!result ? (
          <View style={[styles.card, { gap: 12 }]}>
            <Text style={styles.kicker}>HOW DID IT FEEL?</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {FEELINGS.map((f) => (
                <Pressable
                  key={f.value}
                  onPress={() => {
                    haptic.tap();
                    setFeeling(f.value);
                  }}
                  style={[styles.feeling, feeling === f.value && styles.feelingOn]}
                >
                  <Text style={{ fontSize: 26 }}>{f.emoji}</Text>
                  <Text style={[styles.white, { fontWeight: "600" }]}>{f.value}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder={isPlan ? "Note for your coach (optional)" : "Add a note (optional)"}
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={note}
              onChangeText={setNote}
              style={styles.input}
              multiline
            />
            {error && <Text style={{ color: "#FCA5A5" }}>{error}</Text>}
            <Button mode="contained" buttonColor="#FF5A36" contentStyle={{ height: 52 }} loading={saving} disabled={saving} onPress={save} icon="content-save-check">
              {isPlan ? "Save & send to my coach" : "Save workout"}
            </Button>
            <Button textColor="rgba(255,255,255,0.7)" onPress={onClose}>
              Don&apos;t save
            </Button>
          </View>
        ) : (
          <Button mode="contained" buttonColor="#FF5A36" contentStyle={{ height: 52 }} onPress={() => router.replace("/")} icon="home">
            Back to home
          </Button>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B0C10" },
  center: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", left: 0, right: 0, top: 0, height: 320 },
  top: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 6 },
  segments: { flex: 1, flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  elapsed: { color: "#fff", fontVariant: ["tabular-nums"], fontWeight: "700" },
  body: { padding: 20, gap: 20, width: "100%", maxWidth: 560, alignSelf: "center" },
  kicker: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
  huge: { color: "#fff", fontWeight: "700", fontVariant: ["tabular-nums"] },
  white: { color: "#fff" },
  dim: { color: "rgba(255,255,255,0.7)" },
  dimSmall: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  btnLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  controls: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start" },
  noteBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)" },
  upNext: { padding: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", gap: 2 },
  pauseOverlay: { backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", gap: 8 },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)" },
  card: { padding: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", gap: 10 },
  feeling: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 2, borderColor: "transparent" },
  feelingOn: { borderColor: "#FF5A36", backgroundColor: "rgba(255,90,54,0.15)" },
  input: { color: "#fff", borderRadius: 12, padding: 12, minHeight: 56, backgroundColor: "rgba(255,255,255,0.07)" },
  badge: { marginTop: 6, backgroundColor: "#FFD27A", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
});
