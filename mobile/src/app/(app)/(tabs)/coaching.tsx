import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { MUSCLE_LABEL, type MuscleId } from "../../../components/body-map-data";
import { Screen } from "../../../components/Screen";
import { NextSessionCard } from "../../../components/SessionCard";
import { ErrorState, Loading } from "../../../components/States";
import { IconBubble, type IconName, PageHeader, Panel, Pill, ProgressLine, Section } from "../../../components/ui";
import { formatIdr, useEntitlements } from "../../../lib/billing";
import { DAY_NAMES, DAY_SHORT, initials, prescription, SPECIALIZATION_LABEL, todayDayOfWeek } from "../../../lib/format";
import type { Coach, MyPlanResponse, Plan, Session } from "../../../lib/types";
import { useFetch } from "../../../lib/useFetch";
import { COACH_GRADIENT, radius } from "../../../theme";

function CoachCard({ coach }: { coach: Coach }) {
  const theme = useTheme();
  return (
    <Panel style={styles.coach}>
      <LinearGradient colors={COACH_GRADIENT} style={styles.coachAvatar}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>{initials(coach.fullName)}</Text>
      </LinearGradient>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          YOUR COACH
        </Text>
        <Text variant="titleMedium" style={{ fontWeight: "700" }}>
          {coach.fullName}
        </Text>
        {coach.specialization && (
          <Text variant="labelLarge" style={{ color: theme.colors.secondary }}>
            {SPECIALIZATION_LABEL[coach.specialization]} specialist
          </Text>
        )}
        {coach.bio && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {coach.bio}
          </Text>
        )}
      </View>
    </Panel>
  );
}

/** Explains what 1-on-1 adds on top of the Monthly library. */
function Upsell() {
  const theme = useTheme();
  const plans = useFetch<{ plans: { tier: string; priceIdr: number }[] }>("/subscriptions/plans");
  const price = plans.data?.plans.find((p) => p.tier === "COACHING")?.priceIdr;
  const rows: [IconName, string, string][] = [
    ["clipboard-account-outline", "A plan made only for you", "Your coach builds every week around your goal, level and schedule."],
    ["run-fast", "Running, swimming or general fitness", "Specialist coaches for each track."],
    ["video-outline", "Weekly 45-minute video call", "Check-ins on Google Meet, plus in-person sessions when your coach offers them."],
    ["home-outline", "Works without a gym", "Every exercise comes with home and outdoor alternatives."],
    ["dumbbell", "Everything in Monthly", "The full workout library is included."],
  ];
  return (
    <>
      <LinearGradient colors={COACH_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upsellHero}>
        <MaterialCommunityIcons name="account-tie" size={120} color="rgba(255,255,255,0.14)" style={{ position: "absolute", right: -8, top: -8 }} />
        <Text variant="labelLarge" style={{ color: "rgba(255,255,255,0.85)" }}>
          1-ON-1 COACHING
        </Text>
        <Text variant="headlineSmall" style={{ color: "#fff", fontWeight: "700" }}>
          Your own coach, your own plan
        </Text>
        <Text variant="bodyMedium" style={{ color: "rgba(255,255,255,0.9)" }}>
          Monthly gives you ready-made workouts. With 1-on-1, a coach designs your training personally and adjusts it every week.
        </Text>
        {price && (
          <Text variant="titleMedium" style={{ color: "#fff", fontWeight: "700" }}>
            {formatIdr(price)} / month
          </Text>
        )}
      </LinearGradient>
      <Panel>
        {rows.map(([icon, title, body]) => (
          <View key={title} style={styles.featureRow}>
            <IconBubble icon={icon} size={38} color={theme.colors.secondary} tint={theme.colors.secondaryContainer} />
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ fontWeight: "700" }}>
                {title}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {body}
              </Text>
            </View>
          </View>
        ))}
      </Panel>
      <Button mode="contained" contentStyle={{ height: 50 }} onPress={() => router.push({ pathname: "/subscribe", params: { tier: "COACHING" } })}>
        Get my coach
      </Button>
    </>
  );
}

function WaitingCard({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const theme = useTheme();
  return (
    <Panel style={{ alignItems: "center", paddingVertical: 28 }}>
      <IconBubble icon={icon} size={64} />
      <Text variant="titleMedium" style={{ fontWeight: "700", textAlign: "center" }}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
        {body}
      </Text>
      <Button mode="contained-tonal" icon="dumbbell" onPress={() => router.navigate("/workouts")}>
        Train with the library meanwhile
      </Button>
    </Panel>
  );
}

function PlanView({ plan }: { plan: Plan }) {
  const theme = useTheme();
  const today = todayDayOfWeek();
  const [week, setWeek] = useState(plan.currentWeek);
  const [day, setDay] = useState(today);
  useEffect(() => setWeek(plan.currentWeek), [plan.currentWeek]);

  const weekItems = plan.exercises.filter((e) => e.weekNumber === week);
  const dayItems = weekItems.filter((e) => e.dayOfWeek === day);
  const weekDone = weekItems.filter((e) => e.completed).length;

  return (
    <>
      <Panel>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {SPECIALIZATION_LABEL[plan.specialization].toUpperCase()} PLAN
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: "700" }}>
              {plan.title}
            </Text>
          </View>
          <View style={[styles.weekBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
              Week {plan.currentWeek}/{plan.totalWeeks}
            </Text>
          </View>
        </View>
        {plan.description && (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {plan.description}
          </Text>
        )}
        <ProgressLine value={plan.progress.total ? plan.progress.completed / plan.progress.total : 0} />
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {plan.progress.completed} of {plan.progress.total} sessions completed
        </Text>
      </Panel>

      <Section title="Schedule">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {Array.from({ length: plan.totalWeeks }, (_, i) => i + 1).map((n) => (
            <Pill key={n} label={n === plan.currentWeek ? `Week ${n} · now` : `Week ${n}`} selected={n === week} onPress={() => setWeek(n)} />
          ))}
        </ScrollView>

        <View style={styles.days}>
          {DAY_SHORT.map((label, i) => {
            const d = i + 1;
            const items = weekItems.filter((e) => e.dayOfWeek === d);
            const allDone = items.length > 0 && items.every((e) => e.completed);
            const selected = d === day;
            const isToday = week === plan.currentWeek && d === today;
            return (
              <Pressable
                key={label}
                onPress={() => setDay(d)}
                style={[
                  styles.day,
                  { backgroundColor: selected ? theme.colors.primary : theme.colors.surface, borderColor: isToday && !selected ? theme.colors.primary : "transparent" },
                ]}
              >
                <Text variant="labelMedium" style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontWeight: "700" }}>
                  {label}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: !items.length
                        ? "transparent"
                        : allDone
                          ? selected
                            ? theme.colors.onPrimary
                            : theme.colors.tertiary
                          : selected
                            ? "rgba(255,255,255,0.6)"
                            : theme.colors.outline,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {DAY_NAMES[day - 1]}
          {week === plan.currentWeek && day === today ? " · Today" : ""} · {weekDone}/{weekItems.length} done this week
        </Text>

        {dayItems.length > 0 && (
          <Button
            mode={dayItems.every((e) => e.completed) ? "outlined" : "contained"}
            icon="play"
            contentStyle={{ height: 48 }}
            onPress={() => router.push({ pathname: "/player", params: { plan: "1", week: String(week), day: String(day) } })}
          >
            {dayItems.every((e) => e.completed) ? "Do it again" : `Start ${week === plan.currentWeek && day === today ? "today's" : DAY_NAMES[day - 1] + "'s"} session`}
          </Button>
        )}
        {dayItems.length ? (
          dayItems.map((e) => (
            <Panel key={e.id} onPress={() => router.push({ pathname: "/plan-exercise/[id]", params: { id: e.id } })} style={styles.item}>
              <MaterialCommunityIcons name={e.completed ? "check-circle" : "circle-outline"} size={28} color={e.completed ? theme.colors.tertiary : theme.colors.outline} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="titleMedium" style={{ fontWeight: "700" }}>
                  {e.name}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {prescription(e)}
                </Text>
                {e.primaryMuscles.length > 0 && (
                  <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                    {e.primaryMuscles.map((m) => MUSCLE_LABEL[m as MuscleId] ?? m).join(" · ")}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Panel>
          ))
        ) : (
          <Panel style={styles.item}>
            <IconBubble icon="sofa-outline" />
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ fontWeight: "700" }}>
                Rest day
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Recovery is when you get stronger. Light walking or stretching is fine.
              </Text>
            </View>
          </Panel>
        )}
      </Section>
    </>
  );
}

export default function CoachingScreen() {
  const entitlements = useEntitlements();
  const coaching = entitlements?.coaching ?? false;
  const myPlan = useFetch<MyPlanResponse>(coaching ? "/coaching/my-plan" : null);
  const sessions = useFetch<{ sessions: Session[] }>(coaching ? "/coaching/sessions" : null, { scope: "upcoming" });
  const refresh = () => {
    void myPlan.refresh();
    void sessions.refresh();
  };
  const header = <PageHeader title="My Coach" />;

  if (!entitlements || (coaching && myPlan.loading)) {
    return (
      <Screen edges={["left", "right"]} header={header}>
        <Loading />
      </Screen>
    );
  }
  if (!coaching) {
    return (
      <Screen edges={["left", "right"]} header={header}>
        <Upsell />
      </Screen>
    );
  }
  if (myPlan.error || !myPlan.data) {
    return (
      <Screen edges={["left", "right"]} header={header}>
        <ErrorState message={myPlan.error ?? "Couldn't load your plan"} onRetry={refresh} />
      </Screen>
    );
  }

  const { plan, coach, specialization } = myPlan.data;
  const nextSession = sessions.data?.sessions[0] ?? null;

  return (
    <Screen edges={["left", "right"]} header={header} onRefresh={refresh} refreshing={myPlan.refreshing}>
      {!coach ? (
        <WaitingCard
          icon="account-search"
          title="We're matching you with a coach"
          body={`A ${specialization ? SPECIALIZATION_LABEL[specialization].toLowerCase() : ""} coach will be assigned to you, usually within a day. We'll notify you.`}
        />
      ) : (
        <>
          <CoachCard coach={coach} />
          {nextSession && <NextSessionCard session={nextSession} />}
          {plan ? (
            <PlanView plan={plan} />
          ) : (
            <WaitingCard icon="clipboard-edit-outline" title={`${coach.fullName} is building your plan`} body="It's made just for you, so it can take a day or two. You'll get a notification when it's ready." />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  coach: { flexDirection: "row", alignItems: "center", gap: 14 },
  coachAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  upsellHero: { borderRadius: radius.lg, padding: 20, gap: 8, overflow: "hidden" },
  featureRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  weekBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pills: { gap: 8, paddingVertical: 2 },
  days: { flexDirection: "row", gap: 6 },
  day: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14, gap: 6, borderWidth: 2 },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  item: { flexDirection: "row", alignItems: "center", gap: 12 },
});
