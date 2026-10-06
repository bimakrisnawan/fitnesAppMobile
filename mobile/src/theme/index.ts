import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

/** Working product name; change it here when the brand is decided. */
export const APP_NAME = "FitCoach";

const brand = {
  primary: "#FF5A36",
  primaryDark: "#E2421F",
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: "#FFE5DD",
    onPrimaryContainer: "#5A1607",
    secondary: "#2F6FED",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#E3ECFF",
    onSecondaryContainer: "#0F2C66",
    tertiary: "#16A34A",
    tertiaryContainer: "#DCFCE7",
    background: "#F4F5F9",
    surface: "#FFFFFF",
    surfaceVariant: "#EEF0F5",
    onSurface: "#111827",
    onSurfaceVariant: "#6B7280",
    outline: "#D9DCE3",
    outlineVariant: "#E8EAF0",
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: "transparent",
      level1: "#FFFFFF",
      level2: "#FFFFFF",
      level3: "#FFFFFF",
    },
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#FF7A5C",
    onPrimary: "#2B0A02",
    primaryContainer: "#4A1C10",
    onPrimaryContainer: "#FFDBD1",
    secondary: "#7AA2FF",
    onSecondary: "#0B1B3F",
    secondaryContainer: "#1B2A4A",
    onSecondaryContainer: "#DCE6FF",
    tertiary: "#4ADE80",
    tertiaryContainer: "#163322",
    background: "#0D0F14",
    surface: "#171A21",
    surfaceVariant: "#222631",
    onSurface: "#F3F4F6",
    onSurfaceVariant: "#9CA3AF",
    outline: "#353A47",
    outlineVariant: "#2A2E39",
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: "transparent",
      level1: "#171A21",
      level2: "#1C2029",
      level3: "#212531",
    },
  },
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

/** Gradient per workout category, used until real images are added. */
export const CATEGORY_GRADIENT = {
  STRENGTH: ["#FF7A45", "#E8341C"],
  CARDIO: ["#FF4D6D", "#C9184A"],
  FLEXIBILITY: ["#4CC9F0", "#3A6EE8"],
  SPORT_SPECIFIC: ["#34D399", "#0E9F6E"],
} as const;

export const HERO_GRADIENT = ["#FF7A45", "#E8341C"] as const;
export const COACH_GRADIENT = ["#3A6EE8", "#6D4AE8"] as const;
