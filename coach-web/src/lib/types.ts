import type { LogLike, Prescribable } from "./format";

export interface ClientBasic {
  id: string;
  fullName: string;
  email: string;
  fitnessLevel: string | null;
  goals: string | null;
}

export interface ClientRow {
  client: ClientBasic;
  subscription: { id: string; status: string; specialization: string | null; currentPeriodEnd: string | null };
  activePlan: { id: string; title: string } | null;
  nextSession: { id: string; startsAt: string; type: string } | null;
  lastActivityAt: string | null;
}

export interface Session {
  id: string;
  planId: string | null;
  type: "ONLINE" | "OFFLINE";
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  meetUrl: string | null;
  location: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  client?: { id: string; fullName: string };
  coach?: { id: string; fullName: string };
}

export interface Log extends LogLike {
  id: string;
  completedAt: string;
  notes: string | null;
}

export interface Alternative {
  setting: "home" | "minimal" | "outdoor" | "gym";
  replace: string;
  with: string;
  note?: string;
}

export interface CatalogExercise {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  youtubeVideoId: string | null;
  equipment: string[];
  alternatives: Alternative[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

export interface PlanItem extends Prescribable {
  id: string;
  exerciseId: string | null;
  name: string;
  youtubeVideoId: string | null;
  weekNumber: number;
  dayOfWeek: number;
  position: number;
  equipment: string[];
  alternatives: Alternative[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  notes: string | null;
  completed: boolean;
  lastLog: Log | null;
  logCount: number;
}

export interface Plan {
  id: string;
  title: string;
  description: string | null;
  specialization: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  startDate: string;
  endDate: string | null;
  client: { id: string; fullName: string };
  totalWeeks: number;
  currentWeek: number;
  progress: { completed: number; total: number };
  exercises: PlanItem[];
}

export interface LibraryWorkout {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string;
  specialization: string | null;
  difficulty: string;
  durationMinutes: number;
  equipmentSetting: string;
  equipment: string[];
  youtubeVideoId: string | null;
  thumbnailUrl: string | null;
  thumbnailPreview: string | null;
  isPublished: boolean;
  exerciseCount: number;
  completions: number;
}

export interface LibraryWorkoutDetail extends Omit<LibraryWorkout, "exerciseCount"> {
  muscles: { primary: string[]; secondary: string[] };
  exercises: {
    id: string;
    position: number;
    sets: number | null;
    reps: number | null;
    durationSeconds: number | null;
    restSeconds: number | null;
    notes: string | null;
    exercise: { id: string; name: string; youtubeVideoId: string | null; primaryMuscles: string[]; secondaryMuscles: string[]; equipment: string[] };
  }[];
}
