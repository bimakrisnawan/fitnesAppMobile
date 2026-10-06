// Client side of 1-on-1 coaching: my plan, logging, my sessions.
import { Router } from "express";
import { z } from "zod";
import { badRequest, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { requireEntitlement } from "../subscriptions/entitlements.js";
import { logView, planInclude, planView, sessionView } from "./coaching.views.js";

const idParam = z.object({ id: z.uuid() });

export const logSchema = z.object({
  setsCompleted: z.number().int().min(0).max(100).optional(),
  repsCompleted: z.number().int().min(0).max(1000).optional(),
  weightKg: z.number().min(0).max(1000).optional(),
  durationSeconds: z.number().int().min(0).max(24 * 3600).optional(),
  distanceMeters: z.number().int().min(0).max(500_000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const sessionScope = z.enum(["upcoming", "past", "all"]).default("upcoming");

export const coachingRouter = Router();
coachingRouter.use(requireAuth, requireEntitlement("coaching"));

async function activePlan(clientId: string) {
  return prisma.coachingPlan.findFirst({
    where: { clientId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    include: planInclude,
  });
}

/** The active plan, plus the assigned coach even before a plan exists ("your coach is preparing it"). */
coachingRouter.get("/my-plan", async (req, res) => {
  const { userId } = currentUser(req);
  const [plan, subscription] = await Promise.all([
    activePlan(userId),
    prisma.subscription.findUnique({
      where: { userId_tier: { userId, tier: "COACHING" } },
      select: {
        specialization: true,
        coach: { select: { id: true, fullName: true, coachProfile: { select: { bio: true, specialization: true } } } },
      },
    }),
  ]);
  res.json({
    plan: plan ? planView(plan) : null,
    specialization: subscription?.specialization ?? null,
    coach: subscription?.coach
      ? { id: subscription.coach.id, fullName: subscription.coach.fullName, bio: subscription.coach.coachProfile?.bio ?? null, specialization: subscription.coach.coachProfile?.specialization ?? null }
      : null,
  });
});

coachingRouter.get("/my-plan/exercises", async (req, res) => {
  const plan = await activePlan(currentUser(req).userId);
  res.json({ exercises: plan ? planView(plan).exercises : [] });
});

async function ownedPlanExercise(userId: string, id: string) {
  const item = await prisma.planExercise.findFirst({
    where: { id, plan: { clientId: userId, status: { in: ["ACTIVE", "ARCHIVED"] } } },
    include: { logs: { where: { userId }, orderBy: { completedAt: "desc" } }, plan: { select: { id: true, title: true } } },
  });
  if (!item) throw notFound("Exercise not found");
  return item;
}

coachingRouter.get("/my-plan/exercises/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { logs, ...item } = await ownedPlanExercise(currentUser(req).userId, id);
  res.json({ exercise: { ...item, logs: logs.map(logView) } });
});

coachingRouter.post("/my-plan/exercises/:id/log", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { userId } = currentUser(req);
  await ownedPlanExercise(userId, id);
  const log = await prisma.exerciseLog.create({ data: { ...logSchema.parse(req.body ?? {}), userId, planExerciseId: id } });
  res.status(201).json({ log: logView(log) });
});

coachingRouter.get("/sessions", async (req, res) => {
  const scope = sessionScope.parse(req.query.scope);
  const now = new Date();
  const sessions = await prisma.coachingSession.findMany({
    where: {
      clientId: currentUser(req).userId,
      ...(scope === "upcoming" && { status: "SCHEDULED", startsAt: { gte: new Date(now.getTime() - 2 * 60 * 60_000) } }),
      ...(scope === "past" && { OR: [{ startsAt: { lt: now } }, { status: { not: "SCHEDULED" } }] }),
    },
    orderBy: { startsAt: scope === "upcoming" ? "asc" : "desc" },
    take: 50,
    include: { coach: { select: { id: true, fullName: true } } },
  });
  res.json({ sessions: sessions.map(sessionView) });
});

async function ownedSession(userId: string, id: string) {
  const session = await prisma.coachingSession.findFirst({
    where: { id, clientId: userId },
    include: { coach: { select: { id: true, fullName: true } } },
  });
  if (!session) throw notFound("Session not found");
  return session;
}

coachingRouter.get("/sessions/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json({ session: sessionView(await ownedSession(currentUser(req).userId, id)) });
});

coachingRouter.post("/sessions/:id/complete", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const session = await ownedSession(currentUser(req).userId, id);
  if (session.status !== "SCHEDULED") throw badRequest(`Session is already ${session.status.toLowerCase()}`);
  if (session.startsAt > new Date()) throw badRequest("This session hasn't started yet");
  const updated = await prisma.coachingSession.update({
    where: { id },
    data: { status: "COMPLETED" },
    include: { coach: { select: { id: true, fullName: true } } },
  });
  res.json({ session: sessionView(updated) });
});
