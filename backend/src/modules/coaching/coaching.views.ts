// Shapes shared by the client app and the coach dashboard.
import type { CoachingSession, ExerciseLog, Prisma } from "../../generated/prisma/client.js";
import { planWeekNumber } from "../../lib/dates.js";

export const planInclude = {
  coach: { select: { id: true, fullName: true, coachProfile: true } },
  client: { select: { id: true, fullName: true } },
  exercises: {
    orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }, { position: "asc" }],
    include: { logs: { orderBy: { completedAt: "desc" } } },
  },
} satisfies Prisma.CoachingPlanInclude;

export type PlanWithDetails = Prisma.CoachingPlanGetPayload<{ include: typeof planInclude }>;

export function logView(log: ExerciseLog) {
  return {
    id: log.id,
    completedAt: log.completedAt,
    setsCompleted: log.setsCompleted,
    repsCompleted: log.repsCompleted,
    weightKg: log.weightKg === null ? null : Number(log.weightKg),
    durationSeconds: log.durationSeconds,
    distanceMeters: log.distanceMeters,
    notes: log.notes,
  };
}

export function planView(plan: PlanWithDetails) {
  const totalWeeks = Math.max(1, ...plan.exercises.map((e) => e.weekNumber));
  const currentWeek = Math.min(Math.max(planWeekNumber(plan.startDate), 1), totalWeeks);
  const completed = plan.exercises.filter((e) => e.logs.length > 0).length;
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    specialization: plan.specialization,
    status: plan.status,
    startDate: plan.startDate,
    endDate: plan.endDate,
    coach: { id: plan.coach.id, fullName: plan.coach.fullName, bio: plan.coach.coachProfile?.bio ?? null, specialization: plan.coach.coachProfile?.specialization ?? null },
    client: plan.client,
    totalWeeks,
    currentWeek,
    progress: { completed, total: plan.exercises.length },
    exercises: plan.exercises.map(({ logs, ...e }) => ({
      ...e,
      completed: logs.length > 0,
      lastLog: logs[0] ? logView(logs[0]) : null,
      logCount: logs.length,
    })),
  };
}

export function sessionView(
  s: CoachingSession & { coach?: { id: string; fullName: string }; client?: { id: string; fullName: string } },
) {
  const endsAt = new Date(s.startsAt.getTime() + s.durationMinutes * 60_000);
  const now = Date.now();
  return {
    id: s.id,
    planId: s.planId,
    type: s.type,
    startsAt: s.startsAt,
    endsAt,
    durationMinutes: s.durationMinutes,
    meetUrl: s.meetUrl,
    location: s.location,
    status: s.status,
    notes: s.notes,
    coach: s.coach,
    client: s.client,
    // Joinable from 10 minutes before the start until it ends.
    joinable: s.status === "SCHEDULED" && s.type === "ONLINE" && now >= s.startsAt.getTime() - 10 * 60_000 && now <= endsAt.getTime(),
  };
}
