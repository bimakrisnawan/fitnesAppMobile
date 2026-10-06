import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text, useTheme } from "react-native-paper";
import { BodyMap } from "../../../components/BodyMap";
import { MUSCLE_LABEL, type MuscleId } from "../../../components/body-map-data";
import { ProgressRing, Skeleton } from "../../../components/motion";
import { Screen } from "../../../components/Screen";
import { NextSessionCard } from "../../../components/SessionCard";
import { StatTile } from "../../../components/StatTile";
import { IconBubble, PageHeader, Panel, Pill, Section } from "../../../components/ui";
import { WorkoutCard } from "../../../components/WorkoutCard";
import { formatDate, useEntitlements } from "../../../lib/billing";
import { DAY_SHORT, prescription, todayDayOfWeek } from "../../../lib/format";
import { haptic } from "../../../lib/haptics";
import { useTween } from "../../../lib/motion";
import type { MyPlanResponse, Paginated, Session, Stats, WorkoutSummary } from "../../../lib/types";
import { useFetch } from "../../../lib/useFetch";
import { useAuth } from "../../../stores/auth";
import { useSettings } from "../../../stores/settings";
import { HERO_GRADIENT, radius } from "../../../theme";

const BROWSE_MUSCLES: MuscleId[] = ["chest", "biceps", "abs", "glutes", "quads", "lats", "shoulders", "hamstrings"];
/** Big groups worth nudging about when they've had no work all week. */
const MAJOR_MUSCLES: MuscleId[] = ["chest", "lats", "quads", "hamstrings", "glutes", "shoulders", "abs"];
const GOAL_GRADIENT = ["#34D399", "#16A34A"] as const;

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Good morning" : h < 15 ? "Good afternoon" : h < 19 ? "Good evening" : "Good night";
}

function WeekStrip({ activity }: { activity: boolean[] }) {
  const theme = useTheme();
  const today = todayDayOfWeek();
  return (
    <View style={styles.week}>
      {DAY_SHORT.map((d, i) => {
        const done = activity[i];
        const isToday = i + 1 === today;
        return (
          <View key={d} style={styles.weekDay}>
            <Text variant="labelSmall" style={{ color: isToday ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: isToday ? "700" : "500" }}>
              {d[0]}
            </Text>
            <View
              style={[
                styles.weekDot,
                { backgroundColor: done ? theme.colors.primary : theme.colors.surfaceVariant, borderColor: isToday ? theme.colors.primary : "transparent" },
              ]}
            >
              {done && <MaterialCommunityIcons name="check" size={14} color={theme.colors.onPrimary} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Activity-ring style weekly goal: active days vs the user's target. Tap to change the target. */
function WeeklyGoal({ activeDays, activity, goal, onEdit }: { activeDays: number; activity: boolean[]; goal: number; onEdit: () => void }) {
  const theme = useTheme();
  const reached = activeDays >= goal;
  const left = Math.max(goal - activeDays, 0);
  const progress = useTween(Math.min(activeDays / goal, 1), 1200, 200);
  return (
    <Panel>
      <View style={styles.goalRow}>
        <Pressable onPress={onEdit} accessibilityLabel="Change weekly goal">
          <ProgressRing progress={progress} size={96} stroke={11} colors={reached ? GOAL_GRADIENT : HERO_GRADIENT}>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.colors.onSurface }}>
              {activeDays}
              <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant }}>/{goal}</Text>
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              days
            </Text>
          </ProgressRing>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="titleMedium" style={{ fontWeight: "700" }}>
            {reached ? "Weekly goal reached! 🎉" : "Weekly goal"}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {reached
              ? `${activeDays} active days this week. Anything more is a bonus.`
              : left === goal
                ? `Train ${goal} days this week. Today's a great day to start.`
                : `${left} more day${left === 1 ? "" : "s"} to hit your goal.`}
          </Text>
          <Text variant="labelLarge" style={{ color: theme.colors.primary, marginTop: 4 }} onPress={onEdit} suppressHighlighting>
            Change goal
          </Text>
        </View>
      </View>
      <WeekStrip activity={activity} />
    </Panel>
  );
}

/** Heat map of the last 7 days, plus a nudge towards a big muscle group that's had no work. */
function MuscleWeek({ counts }: { counts: Record<string, number> }) {
  const theme = useTheme();
  const max = Math.max(0, ...Object.values(counts));
  const heat = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, max ? v / max : 0]));
  const top = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => MUSCLE_LABEL[k as MuscleId] ?? k);
  const neglected = MAJOR_MUSCLES.find((m) => !counts[m]);

  return (
    <Section title="Your week in muscles">
      <Panel>
        <BodyMap heat={heat} height={190} />
        <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant }}>
          {top.length ? `Most worked in the last 7 days: ${top.join(", ")}` : "Your map lights up as you train. Finish a workout to see it glow."}
        </Text>
        {neglected && top.length > 0 && (
          <View style={[styles.nudge, { backgroundColor: theme.colors.secondaryContainer }]}>
            <IconBubble icon="lightbulb-on-outline" size={36} color={theme.colors.secondary} tint={theme.colors.surface} />
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSecondaryContainer }}>
              Your <Text style={{ fontWeight: "700", color: theme.colors.onSecondaryContainer }}>{MUSCLE_LABEL[neglected].toLowerCase()}</Text> haven&apos;t had any work this week.
            </Text>
            <Button compact mode="contained" onPress={() => router.navigate({ pathname: "/workouts", params: { muscle: neglected } })}>
              Find one
            </Button>
          </View>
        )}
      </Panel>
    </Section>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const user = useAuth((s) => s.user);
  const weeklyGoal = useSettings((s) => s.weeklyGoal);
  const setWeeklyGoal = useSettings((s) => s.setWeeklyGoal);
  const [goalDialog, setGoalDialog] = useState(false);
  const entitlements = useEntitlements();
  const subscribed = !!entitlements && entitlements.activeTiers.length > 0;
  const stats = useFetch<{ stats: Stats; weekActivity: boolean[]; nextSession: Session | null }>("/users/stats");
  const muscles = useFetch<{ counts: Record<string, number>; sessions: number }>("/users/muscle-activity", { days: 7 });
  const myPlan = useFetch<MyPlanResponse>(entitlements?.coaching ? "/coaching/my-plan" : null);
  // Personal picks first (their sport, then their level), topped up with the rest of the library.
  const sport = user?.preferredSpecialization && user.preferredSpecialization !== "GENERAL" ? user.preferredSpecialization : undefined;
  const forSport = useFetch<Paginated<WorkoutSummary>>(sport ? "/workouts" : null, { pageSize: 4, specialization: sport });
  const forLevel = useFetch<Paginated<WorkoutSummary>>("/workouts", { pageSize: 8, difficulty: user?.fitnessLevel ?? undefined });
  const everything = useFetch<Paginated<WorkoutSummary>>("/workouts", { pageSize: 8 });
  const workouts = [...(forSport.data?.items ?? []), ...(forLevel.data?.items ?? []), ...(everything.data?.items ?? [])]
    .filter((w, i, all) => all.findIndex((x) => x.id === w.id) === i)
    .slice(0, 6);

  // New accounts get a short personalisation flow once.
  const asked = useRef(false);
  useEffect(() => {
    if (user && !user.fitnessLevel && !user.goals && user.role === "CLIENT" && !asked.current) {
      asked.current = true;
      router.push("/onboarding");
    }
  }, [user]);

  const plan = myPlan.data?.plan;
  const todays = plan ? plan.exercises.filter((e) => e.weekNumber === plan.currentWeek && e.dayOfWeek === todayDayOfWeek()) : [];
  const todayDone = todays.length > 0 && todays.every((e) => e.completed);
  const s = stats.data?.stats;
  const refresh = () => {
    void stats.refresh();
    void muscles.refresh();
    void myPlan.refresh();
    void forLevel.refresh();
  };
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Screen edges={["left", "right"]} header={<PageHeader subtitle={dateLabel} title={`${greeting()}, ${user?.fullName.split(" ")[0] ?? ""}`} />} onRefresh={refresh} refreshing={stats.refreshing}>
      {entitlements && !subscribed && (
        <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <MaterialCommunityIcons name="lightning-bolt" size={120} color="rgba(255,255,255,0.15)" style={styles.heroIcon} />
          <Text variant="headlineSmall" style={[styles.onDark, { fontWeight: "700" }]}>
            Start training today
          </Text>
          <Text variant="bodyMedium" style={styles.onDarkMuted}>
            Follow-along workouts for home or gym, or a coach who builds a plan just for you.
          </Text>
          <Button mode="contained" buttonColor="#fff" textColor="#E8341C" style={{ alignSelf: "flex-start" }} onPress={() => router.push("/subscribe")}>
            See plans
          </Button>
        </LinearGradient>
      )}

      {stats.loading && !s ? (
        <>
          <Skeleton height={168} radius={radius.md} />
          <View style={styles.stats}>
            <Skeleton height={112} radius={radius.md} style={{ flex: 1 }} />
            <Skeleton height={112} radius={radius.md} style={{ flex: 1 }} />
            <Skeleton height={112} radius={radius.md} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        s &&
        stats.data && (
          <>
            <WeeklyGoal activeDays={s.activeDaysThisWeek} activity={stats.data.weekActivity ?? []} goal={weeklyGoal} onEdit={() => setGoalDialog(true)} />
            <View style={styles.stats}>
              <StatTile icon="fire" value={s.streakDays} label="day streak" color="#F97316" tint={theme.dark ? "#3A2312" : "#FFEDD5"} />
              <StatTile icon="check-decagram" value={s.workoutsThisWeek + s.exercisesThisWeek} label="done this week" color="#16A34A" tint={theme.dark ? "#163322" : "#DCFCE7"} delay={120} />
              <StatTile icon="trophy-outline" value={s.totalWorkouts} label="library workouts" color="#2F6FED" tint={theme.dark ? "#1B2A4A" : "#E3ECFF"} delay={240} />
            </View>
          </>
        )
      )}

      {stats.data?.nextSession && <NextSessionCard session={stats.data.nextSession} />}

      {plan && (
        <Section title="Today's training" action="Full plan" onAction={() => router.navigate("/coaching")}>
          <Panel>
            {todays.length ? (
              <>
                {todays.map((e) => (
                  <Pressable key={e.id} onPress={() => router.push({ pathname: "/plan-exercise/[id]", params: { id: e.id } })} style={styles.todayRow}>
                    <MaterialCommunityIcons name={e.completed ? "check-circle" : "circle-outline"} size={26} color={e.completed ? theme.colors.tertiary : theme.colors.outline} />
                    <View style={{ flex: 1 }}>
                      <Text variant="titleSmall" style={{ textDecorationLine: e.completed ? "line-through" : "none" }}>
                        {e.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {prescription(e)}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                  </Pressable>
                ))}
                {todayDone ? (
                  <Text variant="labelLarge" style={{ color: theme.colors.tertiary, textAlign: "center" }}>
                    ✓ All done for today. Nice work!
                  </Text>
                ) : (
                  <Button mode="contained" icon="play" contentStyle={{ height: 48 }} onPress={() => router.push({ pathname: "/player", params: { plan: "1" } })}>
                    Start today&apos;s session
                  </Button>
                )}
              </>
            ) : (
              <View style={styles.todayRow}>
                <IconBubble icon="sofa-outline" />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">Rest day</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Recovery is part of training. See you tomorrow!
                  </Text>
                </View>
              </View>
            )}
          </Panel>
        </Section>
      )}

      {muscles.data && <MuscleWeek counts={muscles.data.counts} />}

      {workouts.length > 0 ? (
        <Section title="Recommended for you" action="See all" onAction={() => router.navigate("/workouts")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} compact />
            ))}
          </ScrollView>
        </Section>
      ) : (
        forLevel.loading && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Skeleton height={190} width={230} radius={radius.md} />
            <Skeleton height={190} width={230} radius={radius.md} />
          </View>
        )
      )}

      <Section title="Train by muscle">
        <View style={styles.wrap}>
          {BROWSE_MUSCLES.map((m) => (
            <Pill key={m} label={MUSCLE_LABEL[m]} onPress={() => router.navigate({ pathname: "/workouts", params: { muscle: m } })} />
          ))}
        </View>
      </Section>

      {subscribed && entitlements?.accessUntil && (
        <Panel onPress={() => router.push("/subscription")} style={styles.membership}>
          <IconBubble icon="card-account-details-star-outline" />
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall">{entitlements.coaching ? "1-on-1 Coaching" : "Monthly Membership"}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Active until {formatDate(entitlements.accessUntil)}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
        </Panel>
      )}

      <Portal>
        <Dialog visible={goalDialog} onDismiss={() => setGoalDialog(false)}>
          <Dialog.Title>Weekly goal</Dialog.Title>
          <Dialog.Content style={{ gap: 14 }}>
            <Text variant="bodyMedium">How many days a week do you want to train? Most people do best with 3–4.</Text>
            <View style={styles.wrap}>
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <Pill
                  key={n}
                  label={`${n} days`}
                  selected={weeklyGoal === n}
                  onPress={() => {
                    haptic.tap();
                    setWeeklyGoal(n);
                  }}
                />
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setGoalDialog(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: 20, gap: 10, overflow: "hidden" },
  heroIcon: { position: "absolute", right: -10, top: -10 },
  onDark: { color: "#fff" },
  onDarkMuted: { color: "rgba(255,255,255,0.85)" },
  stats: { flexDirection: "row", gap: 10 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  week: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  weekDay: { alignItems: "center", gap: 6 },
  weekDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  todayRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  nudge: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md },
  carousel: { gap: 12, paddingRight: 8, paddingBottom: 8, paddingLeft: 2, paddingTop: 2 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  membership: { flexDirection: "row", alignItems: "center", gap: 12 },
});
