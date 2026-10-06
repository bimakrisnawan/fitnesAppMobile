import { router } from "expo-router";
import { useState } from "react";
import { Button, HelperText, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { Screen } from "../../components/Screen";
import { api, errorMessage } from "../../lib/api";
import { type User, useAuth } from "../../stores/auth";

export default function EditProfileScreen() {
  const user = useAuth((s) => s.user)!;
  const refreshUser = useAuth((s) => s.refreshUser);
  const [fullName, setFullName] = useState(user.fullName);
  const [birthYear, setBirthYear] = useState(user.birthYear ? String(user.birthYear) : "");
  const [fitnessLevel, setFitnessLevel] = useState<string>(user.fitnessLevel ?? "");
  const [track, setTrack] = useState<string>(user.preferredSpecialization ?? "");
  const [goals, setGoals] = useState(user.goals ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api.put<{ user: User }>("/users/profile", {
        fullName: fullName.trim(),
        birthYear: birthYear.trim() ? Number(birthYear) : null,
        fitnessLevel: fitnessLevel || null,
        preferredSpecialization: track || null,
        goals: goals.trim() || null,
      });
      await refreshUser();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <TextInput label="Full name" mode="outlined" value={fullName} onChangeText={setFullName} />
      <TextInput label="Birth year" mode="outlined" keyboardType="number-pad" value={birthYear} onChangeText={setBirthYear} placeholder="1995" />
      <Text variant="titleSmall">Fitness level</Text>
      <SegmentedButtons
        value={fitnessLevel}
        onValueChange={setFitnessLevel}
        buttons={[
          { value: "BEGINNER", label: "Beginner" },
          { value: "INTERMEDIATE", label: "Intermediate" },
          { value: "ADVANCED", label: "Advanced" },
        ]}
      />
      <Text variant="titleSmall">Main interest</Text>
      <SegmentedButtons
        value={track}
        onValueChange={setTrack}
        buttons={[
          { value: "RUNNING", label: "Running", icon: "run" },
          { value: "SWIMMING", label: "Swimming", icon: "swim" },
          { value: "GENERAL", label: "General", icon: "dumbbell" },
        ]}
      />
      <TextInput label="Your goal" mode="outlined" multiline value={goals} onChangeText={setGoals} placeholder="e.g. Run a 10K under an hour" />
      <HelperText type={error ? "error" : "info"} visible>
        {error ?? "Used to recommend workouts and shared with your coach."}
      </HelperText>
      <Button mode="contained" onPress={save} loading={saving} disabled={saving || !fullName.trim()}>
        Save
      </Button>
    </Screen>
  );
}
