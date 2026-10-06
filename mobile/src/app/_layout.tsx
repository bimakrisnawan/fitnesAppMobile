import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "../stores/auth";
import { useSettings } from "../stores/settings";
import { darkTheme, lightTheme } from "../theme";

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const preference = useSettings((s) => s.theme);
  const loadSettings = useSettings((s) => s.load);
  const scheme = preference === "system" ? systemScheme : preference;
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  const status = useAuth((s) => s.status);
  const restore = useAuth((s) => s.restore);

  useEffect(() => {
    void loadSettings();
    void restore();
  }, [loadSettings, restore]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        {status === "loading" ? (
          <ActivityIndicator style={{ flex: 1, backgroundColor: theme.colors.background }} size="large" />
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
            <Stack.Protected guard={status === "signedIn"}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={status === "signedOut"}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
