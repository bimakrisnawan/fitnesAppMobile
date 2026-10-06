// Coach dashboard API. Every client-specific action goes through assertCoachOf().
import { type Request, Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { formatLocal, startOfLocalWeek } from "../../lib/dates.js";
import { badRequest, conflict, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { muscleList } from "../../lib/muscles.js";
import { youtubeInput as youtube } from "../../lib/youtube.js";
import { currentUser, requireAuth, requireRole } from "../../middleware/auth.js";
import { logView, planInclude, planView, sessionView } from "../coaching/coaching.views.js";
import { notify } from "../notifications/notifications.service.js";
import { type Actor, assertCoachOf, getPlanForCoach, getSessionForCoach, listClients } from "./coach.service.js";

const idParam = z.object({ id: z.uuid() });
const specialization = z.enum(["RUNNING", "SWIMMING", "GENERAL"]);
const dateOnly = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));

const alternatives = z
  .array(
    z.object({
      setting: z.enum(["home", "minimal", "outdoor", "gym"]),
      replace: z.string().trim().min(1).max(100),
      with: z.string().trim().min(1).max(200),
      note: z.string().trim().max(300).optional(),
    }),
  )
  .max(10);

const exerciseFields = {
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  youtube: youtube.optional(),
  equipment: z.array(z.string().trim().min(1).max(50)).max(10),
  alternatives,
  primaryMuscles: muscleList,
  secondaryMuscles: muscleList,
};

const exerciseCreateSchema = z.object({
  ...exerciseFields,
  equipment: exerciseFields.equipment.default([]),
  alternatives: alternatives.default([]),
  primaryMuscles: muscleList.default([]),
  secondaryMuscles: muscleList.default([]),
});

/** No defaults here: a field left out of an update must stay as it is. */
const exerciseUpdateSchema = z.object(exerciseFields).partial();

const planSchema = z.object({
  clientId: z.uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  specialization,
  startDate: dateOnly,
  endDate: dateOnly.nullable().optional(),
});

const planItemSchema = z.object({
  exerciseId: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  youtube: youtube.optional(),
  weekNumber: z.number().int().min(1).max(52),
  dayOfWeek: z.number().int().min(1).max(7),
  position: z.number().int().min(1).optional(),
  sets: z.number().int().min(1).max(50).nullable().optional(),
  reps: z.number().int().min(1).max(500).nullable().optional(),
  durationSeconds: z.number().int().min(1).max(24 * 3600).nullable().optional(),
  distanceMeters: z.number().int().min(1).max(200_000).nullable().optional(),
  targetPace: z.string().trim().max(30).nullable().optional(),
  equipment: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  alternatives: alternatives.optional(),
  primaryMuscles: muscleList.optional(),
  secondaryMuscles: muscleList.optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

const sessionSchema = z
  .object({
    clientId: z.uuid(),
    planId: z.uuid().nullable().optional(),
    type: z.enum(["ONLINE", "OFFLINE"]),
    startsAt: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
    durationMinutes: z.number().int().min(15).max(180).default(45),
    meetUrl: z.url().nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((s) => s.type === "OFFLINE" || !!s.meetUrl, { message: "Online sessions need a Google Meet link", path: ["meetUrl"] })
  .refine((s) => s.type === "ONLINE" || !!s.location, { message: "In-person sessions need a location", path: ["location"] });

const sessionUpdateSchema = z.object({
  type: z.enum(["ONLINE", "OFFLINE"]).optional(),
  startsAt: z.iso.datetime({ offset: true }).transform((v) => new Date(v)).optional(),
  durationMinutes: z.number().int().min(15).max(180).optional(),
  meetUrl: z.url().nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
});

const actor = (req: Request): Actor => currentUser(req);
const whenText = (d: Date) => formatLocal(d, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const sessionIncludes = {
  client: { select: { id: true, fullName: true } },
  coach: { select: { id: true, fullName: true } },
} satisfies Prisma.CoachingSessionInclude;

export const coachRouter = Router();
coachRouter.use(requireAuth, requireRole("COACH", "ADMIN"));

// ── Overview ──

coachRouter.get("/me", async (req, res) => {
  const me = await prisma.user.findUniqueOrThrow({
    where: { id: actor(req).userId },
    select: { id: true, fullName: true, email: true, role: true, coachProfile: true },
  });
  res.json({ coach: me });
});

coachRouter.get("/dashboard", async (req, res) => {
  const a = actor(req);
  const clients = await listClients(a);
  const clientIds = clients.map((c) => c.client.id);
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const [upcoming, unassignedCount, recentLogs, sessionsNext7Days, logsThisWeek] = await Promise.all([
    prisma.coachingSession.findMany({
      where: { clientId: { in: clientIds }, status: "SCHEDULED", startsAt: { gte: new Date(Date.now() - 60 * 60_000) } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: sessionIncludes,
    }),
    prisma.subscription.count({ where: { tier: "COACHING", status: "ACTIVE", coachId: null } }),
    prisma.exerciseLog.findMany({
      where: { userId: { in: clientIds } },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: { user: { select: { id: true, fullName: true } }, planExercise: { select: { name: true } } },
    }),
    prisma.coachingSession.count({
      where: { clientId: { in: clientIds }, status: "SCHEDULED", startsAt: { gte: new Date(), lte: weekAhead } },
    }),
    prisma.exerciseLog.count({ where: { userId: { in: clientIds }, completedAt: { gte: startOfLocalWeek() } } }),
  ]);
  res.json({
    stats: {
      activeClients: clients.filter((c) => c.subscription.status === "ACTIVE").length,
      unassignedCount,
      sessionsNext7Days,
      logsThisWeek,
    },
    upcomingSessions: upcoming.map(sessionView),
    recentActivity: recentLogs.map((l) => ({ ...logView(l), client: l.user, exerciseName: l.planExercise.name })),
  });
});

// ── Clients ──

coachRouter.get("/clients", async (req, res) => {
  res.json({ clients: await listClients(actor(req)) });
});

/** Paying coaching clients nobody has picked up yet. */
coachRouter.get("/clients/unassigned", async (_req, res) => {
  const subs = await prisma.subscription.findMany({
    where: { tier: "COACHING", status: "ACTIVE", coachId: null },
    orderBy: { currentPeriodStart: "asc" },
    include: { user: { select: { id: true, fullName: true, email: true, fitnessLevel: true, goals: true } } },
  });
  res.json({
    clients: subs.map((s) => ({ client: s.user, subscription: { id: s.id, specialization: s.specialization, since: s.currentPeriodStart } })),
  });
});

coachRouter.post("/clients/:id/claim", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const a = actor(req);
  const claimed = await prisma.subscription.updateMany({
    where: { userId: id, tier: "COACHING", coachId: null },
    data: { coachId: a.userId },
  });
  if (!claimed.count) throw conflict("This client already has a coach or has no coaching subscription");
  const coach = await prisma.user.findUniqueOrThrow({ where: { id: a.userId }, select: { fullName: true } });
  await notify(id, "NEW_PLAN", "You've been matched with a coach", `${coach.fullName} is your coach and is preparing your plan.`);
  res.status(204).end();
});

async function clientDetail(a: Actor, clientId: string) {
  await assertCoachOf(a, clientId);
  const [client, subscription, plans, logs, sessions, completions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, fullName: true, email: true, birthYear: true, fitnessLevel: true, goals: true, preferredSpecialization: true, createdAt: true },
    }),
    prisma.subscription.findUnique({ where: { userId_tier: { userId: clientId, tier: "COACHING" } } }),
    prisma.coachingPlan.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { exercises: true } } },
    }),
    prisma.exerciseLog.findMany({
      where: { userId: clientId },
      orderBy: { completedAt: "desc" },
      take: 50,
      include: { planExercise: { select: { name: true, weekNumber: true, dayOfWeek: true, sets: true, reps: true, distanceMeters: true } } },
    }),
    prisma.coachingSession.findMany({ where: { clientId }, orderBy: { startsAt: "desc" }, take: 30, include: sessionIncludes }),
    prisma.workoutCompletion.findMany({
      where: { userId: clientId },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: { workout: { select: { title: true, category: true } } },
    }),
  ]);
  if (!client) throw notFound("Client not found");
  return {
    client,
    subscription,
    plans,
    logs: logs.map((l) => ({ ...logView(l), exercise: l.planExercise })),
    sessions: sessions.map(sessionView),
    libraryWorkouts: completions,
  };
}

coachRouter.get("/clients/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await clientDetail(actor(req), id));
});

// Alias from the spec.
coachRouter.get("/clients/:id/history", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await clientDetail(actor(req), id));
});

// ── Exercise catalog (also where YouTube links are managed) ──

coachRouter.get("/exercises", async (req, res) => {
  const q = z.string().trim().max(100).optional().parse(req.query.q);
  const exercises = await prisma.exercise.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    orderBy: { name: "asc" },
  });
  res.json({ exercises });
});

coachRouter.post("/exercises", async (req, res) => {
  const { youtube: youtubeVideoId, ...data } = exerciseCreateSchema.parse(req.body);
  res.status(201).json({ exercise: await prisma.exercise.create({ data: { ...data, youtubeVideoId } }) });
});

coachRouter.put("/exercises/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { youtube: youtubeVideoId, ...data } = exerciseUpdateSchema.parse(req.body);
  const exercise = await prisma.exercise.update({
    where: { id },
    data: { ...data, ...(youtubeVideoId !== undefined && { youtubeVideoId }) },
  });
  res.json({ exercise });
});

// ── Plans ──

async function loadPlan(id: string) {
  return planView(await prisma.coachingPlan.findUniqueOrThrow({ where: { id }, include: planInclude }));
}

/** Every plan of the coach's clients (all clients for admins), newest first. */
coachRouter.get("/plans", async (req, res) => {
  const a = actor(req);
  const status = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional().parse(req.query.status);
  const plans = await prisma.coachingPlan.findMany({
    where: {
      status,
      ...(a.role === "ADMIN" ? {} : { client: { subscriptions: { some: { tier: "COACHING", coachId: a.userId } } } }),
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      client: { select: { id: true, fullName: true } },
      coach: { select: { id: true, fullName: true } },
      exercises: { select: { weekNumber: true, _count: { select: { logs: true } } } },
    },
  });
  res.json({
    plans: plans.map(({ exercises, ...p }) => ({
      ...p,
      totalWeeks: Math.max(1, ...exercises.map((e) => e.weekNumber)),
      progress: { completed: exercises.filter((e) => e._count.logs > 0).length, total: exercises.length },
    })),
  });
});

coachRouter.get("/plans/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  await getPlanForCoach(actor(req), id);
  res.json({ plan: await loadPlan(id) });
});

coachRouter.post("/plans", async (req, res) => {
  const a = actor(req);
  const data = planSchema.parse(req.body);
  await assertCoachOf(a, data.clientId);
  const plan = await prisma.coachingPlan.create({ data: { ...data, coachId: a.userId } });
  res.status(201).json({ plan: await loadPlan(plan.id) });
});

coachRouter.put("/plans/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  await getPlanForCoach(actor(req), id);
  const { clientId: _ignored, ...data } = planSchema.partial().parse(req.body);
  await prisma.coachingPlan.update({ where: { id }, data });
  res.json({ plan: await loadPlan(id) });
});

/** Only drafts can be deleted; active plans are archived so the client's logs survive. */
coachRouter.delete("/plans/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const plan = await getPlanForCoach(actor(req), id);
  if (plan.status === "DRAFT") await prisma.coachingPlan.delete({ where: { id } });
  else await prisma.coachingPlan.update({ where: { id }, data: { status: "ARCHIVED" } });
  res.status(204).end();
});

/** Makes this the client's active plan (archiving any other) and notifies them. */
coachRouter.post("/plans/:id/publish", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const plan = await getPlanForCoach(actor(req), id);
  const count = await prisma.planExercise.count({ where: { planId: id } });
  if (!count) throw badRequest("Add at least one exercise before publishing");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.coachingPlan.updateMany({ where: { clientId: plan.clientId, status: "ACTIVE", id: { not: id } }, data: { status: "ARCHIVED" } });
    const p = await tx.coachingPlan.update({ where: { id }, data: { status: "ACTIVE" }, include: { coach: { select: { fullName: true } } } });
    await notify(plan.clientId, "NEW_PLAN", "Your training plan is ready", `${p.coach.fullName} published "${p.title}". Open Coaching to see this week.`, { planId: id }, tx);
    return p;
  });
  res.json({ plan: await loadPlan(updated.id) });
});

coachRouter.post("/plans/:id/exercises", async (req, res) => {
  const { id } = idParam.parse(req.params);
  await getPlanForCoach(actor(req), id);
  const { exerciseId, youtube: youtubeVideoId, ...input } = planItemSchema.parse(req.body);

  // Picking from the catalog copies its name, video, equipment and alternatives; the coach can override any of them.
  const catalog = exerciseId ? await prisma.exercise.findUnique({ where: { id: exerciseId } }) : null;
  if (exerciseId && !catalog) throw notFound("Catalog exercise not found");
  const name = input.name ?? catalog?.name;
  if (!name) throw badRequest("Pick a catalog exercise or enter a name");

  const position =
    input.position ??
    ((await prisma.planExercise.aggregate({ where: { planId: id, weekNumber: input.weekNumber, dayOfWeek: input.dayOfWeek }, _max: { position: true } }))._max.position ?? 0) + 1;

  const item = await prisma.planExercise.create({
    data: {
      ...input,
      planId: id,
      exerciseId: catalog?.id ?? null,
      name,
      position,
      youtubeVideoId: youtubeVideoId !== undefined ? youtubeVideoId : (catalog?.youtubeVideoId ?? null),
      equipment: input.equipment ?? catalog?.equipment ?? [],
      primaryMuscles: input.primaryMuscles ?? catalog?.primaryMuscles ?? [],
      secondaryMuscles: input.secondaryMuscles ?? catalog?.secondaryMuscles ?? [],
      alternatives: input.alternatives ?? (catalog?.alternatives as Prisma.InputJsonValue | undefined) ?? [],
    },
  });
  res.status(201).json({ exercise: item });
});

coachRouter.put("/plans/:id/exercises/:exerciseId", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const exerciseId = z.uuid().parse(req.params.exerciseId);
  await getPlanForCoach(actor(req), id);
  const { exerciseId: _catalog, youtube: youtubeVideoId, ...data } = planItemSchema.partial().parse(req.body);
  const updated = await prisma.planExercise.updateMany({
    where: { id: exerciseId, planId: id },
    data: { ...data, ...(youtubeVideoId !== undefined && { youtubeVideoId }) },
  });
  if (!updated.count) throw notFound("Plan exercise not found");
  res.json({ exercise: await prisma.planExercise.findUnique({ where: { id: exerciseId } }) });
});

coachRouter.delete("/plans/:id/exercises/:exerciseId", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const exerciseId = z.uuid().parse(req.params.exerciseId);
  await getPlanForCoach(actor(req), id);
  await prisma.planExercise.deleteMany({ where: { id: exerciseId, planId: id } });
  res.status(204).end();
});

/** Copies every item of one week into another (handy for building multi-week blocks). */
coachRouter.post("/plans/:id/copy-week", async (req, res) => {
  const { id } = idParam.parse(req.params);
  await getPlanForCoach(actor(req), id);
  const { from, to } = z.object({ from: z.number().int().min(1).max(52), to: z.number().int().min(1).max(52) }).parse(req.body);
  if (from === to) throw badRequest("Pick a different target week");
  const items = await prisma.planExercise.findMany({ where: { planId: id, weekNumber: from } });
  await prisma.$transaction([
    prisma.planExercise.deleteMany({ where: { planId: id, weekNumber: to } }),
    prisma.planExercise.createMany({
      data: items.map(({ id: _id, createdAt: _c, updatedAt: _u, alternatives, ...item }) => ({
        ...item,
        weekNumber: to,
        alternatives: alternatives as Prisma.InputJsonValue,
      })),
    }),
  ]);
  res.json({ plan: await loadPlan(id) });
});

// ── Sessions ──

coachRouter.get("/sessions", async (req, res) => {
  const a = actor(req);
  const scope = z.enum(["upcoming", "past", "all"]).default("upcoming").parse(req.query.scope);
  const now = new Date();
  const sessions = await prisma.coachingSession.findMany({
    where: {
      ...(a.role === "ADMIN" ? {} : { coachId: a.userId }),
      ...(scope === "upcoming" && { status: "SCHEDULED", startsAt: { gte: new Date(now.getTime() - 60 * 60_000) } }),
      ...(scope === "past" && { OR: [{ startsAt: { lt: now } }, { status: { not: "SCHEDULED" } }] }),
    },
    orderBy: { startsAt: scope === "upcoming" ? "asc" : "desc" },
    take: 100,
    include: sessionIncludes,
  });
  res.json({ sessions: sessions.map(sessionView) });
});

coachRouter.post("/sessions/schedule", async (req, res) => {
  const a = actor(req);
  const data = sessionSchema.parse(req.body);
  await assertCoachOf(a, data.clientId);
  if (data.planId) {
    const plan = await getPlanForCoach(a, data.planId);
    if (plan.clientId !== data.clientId) throw badRequest("That plan belongs to another client");
  }
  const session = await prisma.coachingSession.create({ data: { ...data, coachId: a.userId }, include: sessionIncludes });
  await notify(
    data.clientId,
    "SESSION_SCHEDULED",
    data.type === "ONLINE" ? "Video session scheduled" : "In-person session scheduled",
    `${session.coach.fullName}: ${whenText(session.startsAt)}${data.type === "OFFLINE" ? ` at ${data.location}` : " on Google Meet"}.`,
    { sessionId: session.id },
  );
  res.status(201).json({ session: sessionView(session) });
});

coachRouter.put("/sessions/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const before = await getSessionForCoach(actor(req), id);
  const data = sessionUpdateSchema.parse(req.body);
  const session = await prisma.coachingSession.update({
    where: { id },
    // A new time means the reminder should go out again.
    data: { ...data, ...(data.startsAt && data.startsAt.getTime() !== before.startsAt.getTime() && { reminderSentAt: null }) },
    include: sessionIncludes,
  });
  if (data.status === "CANCELLED" && before.status !== "CANCELLED") {
    await notify(session.clientId, "SESSION_SCHEDULED", "Session cancelled", `Your session on ${whenText(session.startsAt)} was cancelled.`, { sessionId: id });
  } else if (data.startsAt && data.startsAt.getTime() !== before.startsAt.getTime()) {
    await notify(session.clientId, "SESSION_SCHEDULED", "Session rescheduled", `New time: ${whenText(session.startsAt)}.`, { sessionId: id });
  }
  res.json({ session: sessionView(session) });
});
