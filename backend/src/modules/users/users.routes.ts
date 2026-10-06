import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { toPublicUser } from "../auth/auth.service.js";
import { localDayKey, startOfLocalWeek, streakDays } from "../../lib/dates.js";
import { sessionView } from "../coaching/coaching.views.js";
import { getEntitlements } from "../subscriptions/entitlements.js";
import { listCompletedWorkouts } from "../workouts/workouts.service.js";

const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(100),
    birthYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable(),
    fitnessLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).nullable(),
    goals: z.string().trim().max(1000).nullable(),
    preferredSpecialization: z.enum(["RUNNING", "SWIMMING", "GENERAL"]).nullable(),
  })
  .partial();

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/profile", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: currentUser(req).userId } });
  if (!user) throw notFound("User not found");
  res.json({ user: toPublicUser(user) });
});

usersRouter.put("/profile", async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: currentUser(req).userId }, data });
  res.json({ user: toPublicUser(user) });
});

usersRouter.get("/subscription-status", async (req, res) => {
  res.json({ entitlements: await getEntitlements(currentUser(req).userId) });
});

/** Home dashboard numbers. "Week" and "day" follow Jakarta time. */
usersRouter.get("/stats", async (req, res) => {
  const { userId } = currentUser(req);
  const weekStart = startOfLocalWeek();
  const since = new Date(Date.now() - 120 * 24 * 60 * 60_000);
  const [workoutsThisWeek, exercisesThisWeek, totalWorkouts, recentCompletions, recentLogs, nextSession] = await Promise.all([
    prisma.workoutCompletion.count({ where: { userId, completedAt: { gte: weekStart } } }),
    prisma.exerciseLog.count({ where: { userId, completedAt: { gte: weekStart } } }),
    prisma.workoutCompletion.count({ where: { userId } }),
    prisma.workoutCompletion.findMany({ where: { userId, completedAt: { gte: since } }, select: { completedAt: true } }),
    prisma.exerciseLog.findMany({ where: { userId, completedAt: { gte: since } }, select: { completedAt: true } }),
    prisma.coachingSession.findFirst({
      where: { clientId: userId, status: "SCHEDULED", startsAt: { gte: new Date(Date.now() - 60 * 60_000) } },
      orderBy: { startsAt: "asc" },
      include: { coach: { select: { id: true, fullName: true } } },
    }),
  ]);
  const activeDays = [...recentCompletions, ...recentLogs].map((x) => localDayKey(x.completedAt));
  res.json({
    stats: {
      workoutsThisWeek,
      exercisesThisWeek,
      totalWorkouts,
      streakDays: streakDays(activeDays),
      activeDaysThisWeek: new Set(activeDays.filter((d) => d >= localDayKey(weekStart))).size,
    },
    /** Monday..Sunday of the current Jakarta week: did the user train that day? */
    weekActivity: Array.from({ length: 7 }, (_, i) => activeDays.includes(localDayKey(new Date(weekStart.getTime() + i * 86_400_000 + 12 * 3_600_000)))),
    nextSession: nextSession ? sessionView(nextSession) : null,
  });
});

/**
 * How much each muscle was trained in the last `days` days, for the "week in muscles" heat map.
 * A primary muscle scores 1 per exercise done, a secondary muscle 0.5.
 */
usersRouter.get("/muscle-activity", async (req, res) => {
  const { userId } = currentUser(req);
  const days = z.coerce.number().int().min(1).max(90).default(7).parse(req.query.days);
  const since = new Date(Date.now() - days * 86_400_000);
  const [completions, logs] = await Promise.all([
    prisma.workoutCompletion.findMany({
      where: { userId, completedAt: { gte: since } },
      select: { workout: { select: { exercises: { select: { exercise: { select: { primaryMuscles: true, secondaryMuscles: true } } } } } } },
    }),
    prisma.exerciseLog.findMany({
      where: { userId, completedAt: { gte: since } },
      select: { planExercise: { select: { primaryMuscles: true, secondaryMuscles: true } } },
    }),
  ]);
  const counts: Record<string, number> = {};
  const add = (m: { primaryMuscles: string[]; secondaryMuscles: string[] }) => {
    for (const id of m.primaryMuscles) counts[id] = (counts[id] ?? 0) + 1;
    for (const id of m.secondaryMuscles) counts[id] = (counts[id] ?? 0) + 0.5;
  };
  for (const c of completions) for (const e of c.workout.exercises) add(e.exercise);
  for (const l of logs) add(l.planExercise);
  res.json({ days, counts, sessions: completions.length + logs.length });
});

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

usersRouter.get("/completed-workouts", async (req, res) => {
  const { page, pageSize } = pageQuery.parse(req.query);
  res.json(await listCompletedWorkouts(currentUser(req).userId, page, pageSize));
});

/** Stores the device's Expo push token; delivery is wired up once a Firebase/Expo push project exists. */
usersRouter.post("/push-token", async (req, res) => {
  const { token, platform } = z.object({ token: z.string().min(10).max(200), platform: z.enum(["IOS", "ANDROID"]) }).parse(req.body);
  const userId = currentUser(req).userId;
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, platform, userId },
    update: { userId, platform, lastSeenAt: new Date() },
  });
  res.status(204).end();
});
