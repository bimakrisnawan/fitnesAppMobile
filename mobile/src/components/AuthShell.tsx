import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_NAME, HERO_GRADIENT, radius } from "../theme";

/** Branded layout for login, sign-up and password reset: gradient hero with a form card on top. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 36 }]}>
          <MaterialCommunityIcons name="run-fast" size={220} color="rgba(255,255,255,0.10)" style={styles.bgIcon} />
          <View style={styles.logo}>
            <MaterialCommunityIcons name="lightning-bolt" size={30} color="#E8341C" />
          </View>
          <Text variant="headlineMedium" style={styles.brand}>
            {APP_NAME}
          </Text>
          <Text variant="bodyLarge" style={styles.tagline}>
            Workouts for every day. A coach when you want one.
          </Text>
        </LinearGradient>
        <View style={styles.cardWrap}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
              {title}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
              {subtitle}
            </Text>
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 72, gap: 6, overflow: "hidden" },
  bgIcon: { position: "absolute", right: -40, bottom: -30 },
  logo: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  brand: { color: "#fff", fontWeight: "700", letterSpacing: -0.5 },
  tagline: { color: "rgba(255,255,255,0.9)" },
  cardWrap: { paddingHorizontal: 16, marginTop: -44, paddingBottom: 32, width: "100%", maxWidth: 520, alignSelf: "center" },
  card: { borderRadius: radius.lg, padding: 20, gap: 12 },
});
