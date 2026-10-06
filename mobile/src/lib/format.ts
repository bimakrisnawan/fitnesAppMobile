import type { Specialization } from "./billing";
import type { Category, Difficulty, EquipmentSetting, PlanExercise } from "./types";

export const CATEGORY_LABEL: Record<Category, string> = {
  STRENGTH: "Strength",
  CARDIO: "Cardio",
  FLEXIBILITY: "Flexibility",
  SPORT_SPECIFIC: "Sport-specific",
};

export const CATEGORY_ICON: Record<Category, string> = {
  STRENGTH: "dumbbell",
  CARDIO: "heart-pulse",
  FLEXIBILITY: "yoga",
  SPORT_SPECIFIC: "run-fast",
};

/** Placeholder banner colours until real thumbnails are added. */
export const CATEGORY_COLOR: Record<Category, string> = {
  STRENGTH: "#E4572E",
  CARDIO: "#D7263D",
  FLEXIBILITY: "#2E86AB",
  SPORT_SPECIFIC: "#3BB273",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const EQUIPMENT_LABEL: Record<EquipmentSetting, string> = {
  GYM: "Gym",
  HOME: "Home",
  NONE: "No equipment",
};

export const SPECIALIZATION_LABEL: Record<Specialization, string> = {
  RUNNING: "Running",
  SWIMMING: "Swimming",
  GENERAL: "General fitness",
};

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** 1 = Monday … 7 = Sunday, for the device's local day. */
export function todayDayOfWeek(date = new Date()) {
  return ((date.getDay() + 6) % 7) + 1;
}

export function formatSeconds(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  if (m && s) return `${m}:${String(s).padStart(2, "0")} min`;
  if (m) return `${m} min`;
  return `${s}s`;
}

export function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${meters} m`;
}

/** "3 × 10", "6 × 400 m @ 5:00/km", "5 km @ 6:30/km", "3 × 30s"… */
export function prescription(p: Partial<Pick<PlanExercise, "sets" | "reps" | "durationSeconds" | "distanceMeters" | "targetPace">>) {
  let core: string;
  if (p.distanceMeters) core = `${p.sets && p.sets > 1 ? `${p.sets} × ` : ""}${formatDistance(p.distanceMeters)}`;
  else if (p.reps) core = `${p.sets ?? 1} × ${p.reps}`;
  else if (p.durationSeconds) core = `${p.sets && p.sets > 1 ? `${p.sets} × ` : ""}${formatSeconds(p.durationSeconds)}`;
  else core = p.sets ? `${p.sets} sets` : "";
  return p.targetPace ? `${core} @ ${p.targetPace}` : core;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function relativeDay(iso: string) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(new Date())) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return DAY_NAMES[todayDayOfWeek(d) - 1]!;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
