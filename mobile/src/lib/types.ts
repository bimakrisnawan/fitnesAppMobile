// Shapes returned by the backend API (see DOCUMENTATION.md, section 8).
import type { Specialization, Tier } from "./billing";

export type Category = "STRENGTH" | "CARDIO" | "FLEXIBILITY" | "SPORT_SPECIFIC";
export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type EquipmentSetting = "GYM" | "HOME" | "NONE";

export interface Alternative {
  setting: "home" | "minimal" | "outdoor" | "gym";
  replace: string;
  with: string;
  note?: string;
}

export interface Muscles {
  primary: string[];
  secondary: string[];
}

export interface WorkoutSummary {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  specialization: Specialization | null;
  difficulty: Difficulty;
  durationMinutes: number;
  equipment: string[];
  equipmentSetting: EquipmentSetting;
  thumbnailUrl: string | null;
  hasVideo: boolean;
  exerciseCount: number;
  muscles: Muscles;
}

export interface WorkoutDetail extends Omit<WorkoutSummary, "exerciseCount"> {
  locked: boolean;
  youtubeVideoId: string | null;
  exercises: {
    id: string;
    position: number;
    sets: number | null;
    reps: number | null;
    durationSeconds: number | null;
    restSeconds: number | null;
    notes: string | null;
    exercise: {
      id: string;
      name: string;
      description: string | null;
      equipment: string[];
      alternatives: Alternative[];
      primaryMuscles: string[];
      secondaryMuscles: string[];
      youtubeVideoId: string | null;
      hasVideo: boolean;
    };
  }[];
  myCompletions: { count: number; lastCompletedAt: string | null };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompletedWorkout {
  id: string;
  completedAt: string;
  notes: string | null;
  workout: { id: string; title: string; category: Category; durationMinutes: number; difficulty: Difficulty };
}

export interface ExerciseLog {
  id: string;
  completedAt: string;
  setsCompleted: number | null;
  repsCompleted: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  notes: string | null;
}

export interface PlanExercise {
  id: string;
  exerciseId: string | null;
  name: string;
  youtubeVideoId: string | null;
  weekNumber: number;
  dayOfWeek: number;
  position: number;
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  targetPace: string | null;
  equipment: string[];
  alternatives: Alternative[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  notes: string | null;
  completed?: boolean;
  lastLog?: ExerciseLog | null;
  logCount?: number;
}

export interface Coach {
  id: string;
  fullName: string;
  bio: string | null;
  specialization: Specialization | null;
}

export interface Plan {
  id: string;
  title: string;
  description: string | null;
  specialization: Specialization;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  startDate: string;
  endDate: string | null;
  coach: Coach;
  totalWeeks: number;
  currentWeek: number;
  progress: { completed: number; total: number };
  exercises: PlanExercise[];
}

export interface MyPlanResponse {
  plan: Plan | null;
  coach: Coach | null;
  specialization: Specialization | null;
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
  coach?: { id: string; fullName: string };
  joinable: boolean;
}

export interface Stats {
  workoutsThisWeek: number;
  exercisesThisWeek: number;
  totalWorkouts: number;
  streakDays: number;
  activeDaysThisWeek: number;
}

export type NotificationType = "SESSION_REMINDER" | "SESSION_SCHEDULED" | "NEW_PLAN" | "PAYMENT_SUCCESS" | "RENEWAL_REMINDER";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface SubscriptionRow {
  id: string;
  tier: Tier;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
  specialization: Specialization | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  pausedAt: string | null;
  coach: { id: string; fullName: string } | null;
}
