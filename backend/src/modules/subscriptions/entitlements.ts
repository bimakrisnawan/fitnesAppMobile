import type { NextFunction, Request, Response } from "express";
import type { Tier } from "../../generated/prisma/enums.js";
import { forbidden } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser } from "../../middleware/auth.js";

export interface Entitlements {
  /** Library access. Coaching members get the library too. */
  library: boolean;
  coaching: boolean;
  activeTiers: Tier[];
  /** Latest paid-through date across active subscriptions, for "renews/expires on" UI. */
  accessUntil: Date | null;
}

/**
 * Cancelled subscriptions keep access until the paid period ends;
 * paused and expired ones don't.
 */
export async function getEntitlements(userId: string, now = new Date()): Promise<Entitlements> {
  const subs = await prisma.subscription.findMany({
    where: { userId, status: { in: ["ACTIVE", "CANCELLED"] }, currentPeriodEnd: { gt: now } },
    select: { tier: true, currentPeriodEnd: true },
  });
  const activeTiers = [...new Set(subs.map((s) => s.tier))];
  const accessUntil = subs.reduce<Date | null>(
    (max, s) => (s.currentPeriodEnd && (!max || s.currentPeriodEnd > max) ? s.currentPeriodEnd : max),
    null,
  );
  const coaching = activeTiers.includes("COACHING");
  return { library: coaching || activeTiers.includes("MONTHLY"), coaching, activeTiers, accessUntil };
}

/** Gates a route on an entitlement. Coaches and admins always pass. */
export function requireEntitlement(kind: "library" | "coaching") {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const { userId, role } = currentUser(req);
    if (role !== "CLIENT") return next();
    const entitlements = await getEntitlements(userId);
    if (!entitlements[kind]) throw forbidden("An active subscription is required", "SUBSCRIPTION_REQUIRED");
    next();
  };
}
