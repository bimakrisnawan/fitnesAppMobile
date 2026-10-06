import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { Screen } from "../../components/Screen";
import { type IconName, Pill } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useAuth } from "../../stores/auth";
import { radius } from "../../theme";

type Option = { value: string; title: string; body: string; icon: IconName };

const TRACKS: Option[] = [
  { value: "GENERAL", title: "Get fit & strong", body: "Strength, conditioning and mobility", icon: "dumbbell" },
  { value: "RUNNING", title: "Running", body: "From your first 5K to a marathon", icon: "run-fast" },
  { value: "SWIMMING", title: "Swimming", body: "Technique, endurance and dryland strength", icon: "swim" },
];

const LEVELS: Option[] = [
  { value: "BEGINNER", title: "Just starting", body: "New to training, or coming back after a break", icon: "sprout" },
  { value: "INTERMEDIATE", title: "Training regularly", body: "A few sessions a week for a while", icon: "trending-up" },
  { value: "ADVANCED", title: "Experienced", body: "Years of consistent, structured training", icon: "trophy-outline" },
];

const GOAL_IDEAS = ["Lose weight", "Build muscle", "Run a 10K", "Swim 1 km non-stop", "Train 3× a week", "Fix my posture"];

function Choice({ option, selected, onPress }: { option: Option; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, { backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface, borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant }]}
    >
      <MaterialCommunityIcons name={option.icon} size={28} color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant} />
      <View style={{ flex: 1 }}>
        <Text variant="titleMedium" style={{ fontWeight: "700" }}>
          {option.title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {option.body}
        </Text>
      </View>
      <MaterialCommunityIcons name={selected ? "radiobox-marked" : "radiobox-blank"} size={22} color={selected ? theme.colors.primary : theme.colors.outline} />
    </Pressable>
  );
}

/** Three quick questions after sign-up, so recommendations fit from day one. */
export default function OnboardingScreen() {
  const theme = useTheme();
  const refreshUser = useAuth((s) => s.refreshUser);
  const [step, setStep] = useState(0);
  const [track, setTrack] = useState("GENERAL");
  const [level, setLevel] = useState("BEGINNER");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await api.put("/users/profile", { preferredSpecialization: track, fitnessLevel: level, goals: goal.trim() || null });
      await refreshUser();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  const titles = ["What do you want to train for?", "How would you describe your fitness?", "What's your goal?"];

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          {step > 0 ? <Button onPress={() => setStep(step - 1)}>Back</Button> : <Button onPress={() => router.back()}>Skip</Button>}
          <Button mode="contained" style={{ flex: 1 }} contentStyle={{ height: 48 }} loading={saving} disabled={saving} onPress={() => (step < 2 ? setStep(step + 1) : finish())}>
            {step < 2 ? "Continue" : "Start training"}
          </Button>
        </View>
      }
    >
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? theme.colors.primary : theme.colors.surfaceVariant, flex: i === step ? 2 : 1 }]} />
        ))}
      </View>
      <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
        {titles[step]}
      </Text>
      {step === 0 && TRACKS.map((o) => <Choice key={o.value} option={o} selected={track === o.value} onPress={() => setTrack(o.value)} />)}
      {step === 1 && LEVELS.map((o) => <Choice key={o.value} option={o} selected={level === o.value} onPress={() => setLevel(o.value)} />)}
      {step === 2 && (
        <>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Your coach sees this too. Pick one or write your own.
          </Text>
          <View style={styles.wrap}>
            {GOAL_IDEAS.map((g) => (
              <Pill key={g} label={g} selected={goal === g} onPress={() => setGoal(g)} />
            ))}
          </View>
          <TextInput mode="outlined" label="My goal" value={goal} onChangeText={setGoal} placeholder="e.g. Run 10K under 60 minutes" />
          {error && <HelperText type="error">{error}</HelperText>}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: 6, marginTop: 4 },
  dot: { height: 6, borderRadius: 3 },
  choice: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.md, borderWidth: 2 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  footer: { flexDirection: "row", gap: 8, alignItems: "center" },
});
