import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IconName } from "../../../components/ui";

const tabIcon =
  (outline: IconName, filled: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => <MaterialCommunityIcons name={focused ? filled : outline} color={color} size={24} />;

export default function AppTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        // Each tab renders its own large PageHeader.
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          height: 70 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home-variant-outline", "home-variant") }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts", tabBarIcon: tabIcon("dumbbell", "dumbbell") }} />
      <Tabs.Screen name="coaching" options={{ title: "My Coach", tabBarIcon: tabIcon("account-tie-outline", "account-tie") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("account-circle-outline", "account-circle") }} />
    </Tabs>
  );
}
