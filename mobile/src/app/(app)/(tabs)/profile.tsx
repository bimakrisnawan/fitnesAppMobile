import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, SegmentedButtons, Text, useTheme } from "react-native-paper";
import { Screen } from "../../../components/Screen";
import { IconBubble, type IconName, PageHeader, Panel } from "../../../components/ui";
import { formatDate, useEntitlements } from "../../../lib/billing";
import { DIFFICULTY_LABEL, initials, SPECIALIZATION_LABEL } from "../../../lib/format";
import { useAuth } from "../../../stores/auth";
import { type ThemePreference, useSettings } from "../../../stores/settings";
import { HERO_GRADIENT, radius } from "../../../theme";

function Row({ icon, title, subtitle, onPress, last }: { icon: IconName; title: string; subtitle?: string; onPress: () => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant }, pressed && { opacity: 0.6 }]}>
      <IconBubble icon={icon} size={36} />
      <View style={{ flex: 1 }}>
        <Text variant="titleSmall">{title}</Text>
        {subtitle && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const entitlements = useEntitlements();
  const themePref = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  if (!user) return null;
  const plan = entitlements?.coaching ? "1-on-1 Coaching" : entitlements?.library ? "Monthly Membership" : "Free account";

  return (
    <Screen edges={["left", "right"]} header={<PageHeader title="Profile" />}>
      <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="titleLarge" style={styles.white}>
            {user.fullName}
          </Text>
          <Text variant="bodyMedium" style={styles.whiteMuted}>
            {user.email}
          </Text>
          <View style={styles.tags}>
            <Text style={styles.tag}>{plan}</Text>
            {user.fitnessLevel && <Text style={styles.tag}>{DIFFICULTY_LABEL[user.fitnessLevel]}</Text>}
            {user.preferredSpecialization && <Text style={styles.tag}>{SPECIALIZATION_LABEL[user.preferredSpecialization]}</Text>}
          </View>
        </View>
      </LinearGradient>

      {user.goals ? (
        <Panel style={styles.goal}>
          <IconBubble icon="flag-checkered" />
          <View style={{ flex: 1 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              MY GOAL
            </Text>
            <Text variant="bodyLarge">{user.goals}</Text>
          </View>
        </Panel>
      ) : (
        <Panel onPress={() => router.push("/onboarding")} style={styles.goal}>
          <IconBubble icon="flag-plus-outline" />
          <Text variant="bodyLarge" style={{ flex: 1 }}>
            Set your goal so we can recommend the right workouts
          </Text>
        </Panel>
      )}

      <Panel style={styles.group}>
        <Row icon="account-edit-outline" title="Edit profile" subtitle="Name, level, interest, goal" onPress={() => router.push("/edit-profile")} />
        <Row
          icon="card-account-details-star-outline"
          title="Membership & payments"
          subtitle={entitlements?.accessUntil ? `${plan} · until ${formatDate(entitlements.accessUntil)}` : "Choose a plan"}
          onPress={() => router.push(entitlements?.activeTiers.length ? "/subscription" : "/subscribe")}
        />
        <Row icon="bell-outline" title="Notifications" onPress={() => router.push("/notifications")} last />
      </Panel>

      <Panel style={styles.group}>
        <Row icon="history" title="Workout history" onPress={() => router.push("/workout-history")} last={!entitlements?.coaching} />
        {entitlements?.coaching && <Row icon="calendar-clock" title="Coaching sessions" onPress={() => router.push("/sessions")} last />}
      </Panel>

      <Panel>
        <Text variant="titleSmall">Appearance</Text>
        <SegmentedButtons
          value={themePref}
          onValueChange={(v) => setTheme(v as ThemePreference)}
          buttons={[
            { value: "system", label: "Auto", icon: "theme-light-dark" },
            { value: "light", label: "Light", icon: "white-balance-sunny" },
            { value: "dark", label: "Dark", icon: "weather-night" },
          ]}
        />
      </Panel>

      <Button mode="outlined" icon="logout" textColor={theme.colors.error} style={{ borderColor: theme.colors.outline }} onPress={logout}>
        Log out
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 22 },
  white: { color: "#fff", fontWeight: "700" },
  whiteMuted: { color: "rgba(255,255,255,0.85)" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: { color: "#fff", fontSize: 11, fontWeight: "700", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  goal: { flexDirection: "row", alignItems: "center", gap: 12 },
  group: { paddingVertical: 4, gap: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
});
