import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Small vibration cues. Browsers mostly ignore vibration, so the web build skips them entirely.
const enabled = Platform.OS !== "web";

export const haptic = {
  /** A tap: selecting a pill, ticking off a set. */
  tap: () => enabled && void Haptics.selectionAsync().catch(() => {}),
  /** A firmer bump: a new phase starts (rest over, next exercise). */
  bump: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  /** Something finished well: workout complete, log saved. */
  success: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** Heads-up: the last seconds of a countdown. */
  warn: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
};
