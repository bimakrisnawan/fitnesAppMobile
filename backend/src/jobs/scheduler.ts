// Minimal in-process scheduler for the prototype: runs every minute inside the API process.
// Fine for a single instance; move these to pg-boss before running more than one API instance,
// otherwise each instance would send its own reminders.
import { formatLocal } from "../lib/dates.js";
import { prisma } from "../lib/prisma.js";
import { notify } from "../modules/notifications/notifications.service.js";
import { PLANS } from "../modules/subscriptions/pricing.js";

const MINUTE = 60_000;
const SESSION_REMINDER_AHEAD = 24 * 60 * MINUTE;
const RENEWAL_REMINDER_AHEAD = 3 * 24 * 60 * MINUTE;
const STALE_PAYMENT_GRACE = 10 * MINUTE;

/** One reminder per session, sent within 24 hours of the start. */
export async function sendSessionReminders(now = new Date()) {
  const due = await prisma.coachingSession.findMany({
    where: { status: "SCHEDULED", reminderSentAt: null, startsAt: { gt: now, lte: new Date(now.getTime() + SESSION_REMINDER_AHEAD) } },
    include: { coach: { select: { fullName: true } } },
  });
  for (const s of due) {
    // Claim first so a slow notify() can't double-send if two runs overlap.
    const claimed = await prisma.coachingSession.updateMany({ where: { id: s.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (!claimed.count) continue;
    const when = formatLocal(s.startsAt, { weekday: "long", hour: "2-digit", minute: "2-digit" });
    await notify(
      s.clientId,
      "SESSION_REMINDER",
      s.type === "ONLINE" ? "Video session coming up" : "Session coming up",
      `With ${s.coach.fullName}, ${when}${s.type === "OFFLINE" && s.location ? ` at ${s.location}` : ""}.`,
      { sessionId: s.id },
    );
  }
  return due.length;
}

/** QRIS can't auto-renew, so remind members 3 days before their access ends. One reminder per period. */
export async function sendRenewalReminders(now = new Date()) {
  const ending = await prisma.subscription.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + RENEWAL_REMINDER_AHEAD) } },
  });
  let sent = 0;
  for (const sub of ending) {
    const periodEnd = sub.currentPeriodEnd!.toISOString();
    const already = await prisma.notification.findFirst({
      where: { userId: sub.userId, type: "RENEWAL_REMINDER", data: { path: ["periodEnd"], equals: periodEnd } },
      select: { id: true },
    });
    if (already) continue;
    await notify(
      sub.userId,
      "RENEWAL_REMINDER",
      "Your plan ends soon",
      `${PLANS[sub.tier].name} ends on ${formatLocal(sub.currentPeriodEnd!, { day: "numeric", month: "long" })}. Renew with QRIS to keep training.`,
      { subscriptionId: sub.id, periodEnd },
    );
    sent += 1;
  }
  return sent;
}

/**
 * Marks long-expired checkouts as EXPIRED so they stop showing as pending.
 * Status polling still re-checks EXPIRED payments with Mayar, so a late payment isn't lost.
 */
export async function expireStalePayments(now = new Date()) {
  const { count } = await prisma.payment.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date(now.getTime() - STALE_PAYMENT_GRACE) } },
    data: { status: "EXPIRED" },
  });
  return count;
}

export async function runJobsOnce(now = new Date()) {
  await sendSessionReminders(now);
  await sendRenewalReminders(now);
  await expireStalePayments(now);
}

export function startScheduler() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runJobsOnce();
    } catch (err) {
      console.error("Scheduled job failed", err);
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(tick, MINUTE);
  return () => clearInterval(timer);
}
