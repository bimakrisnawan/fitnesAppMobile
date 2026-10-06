import type { Role } from "../../generated/prisma/enums.js";
import { forbidden, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";

export interface Actor {
  userId: string;
  role: Role;
}

/** A coach may act on a client only if the client's coaching subscription is assigned to them. Admins may act on anyone. */
export async function assertCoachOf(actor: Actor, clientId: string) {
  if (actor.role === "ADMIN") return;
  const assigned = await prisma.subscription.findFirst({
    where: { userId: clientId, tier: "COACHING", coachId: actor.userId },
    select: { id: true },
  });
  if (!assigned) throw forbidden("This client isn't assigned to you", "NOT_YOUR_CLIENT");
}

export async function getPlanForCoach(actor: Actor, planId: string) {
  const plan = await prisma.coachingPlan.findUnique({ where: { id: planId }, select: { id: true, clientId: true, coachId: true, status: true } });
  if (!plan) throw notFound("Plan not found");
  await assertCoachOf(actor, plan.clientId);
  return plan;
}

export async function getSessionForCoach(actor: Actor, sessionId: string) {
  const session = await prisma.coachingSession.findUnique({ where: { id: sessionId } });
  if (!session) throw notFound("Session not found");
  await assertCoachOf(actor, session.clientId);
  return session;
}

/** Coaching clients this coach looks after (any subscription status, so past clients' history stays visible). */
export async function listClients(actor: Actor) {
  const subs = await prisma.subscription.findMany({
    where: { tier: "COACHING", ...(actor.role === "ADMIN" ? { coachId: { not: null } } : { coachId: actor.userId }) },
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { id: true, fullName: true, email: true, fitnessLevel: true, goals: true } } },
  });
  const clientIds = subs.map((s) => s.userId);
  const now = new Date();
  const [plans, sessions, lastLogs] = await Promise.all([
    prisma.coachingPlan.findMany({ where: { clientId: { in: clientIds }, status: "ACTIVE" }, select: { clientId: true, id: true, title: true } }),
    prisma.coachingSession.findMany({
      where: { clientId: { in: clientIds }, status: "SCHEDULED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      select: { clientId: true, id: true, startsAt: true, type: true },
    }),
    prisma.exerciseLog.groupBy({ by: ["userId"], where: { userId: { in: clientIds } }, _max: { completedAt: true } }),
  ]);
  return subs.map((s) => ({
    client: s.user,
    subscription: { id: s.id, status: s.status, specialization: s.specialization, currentPeriodEnd: s.currentPeriodEnd },
    activePlan: plans.find((p) => p.clientId === s.userId) ?? null,
    nextSession: sessions.find((x) => x.clientId === s.userId) ?? null,
    lastActivityAt: lastLogs.find((l) => l.userId === s.userId)?._max.completedAt ?? null,
  }));
}
