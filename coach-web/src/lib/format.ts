export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const TRACK: Record<string, string> = { RUNNING: "Running", SWIMMING: "Swimming", GENERAL: "General fitness" };
export const LEVEL: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 0)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${m} m`;
}

export function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? (r ? `${m}:${String(r).padStart(2, "0")}` : `${m} min`) : `${r}s`;
}

export interface Prescribable {
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  targetPace: string | null;
}

export function prescription(p: Prescribable) {
  let core = "";
  if (p.distanceMeters) core = `${p.sets && p.sets > 1 ? `${p.sets} × ` : ""}${formatDistance(p.distanceMeters)}`;
  else if (p.reps) core = `${p.sets ?? 1} × ${p.reps}`;
  else if (p.durationSeconds) core = `${p.sets && p.sets > 1 ? `${p.sets} × ` : ""}${formatSeconds(p.durationSeconds)}`;
  else if (p.sets) core = `${p.sets} sets`;
  return p.targetPace ? `${core} @ ${p.targetPace}` : core;
}

export interface LogLike {
  setsCompleted: number | null;
  repsCompleted: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
}

export function describeLog(l: LogLike) {
  return [
    l.setsCompleted && l.repsCompleted ? `${l.setsCompleted} × ${l.repsCompleted}` : null,
    l.weightKg ? `${l.weightKg} kg` : null,
    l.distanceMeters ? formatDistance(l.distanceMeters) : null,
    l.durationSeconds ? formatSeconds(l.durationSeconds) : null,
  ]
    .filter(Boolean)
    .join(" · ") || "Done";
}

/** "2026-10-07T19:00" in the browser's local time, for <input type="datetime-local">. */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export const CATEGORY: Record<string, string> = { STRENGTH: "Strength", CARDIO: "Cardio", FLEXIBILITY: "Flexibility", SPORT_SPECIFIC: "Sport-specific" };
export const EQUIPMENT_SETTING: Record<string, string> = { HOME: "Home", NONE: "No equipment", GYM: "Gym" };
/** Same colours as the mobile app's workout banners. */
export const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  STRENGTH: ["#FF7A45", "#E8341C"],
  CARDIO: ["#FF4D6D", "#C9184A"],
  FLEXIBILITY: ["#4CC9F0", "#3A6EE8"],
  SPORT_SPECIFIC: ["#34D399", "#0E9F6E"],
};
