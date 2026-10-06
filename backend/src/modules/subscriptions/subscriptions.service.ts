import type { Subscription } from "../../generated/prisma/client.js";
import { conflict, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";

/** Paused time doesn't count against the paid period: resuming pushes the end date out by the pause length. */
export function periodEndAfterResume(sub: Pick<Subscription, "currentPeriodEnd" | "pausedAt">, now = new Date()) {
  if (!sub.currentPeriodEnd || !sub.pausedAt) return sub.currentPeriodEnd;
  return new Date(sub.currentPeriodEnd.getTime() + (now.getTime() - sub.pausedAt.getTime()));
}

export function listSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      tier: true,
      status: true,
      specialization: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelledAt: true,
      pausedAt: true,
      coach: { select: { id: true, fullName: true } },
    },
  });
}

async function getOwned(userId: string, id: string) {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub || sub.userId !== userId) throw notFound("Subscription not found");
  return sub;
}

const hasPaidTime = (sub: Subscription, now: Date) => !!sub.currentPeriodEnd && sub.currentPeriodEnd > now;

/** Stops future renewals. Access continues until the end of the paid period. */
export async function cancelSubscription(userId: string, id: string) {
  const sub = await getOwned(userId, id);
  if (sub.status !== "ACTIVE" && sub.status !== "PAUSED") throw conflict(`Can't cancel a ${sub.status.toLowerCase()} subscription`);
  const now = new Date();
  return prisma.subscription.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      // A paused subscription keeps its frozen days when cancelled.
      currentPeriodEnd: sub.status === "PAUSED" ? periodEndAfterResume(sub, now) : sub.currentPeriodEnd,
      pausedAt: null,
    },
  });
}

/** Freezes the remaining paid days (e.g. injury, travel). */
export async function pauseSubscription(userId: string, id: string) {
  const sub = await getOwned(userId, id);
  const now = new Date();
  if (sub.status !== "ACTIVE" || !hasPaidTime(sub, now)) throw conflict("Only an active subscription can be paused");
  const updated = await prisma.subscription.updateMany({
    where: { id, status: "ACTIVE" },
    data: { status: "PAUSED", pausedAt: now },
  });
  if (!updated.count) throw conflict("Subscription changed, please retry");
  return prisma.subscription.findUniqueOrThrow({ where: { id } });
}

export async function resumeSubscription(userId: string, id: string) {
  const sub = await getOwned(userId, id);
  if (sub.status !== "PAUSED") throw conflict("Subscription is not paused");
  const now = new Date();
  const updated = await prisma.subscription.updateMany({
    where: { id, status: "PAUSED" },
    data: { status: "ACTIVE", currentPeriodEnd: periodEndAfterResume(sub, now), pausedAt: null },
  });
  if (!updated.count) throw conflict("Subscription changed, please retry");
  return prisma.subscription.findUniqueOrThrow({ where: { id } });
}
