import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function AppLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="subscribe" options={{ title: "Choose a plan", presentation: "modal" }} />
      <Stack.Screen name="workout/[id]" options={{ title: "Workout" }} />
      <Stack.Screen name="workout-history" options={{ title: "Workout history" }} />
      <Stack.Screen name="plan-exercise/[id]" options={{ title: "Exercise" }} />
      <Stack.Screen name="sessions" options={{ title: "Sessions" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="edit-profile" options={{ title: "Edit profile" }} />
      <Stack.Screen name="subscription" options={{ title: "Membership & payments" }} />
      <Stack.Screen name="onboarding" options={{ title: "Personalise", presentation: "modal" }} />
      <Stack.Screen name="player" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade_from_bottom", gestureEnabled: false }} />
    </Stack>
  );
}
