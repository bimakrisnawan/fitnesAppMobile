import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";

// Small per-device preferences. SecureStore on phones, localStorage on the web build.
const isWeb = Platform.OS === "web";
const KEYS = { theme: "themePreference", weeklyGoal: "weeklyGoalDays" };

async function read(key: string): Promise<string | null> {
  try {
    return isWeb ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string) {
  try {
    if (isWeb) localStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // A preference that fails to save just resets next launch.
  }
}

interface SettingsState {
  theme: ThemePreference;
  /** Active days per week the user aims for (the Home goal ring). */
  weeklyGoal: number;
  load: () => Promise<void>;
  setTheme: (theme: ThemePreference) => void;
  setWeeklyGoal: (days: number) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  theme: "system",
  weeklyGoal: 3,
  load: async () => {
    const [theme, goal] = await Promise.all([read(KEYS.theme), read(KEYS.weeklyGoal)]);
    if (theme === "light" || theme === "dark" || theme === "system") set({ theme });
    const g = Number(goal);
    if (Number.isInteger(g) && g >= 1 && g <= 7) set({ weeklyGoal: g });
  },
  setTheme: (theme) => {
    set({ theme });
    void write(KEYS.theme, theme);
  },
  setWeeklyGoal: (days) => {
    set({ weeklyGoal: days });
    void write(KEYS.weeklyGoal, String(days));
  },
}));
