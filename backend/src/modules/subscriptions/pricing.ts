import { env } from "../../config/env.js";
import type { Tier } from "../../generated/prisma/enums.js";

export interface Plan {
  tier: Tier;
  name: string;
  priceIdr: number;
  description: string;
}

export const PLANS: Record<Tier, Plan> = {
  MONTHLY: {
    tier: "MONTHLY",
    name: "Monthly Membership",
    priceIdr: env.PRICE_MONTHLY_IDR,
    description: "Full workout library with video demonstrations.",
  },
  COACHING: {
    tier: "COACHING",
    name: "1-on-1 Coaching",
    priceIdr: env.PRICE_COACHING_IDR,
    description: "Personal plan from your coach, weekly 45-minute video session, plus the full library.",
  },
};

/** One paid period: same day next month, clamped to the month's last day (31 Jan → 28/29 Feb). */
export function addBillingPeriod(from: Date): Date {
  const result = new Date(from);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
